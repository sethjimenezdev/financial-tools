import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { consumeToken } from '@/lib/tokens'

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }
  const { token } = body as Record<string, unknown>
  if (typeof token !== 'string') {
    return NextResponse.json({ ok: false, error: 'invalid_token' }, { status: 400 })
  }

  try {
    const userId = await consumeToken(token, 'verify_email')
    if (!userId) return NextResponse.json({ ok: false, error: 'invalid_token' }, { status: 400 })
    await sql`UPDATE users SET email_verified_at = COALESCE(email_verified_at, now()) WHERE id = ${userId}`
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Email verification failed:', error)
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 })
  }
}
