import bcrypt from 'bcryptjs'
import { hashPassword, verifyPassword } from 'better-auth/crypto'

export const supportedBcrypt = (hash: string) => /^\$2[aby]\$(0[4-9]|[12]\d|3[01])\$[./A-Za-z0-9]{53}$/.test(hash)

/** Only imported credentials use bcrypt. New credentials use the maintained library's scrypt. */
export async function verifyAccountPassword(input: { hash: string; password: string }) {
  try {
    if (supportedBcrypt(input.hash)) return await bcrypt.compare(input.password, input.hash)
    return await verifyPassword(input)
  } catch { return false }
}
export const hashAccountPassword = hashPassword
