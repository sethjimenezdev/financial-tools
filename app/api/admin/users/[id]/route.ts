import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireAdmin } from '@/lib/admin'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Ctx = { params: Promise<{ id: string }> }

// Hard delete; accounts, auth_tokens and saved_calculations go with it via ON DELETE CASCADE.
export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const a = await requireAdmin()
  if (a.error) return a.error

  const { id } = await ctx.params
  if (!UUID_RE.test(id)) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 })
  if (id === a.userId) return NextResponse.json({ ok: false, error: 'cannot_delete_self' }, { status: 400 })

  try {
    // Admins are never deleted from here (demote first), so the last admin can't be removed.
    const rows = await sql`DELETE FROM users WHERE id = ${id} AND is_admin = false RETURNING id`
    if (rows[0]) return NextResponse.json({ ok: true })

    const exists = await sql`SELECT 1 FROM users WHERE id = ${id}`
    return exists[0]
      ? NextResponse.json({ ok: false, error: 'cannot_delete_admin' }, { status: 400 })
      : NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 })
  } catch (error) {
    console.error('Failed to delete user:', error)
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 })
  }
}
