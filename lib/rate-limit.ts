import { createHash } from 'crypto'
import { sql } from '@/lib/db'

export function getClientIp(headers: Headers): string {
  const forwardedFor = headers.get('x-forwarded-for')
  if (forwardedFor) return forwardedFor.split(',')[0].trim()
  return 'unknown'
}

export function hashKey(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 32)
}

/**
 * Sliding-window limiter backed by the rate_limits table.
 * Returns true if the hit is allowed (and records it), false if the limit is reached.
 */
export async function allowHit(key: string, max: number, windowSeconds: number): Promise<boolean> {
  const rows = await sql`
    SELECT count(*)::int AS count FROM rate_limits
    WHERE key = ${key} AND created_at > now() - make_interval(secs => ${windowSeconds})
  `
  if (rows[0]?.count >= max) return false
  await sql`INSERT INTO rate_limits (key) VALUES (${key})`
  if (Math.random() < 0.02) {
    await sql`DELETE FROM rate_limits WHERE created_at < now() - interval '1 day'`
  }
  return true
}
