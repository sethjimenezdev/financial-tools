import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { EMAIL_RE } from '@/lib/password-policy'
import { allowHit, getClientIp, hashKey } from '@/lib/rate-limit'
import { createToken } from '@/lib/tokens'
import { normalizeLang, sendVerificationEmail } from '@/lib/email'

// Resend the verification email. Always answers ok so emails can't be enumerated.
export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }
  const { email, lang } = body as Record<string, unknown>
  if (typeof email !== 'string' || email.trim().length > 254 || !EMAIL_RE.test(email.trim())) {
    return NextResponse.json({ ok: false, error: 'invalid_email' }, { status: 400 })
  }
  const normalizedEmail = email.trim().toLowerCase()

  if (!(await allowHit(`resend:ip:${hashKey(getClientIp(request.headers))}`, 10, 3600))) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 })
  }

  try {
    if (await allowHit(`verify-email:${hashKey(normalizedEmail)}`, 3, 3600)) {
      const rows = await sql`SELECT id, first_name, email_verified_at FROM users WHERE lower(email) = ${normalizedEmail}`
      const user = rows[0]
      if (user && !user.email_verified_at) {
        const token = await createToken(user.id, 'verify_email')
        await sendVerificationEmail(normalizedEmail, user.first_name, token, normalizeLang(lang))
      }
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Resend verification failed:', error)
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 })
  }
}
