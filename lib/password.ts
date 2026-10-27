import bcrypt from 'bcryptjs'

const COST = 12

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, COST)
}

// Used to keep login timing similar whether or not the account exists.
let dummyHash: Promise<string> | null = null

export async function verifyPassword(password: string, hash: string | null | undefined): Promise<boolean> {
  if (!hash) {
    dummyHash ??= bcrypt.hash('dummy-password-for-timing', COST)
    await bcrypt.compare(password, await dummyHash)
    return false
  }
  return bcrypt.compare(password, hash)
}
