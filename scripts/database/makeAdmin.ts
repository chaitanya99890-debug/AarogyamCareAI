import 'dotenv/config'
import type { ResultSetHeader } from 'mysql2'
import { getDatabasePool } from '../../database/connection/mysql.ts'

async function main() {
  const email = process.argv[2]?.trim().toLowerCase()
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new Error('Usage: npm run make-admin -- user@example.com')
  const [result] = await getDatabasePool().execute<ResultSetHeader>('UPDATE users SET role = ? WHERE email = ?', ['admin', email])
  if (!result.affectedRows) throw new Error('No existing user was found for that email address.')
  console.log(`Promoted ${email} to admin.`)
}

void main().catch((error: unknown) => {
  console.error('Could not promote administrator:', error instanceof Error ? error.message : 'Unknown error')
  process.exitCode = 1
})
