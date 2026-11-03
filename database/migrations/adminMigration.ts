import type { Connection, RowDataPacket } from 'mysql2/promise'

/** Adds only the RBAC structures absent from databases created before the admin panel. */
export async function ensureAdminSchema(connection: Connection): Promise<void> {
  const [columns] = await connection.query<RowDataPacket[]>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role'`,
  )
  if (!columns[0]) {
    await connection.query("ALTER TABLE users ADD COLUMN role ENUM('user', 'admin') NOT NULL DEFAULT 'user' AFTER password_hash")
    console.log('Added users.role with existing users kept as user.')
  }

  await connection.query(`CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    admin_user_id BIGINT UNSIGNED NOT NULL,
    action VARCHAR(120) NOT NULL,
    entity_type VARCHAR(80) NOT NULL,
    entity_id VARCHAR(128) NULL,
    details JSON NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_admin_audit_logs_admin_created (admin_user_id, created_at),
    CONSTRAINT fk_admin_audit_logs_admin FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE RESTRICT
  ) ENGINE=InnoDB`)
}

async function hasColumn(connection: Connection, table: string, column: string): Promise<boolean> {
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column],
  )
  return Boolean(rows[0])
}

async function isNullable(connection: Connection, table: string, column: string): Promise<boolean> {
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column],
  )
  return rows[0]?.IS_NULLABLE === 'YES'
}

