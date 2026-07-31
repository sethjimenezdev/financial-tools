import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { createHash } from 'crypto'

const FEEDBACK_TYPES = ['bug', 'improvement', 'other'] as const
type FeedbackType = (typeof FEEDBACK_TYPES)[number]

const EMAIL_RE = /^\S+@\S+\.\S+$/
const MIN_NAME_LENGTH = 3
const MIN_COMMENT_LENGTH = 5
const MAX_SUBMISSIONS_PER_HOUR = 5

function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex')
}

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) return forwardedFor.split(',')[0].trim()
  return 'unknown'
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  const { name, email, type, comment, website } = body as Record<string, unknown>

  // Honeypot: bots that fill this hidden field get a fake success, no insert.
  if (typeof website === 'string' && website.trim() !== '') {
    return NextResponse.json({ ok: true }, { status: 200 })
  }

  if (typeof name !== 'string' || name.trim().length < MIN_NAME_LENGTH || name.trim().length > 120) {
    return NextResponse.json({ ok: false, error: 'invalid_name' }, { status: 400 })
  }
  if (typeof email !== 'string' || email.trim().length > 254 || !EMAIL_RE.test(email.trim())) {
    return NextResponse.json({ ok: false, error: 'invalid_email' }, { status: 400 })
  }
  if (typeof type !== 'string' || !FEEDBACK_TYPES.includes(type as FeedbackType)) {
    return NextResponse.json({ ok: false, error: 'invalid_type' }, { status: 400 })
  }
  if (typeof comment !== 'string' || comment.trim().length < MIN_COMMENT_LENGTH || comment.trim().length > 2000) {
    return NextResponse.json({ ok: false, error: 'invalid_comment' }, { status: 400 })
  }

  const ipHash = hashIp(getClientIp(request))

  try {
    const sql = neon(process.env.DATABASE_URL!)

    const rows = await sql`
      SELECT count(*)::int AS count FROM feedback
      WHERE ip_hash = ${ipHash} AND created_at > now() - interval '1 hour'
    `
    if (rows[0]?.count >= MAX_SUBMISSIONS_PER_HOUR) {
      return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 })
    }

    await sql`
      INSERT INTO feedback (name, email, type, comment, ip_hash)
      VALUES (${name.trim()}, ${email.trim()}, ${type}, ${comment.trim()}, ${ipHash})
    `

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (error) {
    console.error('Failed to save feedback:', error)
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 })
  }
}
