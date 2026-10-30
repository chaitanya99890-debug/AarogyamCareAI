import 'dotenv/config'
import mysql from 'mysql2/promise'
import { ensureAdminSchema } from '../../database/migrations/adminMigration.ts'

async function main() {
  const host = process.env.DB_HOST?.trim()
  const user = process.env.DB_USER?.trim()
  const password = process.env.DB_PASSWORD?.trim()
  const database = process.env.DB_NAME?.trim()
  if (!host || !user || !password || !database) throw new Error('DB_HOST, DB_USER, DB_PASSWORD, and DB_NAME must be configured in .env.')
  const connection = await mysql.createConnection({ host, port: Number(process.env.DB_PORT ?? 3306), user, password, database, charset: 'utf8mb4' })
  try {
    await ensureAdminSchema(connection)
    console.log('Admin database migration completed safely.')
  } finally {
    await connection.end()
  }
}

void main().catch((error: unknown) => {
  console.error('Admin database migration failed:', error instanceof Error ? error.message : 'Unknown error')
  process.exitCode = 1
})
