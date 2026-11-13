import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt)

export async function hashPassword(password: string) {
  const salt = randomBytes(16)
  const hash = (await scryptAsync(password, salt, 32)) as Buffer
  return `scrypt:${salt.toString('hex')}:${hash.toString('hex')}`
}

export async function verifyPassword(password: string, stored: string) {
  const [kind, saltHex, hashHex] = stored.split(':')
  if (kind !== 'scrypt' || !saltHex || !hashHex) return false
  const expected = Buffer.from(hashHex, 'hex')
  const hash = (await scryptAsync(password, Buffer.from(saltHex, 'hex'), expected.length)) as Buffer
  if (hash.length !== expected.length) return false
  return timingSafeEqual(hash, expected)
}