async function hasUniqueIndex(connection: Connection, table: string, column: string): Promise<boolean> {
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? AND NON_UNIQUE = 0`,
    [table, column],
  )
  return Boolean(rows[0])
}

export async function ensureProfileSchema(connection: Connection): Promise<void> {
  for (const [column, definition] of [
    ['date_of_birth', 'DATE NULL'],
    ['gender', 'VARCHAR(32) NULL'],
    ['phone', 'VARCHAR(24) NULL'],
  ] as const) {
    if (!(await hasColumn(connection, 'users', column))) {
      await connection.query(`ALTER TABLE users ADD COLUMN ${column} ${definition}`)
      console.log(`Added users.${column}.`)
    }
  }

  for (const [column, definition] of [
    ['height', 'VARCHAR(32) NULL'],
    ['weight', 'VARCHAR(32) NULL'],
    ['existing_conditions', 'TEXT NULL'],
    ['medications', 'TEXT NULL'],
  ] as const) {
    if (!(await hasColumn(connection, 'health_profiles', column))) {
      await connection.query(`ALTER TABLE health_profiles ADD COLUMN ${column} ${definition}`)
      console.log(`Added health_profiles.${column}.`)
    }
  }

  if (await hasColumn(connection, 'health_profiles', 'height_cm')) {
    await connection.query("UPDATE health_profiles SET height = CAST(height_cm AS CHAR) WHERE (height IS NULL OR height = '') AND height_cm IS NOT NULL")
  }
  if (await hasColumn(connection, 'health_profiles', 'weight_kg')) {
    await connection.query("UPDATE health_profiles SET weight = CAST(weight_kg AS CHAR) WHERE (weight IS NULL OR weight = '') AND weight_kg IS NOT NULL")
  }
  if (await hasColumn(connection, 'health_profiles', 'medical_history')) {
    await connection.query("UPDATE health_profiles SET existing_conditions = medical_history WHERE (existing_conditions IS NULL OR existing_conditions = '') AND medical_history IS NOT NULL")
  }
  if (await hasColumn(connection, 'health_profiles', 'current_medications')) {
    await connection.query("UPDATE health_profiles SET medications = current_medications WHERE (medications IS NULL OR medications = '') AND current_medications IS NOT NULL")
  }
}

export async function ensureChatConversationSchema(connection: Connection): Promise<void> {
  if (!(await hasColumn(connection, 'chat_conversations', 'public_id'))) {
    await connection.query('ALTER TABLE chat_conversations ADD COLUMN public_id VARCHAR(64) NULL AFTER id')
  }
  const hasExternalId = await hasColumn(connection, 'chat_conversations', 'external_id')
  if (hasExternalId) {
    await connection.query("UPDATE chat_conversations SET public_id = LEFT(NULLIF(TRIM(external_id), ''), 64) WHERE public_id IS NULL OR public_id = ''")
  }
  await connection.query("UPDATE chat_conversations SET public_id = CONCAT('legacy-', id) WHERE public_id IS NULL OR public_id = ''")

  const [duplicates] = await connection.query<RowDataPacket[]>(
    'SELECT public_id FROM chat_conversations GROUP BY public_id HAVING COUNT(*) > 1',
  )
  for (const duplicate of duplicates) {
    await connection.query(
      "UPDATE chat_conversations SET public_id = CONCAT(LEFT(public_id, 42), '-', id) WHERE public_id = ?",
      [duplicate.public_id],
    )
  }

  if (await isNullable(connection, 'chat_conversations', 'public_id')) {
    await connection.query('ALTER TABLE chat_conversations MODIFY COLUMN public_id VARCHAR(64) NOT NULL')
  }
  if (!(await hasUniqueIndex(connection, 'chat_conversations', 'public_id'))) {
    await connection.query('ALTER TABLE chat_conversations ADD UNIQUE KEY uq_chat_conversations_public_id (public_id)')
  }
  console.log('Verified chat_conversations.public_id and preserved existing conversations.')
}

export async function ensureReportAnalysisSchema(connection: Connection): Promise<void> {
  if (!(await hasColumn(connection, 'report_analyses', 'analysis_text'))) {
    await connection.query('ALTER TABLE report_analyses ADD COLUMN analysis_text MEDIUMTEXT NULL AFTER report_id')
    console.log('Added report_analyses.analysis_text.')
  }
  await connection.query(
    "UPDATE report_analyses SET analysis_text = COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(analysis_json, '$.summary')), 'null'), '') WHERE analysis_text IS NULL",
  )
  if (await isNullable(connection, 'report_analyses', 'analysis_text')) {
    await connection.query('ALTER TABLE report_analyses MODIFY COLUMN analysis_text MEDIUMTEXT NOT NULL')
  }
}

/**
 * Upgrades the pre-RBAC appointment table without removing any existing
 * records. Older installs called the browser-facing identifier `external_id`;
 * the current API consistently calls it `public_id`.
 */
export async function ensureAppointmentSchema(connection: Connection): Promise<void> {
  const [publicIdColumns] = await connection.query<RowDataPacket[]>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appointments' AND COLUMN_NAME = 'public_id'`,
  )
  if (publicIdColumns[0]) return

  const [externalIdColumns] = await connection.query<RowDataPacket[]>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appointments' AND COLUMN_NAME = 'external_id'`,
  )

  await connection.query('ALTER TABLE appointments ADD COLUMN public_id VARCHAR(64) NULL AFTER id')
  if (externalIdColumns[0]) {
    await connection.query("UPDATE appointments SET public_id = LEFT(NULLIF(TRIM(external_id), ''), 64) WHERE public_id IS NULL")
  }
  await connection.query("UPDATE appointments SET public_id = CONCAT('legacy-', id) WHERE public_id IS NULL OR public_id = ''")

  // A unique API identifier is required by appointment updates and deletes.
  // Replace only duplicate legacy values; all non-duplicate identifiers remain
  // unchanged for existing clients.
  const [duplicates] = await connection.query<RowDataPacket[]>(
    'SELECT public_id FROM appointments GROUP BY public_id HAVING COUNT(*) > 1',
  )
  for (const duplicate of duplicates) {
    await connection.query('UPDATE appointments SET public_id = CONCAT(LEFT(public_id, 48), \'-\', id) WHERE public_id = ?', [duplicate.public_id])
  }

  await connection.query('ALTER TABLE appointments MODIFY COLUMN public_id VARCHAR(64) NOT NULL')
  await connection.query('ALTER TABLE appointments ADD UNIQUE KEY uq_appointments_public_id (public_id)')
  console.log('Added appointments.public_id while preserving existing appointment records.')
}
