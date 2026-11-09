
import {
  randomBytes,
  scrypt as scryptCallback,
} from 'node:crypto'
import { promisify } from 'node:util'
import readline from 'node:readline/promises'

const scrypt = promisify(scryptCallback)
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

try {
  const password = await rl.question('Enter your new admin password: ')

  if (password.length < 8) {
    throw new Error('Password must contain at least 8 characters.')
  }

  const salt = randomBytes(16).toString('hex')
  const derived = await scrypt(password, salt, 64)

  console.log('\nGenerated password hash:')
  console.log(`scrypt$${salt}$${derived.toString('hex')}`)
} catch (error) {
  console.error(error.message)
} finally {
  rl.close()
}
