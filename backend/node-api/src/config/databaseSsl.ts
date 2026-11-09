
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { PoolOptions } from 'mysql2/promise'

export function getDatabaseSslOptions(): PoolOptions['ssl'] {
  const caFromEnvironment = process.env.DB_SSL_CA?.replace(/\\n/g, '\n')

  const caPath = process.env.DB_SSL_CA_PATH?.trim()

  let ca: string | undefined = caFromEnvironment

  if (!ca && caPath) {
    ca = readFileSync(resolve(process.cwd(), caPath), 'utf8')
  }

  const isAiven = process.env.DB_HOST?.includes('aivencloud.com')

  if (isAiven && !ca) {
    throw new Error(
      'Aiven MySQL requires SSL. Configure DB_SSL_CA or DB_SSL_CA_PATH.'
    )
  }

  return ca
    ? {
        ca,
        rejectUnauthorized: true,
      }
    : undefined
}
