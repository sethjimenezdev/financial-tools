import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { sql } from '@/lib/db'

/**
 * Admin check for API routes. The role is read from the database on every call
 * (not from the JWT) so revoking admin takes effect immediately.
 */
export async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.id) return { error: NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 }) }
  const rows = await sql`SELECT is_admin FROM users WHERE id = ${session.user.id}`
  if (!rows[0]?.is_admin) return { error: NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 }) }
  return { userId: session.user.id }
}

/** Same check for server components; false for anonymous users and non-admins. */
export async function isAdminUser(userId: string | undefined): Promise<boolean> {
  if (!userId) return false
  const rows = await sql`SELECT is_admin FROM users WHERE id = ${userId}`
  return rows[0]?.is_admin === true
}
