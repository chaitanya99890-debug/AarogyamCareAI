
import 'dotenv/config'
import mysql from 'mysql2/promise'
import { getDatabaseSslOptions } from '../../backend/node-api/src/config/databaseSsl.ts'

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST!,
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    database: process.env.DB_NAME!,
    ssl: getDatabaseSslOptions(),
  })

  try {
    const [info] = await connection.query(
      'SELECT DATABASE() AS databaseName, @@hostname AS serverHost'
    )

    const [tables] = await connection.query('SHOW TABLES')

    console.log('Database connection successful!')
    console.log('Server information:', info)
    console.log('Tables found:')

    console.table(tables)
    console.log(`Total tables: ${(tables as unknown[]).length}`)
  } finally {
    await connection.end()
  }
}

main().catch(error => {
  console.error('Database verification failed:', error.message)
  process.exitCode = 1
})
