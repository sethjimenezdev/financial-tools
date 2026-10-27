// Safe to import from client components (no Node-only deps).

// Special characters per the OWASP password special characters list.
export const SPECIAL_CHARS_RE = /[ !"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/
export const MIN_PASSWORD_LENGTH = 8
// bcrypt only uses the first 72 bytes.
export const MAX_PASSWORD_BYTES = 72

export interface PasswordChecks {
  length: boolean
  number: boolean
  special: boolean
  maxLength: boolean
}

export function checkPassword(password: string): PasswordChecks {
  return {
    length: password.length >= MIN_PASSWORD_LENGTH,
    number: /\d/.test(password),
    special: SPECIAL_CHARS_RE.test(password),
    maxLength: new TextEncoder().encode(password).length <= MAX_PASSWORD_BYTES,
  }
}

export function isPasswordValid(password: string): boolean {
  const c = checkPassword(password)
  return c.length && c.number && c.special && c.maxLength
}

export const EMAIL_RE = /^\S+@\S+\.\S+$/
