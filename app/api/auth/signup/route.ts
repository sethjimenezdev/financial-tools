import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { hashPassword } from '@/lib/password'
import { EMAIL_RE, isPasswordValid } from '@/lib/password-policy'
import { allowHit, getClientIp, hashKey } from '@/lib/rate-limit'
import { createToken } from '@/lib/tokens'
import { normalizeLang, sendAlreadyRegisteredEmail, sendVerificationEmail } from '@/lib/email'

const MAX_SIGNUPS_PER_IP_PER_HOUR = 10

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }
  const { firstName, lastName, email, password, lang, website } = body as Record<string, unknown>

  // Honeypot: bots that fill this hidden field get a fake success.
  if (typeof website === 'string' && website.trim() !== '') {
    return NextResponse.json({ ok: true }, { status: 200 })
  }

  if (typeof firstName !== 'string' || firstName.trim().length < 1 || firstName.trim().length > 80) {
    return NextResponse.json({ ok: false, error: 'invalid_first_name' }, { status: 400 })
  }
  if (typeof lastName !== 'string' || lastName.trim().length < 1 || lastName.trim().length > 80) {
    return NextResponse.json({ ok: false, error: 'invalid_last_name' }, { status: 400 })
  }
  if (typeof email !== 'string' || email.trim().length > 254 || !EMAIL_RE.test(email.trim())) {
    return NextResponse.json({ ok: false, error: 'invalid_email' }, { status: 400 })
  }
  if (typeof password !== 'string' || !isPasswordValid(password)) {
    return NextResponse.json({ ok: false, error: 'invalid_password' }, { status: 400 })
  }

  if (!(await allowHit(`signup:ip:${hashKey(getClientIp(request.headers))}`, MAX_SIGNUPS_PER_IP_PER_HOUR, 3600))) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 })
  }

  const normalizedEmail = email.trim().toLowerCase()
  const language = normalizeLang(lang)

  try {
    const existing = await sql`SELECT id, first_name, email_verified_at FROM users WHERE lower(email) = ${normalizedEmail}`
    if (existing[0]) {
      // Same response either way so the form can't be used to discover registered emails.
      if (!existing[0].email_verified_at) {
        // Re-signup before verifying: replace the password and resend the link (throttled per email).
        if (await allowHit(`verify-email:${hashKey(normalizedEmail)}`, 3, 3600)) {
          const hash = await hashPassword(password)
          await sql`
            UPDATE users SET first_name = ${firstName.trim()}, last_name = ${lastName.trim()}, password_hash = ${hash}
            WHERE id = ${existing[0].id}
          `
          const token = await createToken(existing[0].id, 'verify_email')
          await sendVerificationEmail(normalizedEmail, firstName.trim(), token, language)
        }
      } else if (await allowHit(`already-registered:${hashKey(normalizedEmail)}`, 2, 3600)) {
        await sendAlreadyRegisteredEmail(normalizedEmail, existing[0].first_name, language)
      }
      return NextResponse.json({ ok: true }, { status: 201 })
    }

    const hash = await hashPassword(password)
    const created = await sql`
      INSERT INTO users (first_name, last_name, email, password_hash)
      VALUES (${firstName.trim()}, ${lastName.trim()}, ${normalizedEmail}, ${hash})
      ON CONFLICT DO NOTHING
      RETURNING id
    `
    if (created[0]) {
      const token = await createToken(created[0].id, 'verify_email')
      await sendVerificationEmail(normalizedEmail, firstName.trim(), token, language)
    }
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (error) {
    console.error('Signup failed:', error)
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 })
  }
}
