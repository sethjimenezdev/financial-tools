import { createHash, randomBytes } from 'crypto'
import { sql } from '@/lib/db'

export type TokenType = 'verify_email' | 'reset_password'

const TTL_MINUTES: Record<TokenType, number> = {
  verify_email: 24 * 60,
  reset_password: 60,
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/** Creates a token for the user, invalidating earlier unused ones of the same type. Returns the raw token. */
export async function createToken(userId: string, type: TokenType): Promise<string> {
  const token = randomBytes(32).toString('hex')
  await sql`UPDATE auth_tokens SET used_at = now() WHERE user_id = ${userId} AND type = ${type} AND used_at IS NULL`
  await sql`
    INSERT INTO auth_tokens (user_id, type, token_hash, expires_at)
    VALUES (${userId}, ${type}, ${hashToken(token)}, now() + make_interval(mins => ${TTL_MINUTES[type]}))
  `
  return token
}

/** Atomically marks a valid, unused token as used. Returns the user id, or null if invalid/expired/used. */
export async function consumeToken(token: string, type: TokenType): Promise<string | null> {
  if (!/^[0-9a-f]{64}$/.test(token)) return null
  const rows = await sql`
    UPDATE auth_tokens SET used_at = now()
    WHERE token_hash = ${hashToken(token)} AND type = ${type} AND used_at IS NULL AND expires_at > now()
    RETURNING user_id
  `
  return rows[0]?.user_id ?? null
}
