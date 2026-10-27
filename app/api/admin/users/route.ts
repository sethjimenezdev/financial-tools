import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireAdmin } from '@/lib/admin'

const PAGE_SIZE = 25

export async function GET(request: NextRequest) {
  const a = await requireAdmin()
  if (a.error) return a.error

  const params = request.nextUrl.searchParams
  const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1)
  const q = (params.get('q') ?? '').trim().slice(0, 100)
  // Escape LIKE wildcards so the search text is matched literally.
  const pattern = `%${q.replace(/[\\%_]/g, '\\$&')}%`

  try {
    const [rows, totals] = await Promise.all([
      sql`
        SELECT u.id, u.first_name, u.last_name, u.email, u.created_at, u.email_verified_at, u.is_admin,
               (u.password_hash IS NOT NULL) AS has_password,
               EXISTS (SELECT 1 FROM accounts a WHERE a.user_id = u.id AND a.provider = 'google') AS has_google,
               (SELECT count(*)::int FROM saved_calculations c WHERE c.user_id = u.id) AS calculation_count
        FROM users u
        WHERE ${q} = '' OR u.email ILIKE ${pattern} OR (u.first_name || ' ' || u.last_name) ILIKE ${pattern}
        ORDER BY u.created_at DESC
        LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}
      `,
      sql`
        SELECT count(*)::int AS total FROM users u
        WHERE ${q} = '' OR u.email ILIKE ${pattern} OR (u.first_name || ' ' || u.last_name) ILIKE ${pattern}
      `,
    ])
    return NextResponse.json({
      ok: true,
      page,
      pageSize: PAGE_SIZE,
      total: totals[0].total,
      users: rows.map((r) => ({
        id: r.id,
        name: `${r.first_name} ${r.last_name}`.trim(),
        email: r.email,
        createdAt: r.created_at,
        emailVerified: r.email_verified_at !== null,
        hasPassword: r.has_password,
        hasGoogle: r.has_google,
        isAdmin: r.is_admin,
        calculationCount: r.calculation_count,
      })),
    })
  } catch (error) {
    console.error('Failed to list users:', error)
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 })
  }
}
