import 'dotenv/config'
import type { RowDataPacket } from 'mysql2'
import { getDatabasePool } from '../../database/connection/mysql.ts'

async function main() {
  const email = process.argv[2]?.trim().toLowerCase()
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new Error('Usage: npm run make-admin -- user@example.com')
  const pool = getDatabasePool()
  try {
    const [users] = await pool.execute<RowDataPacket[]>('SELECT role FROM users WHERE email = ? LIMIT 1', [email])
    const user = users[0]
    if (!user) throw new Error('No existing user was found for that email address. Create the account first, then retry.')
    if (user.role !== 'admin') {
      await pool.execute('UPDATE users SET role = ? WHERE email = ?', ['admin', email])
      console.log(`Promoted ${email} to admin.`)
      return
    }
    console.log(`${email} is already an admin.`)
  } finally {
    await pool.end()
  }
}

void main().catch((error: unknown) => {
  console.error('Could not promote administrator:', error instanceof Error ? error.message : 'Unknown error')
  process.exitCode = 1
})
