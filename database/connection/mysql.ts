import mysql, { type Pool, type PoolOptions } from 'mysql2/promise'

let pool: Pool | undefined

function requiredEnvironment(name: 'DB_HOST' | 'DB_USER' | 'DB_PASSWORD' | 'DB_NAME'): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Database configuration is incomplete: ${name} is missing.`)
  return value
}

export function getDatabasePool(): Pool {
  if (pool) return pool

  const options: PoolOptions = {
    host: requiredEnvironment('DB_HOST'),
    port: Number(process.env.DB_PORT ?? 3306),
    user: requiredEnvironment('DB_USER'),
    password: requiredEnvironment('DB_PASSWORD'),
    database: requiredEnvironment('DB_NAME'),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    charset: 'utf8mb4',
    dateStrings: true,
  }
  pool = mysql.createPool(options)
  return pool
}

export async function verifyDatabaseConnection(): Promise<void> {
  const connection = await getDatabasePool().getConnection()
  try {
    await connection.ping()
  } finally {
    connection.release()
  }
}
