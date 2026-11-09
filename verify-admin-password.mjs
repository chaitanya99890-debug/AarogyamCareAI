
import { scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import readline from 'node:readline/promises'

const scrypt = promisify(scryptCallback)
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

try {
  const password = await rl.question('Enter the password you saved earlier: ')
  const encoded = await rl.question('Paste the password hash from MySQL (input will be visible): ')

  const [algorithm, salt, expected] = encoded.split('$')

  if (algorithm !== 'scrypt' || !salt || !expected) {
    throw new Error('Invalid hash format.')
  }

  const derived = await scrypt(password, salt, 64)
  const expectedBuffer = Buffer.from(expected, 'hex')

  const matches =
    expectedBuffer.length === derived.length &&
    timingSafeEqual(expectedBuffer, derived)

  console.log(matches ? 'PASSWORD MATCHES' : 'PASSWORD DOES NOT MATCH')
} catch (error) {
  console.error(error.message)
} finally {
  rl.close()
}
