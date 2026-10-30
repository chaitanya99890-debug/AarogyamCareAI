import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto'
import { promisify } from 'node:util'
import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import { getDatabasePool } from '../../../../database/connection/mysql.ts'

const scrypt = promisify(scryptCallback)
const SESSION_DAYS = 30
export type UserRole = 'user' | 'admin'

export interface AuthenticatedUser {
  id: bigint
  publicId: string
  name: string
  email: string
  role: UserRole
}

export class AuthenticationError extends Error {}

function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

async function passwordHash(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const derived = (await scrypt(password, salt, 64)) as Buffer
  return `scrypt$${salt}$${derived.toString('hex')}`
}

async function passwordMatches(password: string, encoded: string): Promise<boolean> {
  const [algorithm, salt, expected] = encoded.split('$')
  if (algorithm !== 'scrypt' || !salt || !expected) return false
  const derived = (await scrypt(password, salt, 64)) as Buffer
  const expectedBuffer = Buffer.from(expected, 'hex')
  return expectedBuffer.length === derived.length && timingSafeEqual(expectedBuffer, derived)
}

function safeUser(row: RowDataPacket): AuthenticatedUser {
  return {
    id: BigInt(row.id), publicId: String(row.id), name: String(row.name), email: String(row.email),
    role: row.role === 'admin' ? 'admin' : 'user',
  }
}

async function createSession(userId: bigint): Promise<string> {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)
  await getDatabasePool().execute(
    'INSERT INTO auth_sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
    [userId.toString(), tokenHash(token), expiresAt],
  )
  return token
}

export async function registerUser(input: { name: string; email: string; password: string; dateOfBirth?: string; gender?: string; phone?: string }) {
  const name = input.name.trim()
  const email = input.email.trim().toLowerCase()
  if (!name || !/^\S+@\S+\.\S+$/.test(email) || input.password.length < 8) {
    throw new AuthenticationError('Please provide a name, valid email address, and password of at least 8 characters.')
  }
  const [result] = await getDatabasePool().execute<ResultSetHeader>(
    'INSERT INTO users (name, email, password_hash, date_of_birth, gender, phone) VALUES (?, ?, ?, ?, ?, ?)',
    [name, email, await passwordHash(input.password), input.dateOfBirth || null, input.gender || null, input.phone || null],
  )
  const user: AuthenticatedUser = { id: BigInt(result.insertId), publicId: String(result.insertId), name, email, role: 'user' }
  return { user, token: await createSession(user.id) }
}

export async function loginUser(emailInput: string, password: string, requiredRole?: UserRole) {
  const email = emailInput.trim().toLowerCase()
  const [rows] = await getDatabasePool().execute<RowDataPacket[]>(
    'SELECT id, name, email, password_hash, role FROM users WHERE email = ? LIMIT 1', [email],
  )
  const row = rows[0]
  if (!row || !(await passwordMatches(password, String(row.password_hash))) || (requiredRole && row.role !== requiredRole)) {
    throw new AuthenticationError('Incorrect email or password.')
  }
  const user = safeUser(row)
  return { user, token: await createSession(user.id) }
}

export async function authenticatedUserFromRequest(req: any): Promise<AuthenticatedUser> {
  const header = typeof req.headers.authorization === 'string' ? req.headers.authorization : ''
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : ''
  if (!token) throw new AuthenticationError('Please sign in to access this data.')
  const [rows] = await getDatabasePool().execute<RowDataPacket[]>(
    `SELECT u.id, u.name, u.email, u.role
       FROM auth_sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.expires_at > UTC_TIMESTAMP()
      LIMIT 1`,
    [tokenHash(token)],
  )
  if (!rows[0]) throw new AuthenticationError('Your session has expired. Please sign in again.')
  return safeUser(rows[0])
}

export async function requireAuthenticatedUser(req: any, res: any): Promise<AuthenticatedUser | undefined> {
  try {
    return await authenticatedUserFromRequest(req)
  } catch (error) {
    if (error instanceof AuthenticationError) {
      res.status(401).json({ message: error.message })
      return undefined
    }
    console.error('Authentication database lookup failed:', error instanceof Error ? error.message : 'Unknown error')
    res.status(503).json({ message: 'Account service is temporarily unavailable.' })
    return undefined
  }
}

/** Requires an authenticated account whose role was read from MySQL for this request. */
export async function requireAdmin(req: any, res: any): Promise<AuthenticatedUser | undefined> {
  const user = await requireAuthenticatedUser(req, res)
  if (!user) return undefined
  if (user.role !== 'admin') {
    res.status(403).json({ message: 'Administrator access is required.' })
    return undefined
  }
  return user
}
