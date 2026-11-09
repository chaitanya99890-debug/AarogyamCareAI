import 'dotenv/config'
import mysql from 'mysql2/promise'
import { ensureAdminSchema, ensureAppointmentSchema, ensureChatConversationSchema, ensureProfileSchema, ensureReportAnalysisSchema } from '../../database/migrations/adminMigration.ts'
import { getDatabaseSslOptions } from '../../backend/node-api/src/config/databaseSsl.ts'

async function main() {
  const host = process.env.DB_HOST?.trim()
  const user = process.env.DB_USER?.trim()
  const password = process.env.DB_PASSWORD?.trim()
  const database = process.env.DB_NAME?.trim()
  if (!host || !user || !password || !database) throw new Error('DB_HOST, DB_USER, DB_PASSWORD, and DB_NAME must be configured in .env.')
  const connection = await mysql.createConnection({
  host,
  port: Number(process.env.DB_PORT ?? 3306),
  user,
  password,
  database,
  ssl: getDatabaseSslOptions(),
  charset: 'utf8mb4',
})
  try {
    await ensureAdminSchema(connection)
    await ensureProfileSchema(connection)
    await ensureChatConversationSchema(connection)
    await ensureReportAnalysisSchema(connection)
    await ensureAppointmentSchema(connection)
    console.log('Database migrations completed safely.')
  } finally {
    await connection.end()
  }
}

void main().catch((error: unknown) => {
  console.error('Admin database migration failed:', error instanceof Error ? error.message : 'Unknown error')
  process.exitCode = 1
})
