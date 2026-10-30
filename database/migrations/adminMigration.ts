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
