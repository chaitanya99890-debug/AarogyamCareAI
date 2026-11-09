import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import mysql from 'mysql2/promise'
import { ensureAdminSchema, ensureAppointmentSchema, ensureChatConversationSchema, ensureProfileSchema, ensureReportAnalysisSchema } from '../../database/migrations/adminMigration.ts'
import { getDatabaseSslOptions } from '../../backend/node-api/src/config/databaseSsl.ts'

const schemaPath = fileURLToPath(new URL('../../database/schema/schema.sql', import.meta.url))

async function main() {
  const host = process.env.DB_HOST?.trim()
  const user = process.env.DB_USER?.trim()
  const password = process.env.DB_PASSWORD?.trim()
  if (!host || !user || !password) throw new Error('DB_HOST, DB_USER, and DB_PASSWORD must be configured in .env.')

const database = process.env.DB_NAME?.trim()

if (!database) {
  throw new Error('DB_NAME must be configured in .env.')
}

const connection = await mysql.createConnection({
  host,
  port: Number(process.env.DB_PORT ?? 3306),
  user,
  password,
  database,
  ssl: getDatabaseSslOptions(),
  multipleStatements: true,
  charset: 'utf8mb4',
})

  try {
    await connection.query(await readFile(schemaPath, 'utf8'))
    
    await ensureAdminSchema(connection)
    await ensureProfileSchema(connection)
    await ensureChatConversationSchema(connection)
    await ensureReportAnalysisSchema(connection)
    await ensureAppointmentSchema(connection)
    console.log('MySQL schema is ready.')
  } finally {
    await connection.end()
  }
}

void main().catch((error: unknown) => {
  console.error('Could not initialize MySQL schema:', error instanceof Error ? error.message : 'Unknown error')
  process.exitCode = 1
})
