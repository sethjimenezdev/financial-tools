import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { hashPassword } from '@/lib/password'
import { isPasswordValid } from '@/lib/password-policy'
import { allowHit, getClientIp, hashKey } from '@/lib/rate-limit'
import { consumeToken } from '@/lib/tokens'

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }
  const { token, password } = body as Record<string, unknown>
  if (typeof token !== 'string') {
    return NextResponse.json({ ok: false, error: 'invalid_token' }, { status: 400 })
  }
  if (typeof password !== 'string' || !isPasswordValid(password)) {
    return NextResponse.json({ ok: false, error: 'invalid_password' }, { status: 400 })
  }

  if (!(await allowHit(`reset:ip:${hashKey(getClientIp(request.headers))}`, 20, 3600))) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 })
  }

  try {
    const userId = await consumeToken(token, 'reset_password')
    if (!userId) return NextResponse.json({ ok: false, error: 'invalid_token' }, { status: 400 })

    const hash = await hashPassword(password)
    // Following the emailed link proves inbox ownership, so the email also counts as verified.
    await sql`
      UPDATE users SET password_hash = ${hash}, email_verified_at = COALESCE(email_verified_at, now())
      WHERE id = ${userId}
    `
    await sql`UPDATE auth_tokens SET used_at = now() WHERE user_id = ${userId} AND used_at IS NULL`
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Password reset failed:', error)
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 })
  }
}
