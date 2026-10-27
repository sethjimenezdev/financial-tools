import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { sql } from '@/lib/db'
import { parseCalculationInput, parseName, rowToCalculation } from '@/lib/calculations'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Ctx = { params: Promise<{ id: string }> }

async function authorize(ctx: Ctx) {
  const session = await auth()
  const { id } = await ctx.params
  if (!session?.user?.id) return { error: NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 }) }
  if (!UUID_RE.test(id)) return { error: NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 }) }
  return { userId: session.user.id, id }
}

export async function GET(_request: NextRequest, ctx: Ctx) {
  const a = await authorize(ctx)
  if (a.error) return a.error
  try {
    const rows = await sql`SELECT * FROM saved_calculations WHERE id = ${a.id} AND user_id = ${a.userId}`
    if (!rows[0]) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 })
    return NextResponse.json({ ok: true, calculation: rowToCalculation(rows[0]) })
  } catch (error) {
    console.error('Failed to load calculation:', error)
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 })
  }
}

// Rename and/or overwrite the saved inputs. Send `name`, the calculation fields, or both.
export async function PATCH(request: NextRequest, ctx: Ctx) {
  const a = await authorize(ctx)
  if (a.error) return a.error

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }
  const record = (body ?? {}) as Record<string, unknown>
  const hasName = record.name !== undefined
  const hasData = record.mortgageAmount !== undefined
  if (!hasName && !hasData) return NextResponse.json({ ok: false, error: 'invalid_data' }, { status: 400 })

  const name = hasName ? parseName(record.name) : null
  if (hasName && !name) return NextResponse.json({ ok: false, error: 'invalid_name' }, { status: 400 })
  const input = hasData ? parseCalculationInput(record) : null
  if (hasData && !input) return NextResponse.json({ ok: false, error: 'invalid_data' }, { status: 400 })

  try {
    const rows = await sql`
      UPDATE saved_calculations SET
        name = COALESCE(${name}, name),
        mortgage_amount = COALESCE(${input?.mortgageAmount ?? null}, mortgage_amount),
        interest_rate = COALESCE(${input?.interestRate ?? null}, interest_rate),
        mortgage_length = COALESCE(${input?.mortgageLength ?? null}, mortgage_length),
        monthly_additional_payment = COALESCE(${input?.monthlyAdditionalPayment ?? null}, monthly_additional_payment),
        additional_payments = CASE WHEN ${hasData} THEN ${input?.additionalPayments ? JSON.stringify(input.additionalPayments) : null}::jsonb ELSE additional_payments END,
        updated_at = now()
      WHERE id = ${a.id} AND user_id = ${a.userId}
      RETURNING *
    `
    if (!rows[0]) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 })
    return NextResponse.json({ ok: true, calculation: rowToCalculation(rows[0]) })
  } catch (error) {
    console.error('Failed to update calculation:', error)
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const a = await authorize(ctx)
  if (a.error) return a.error
  try {
    const rows = await sql`DELETE FROM saved_calculations WHERE id = ${a.id} AND user_id = ${a.userId} RETURNING id`
    if (!rows[0]) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Failed to delete calculation:', error)
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 })
  }
}
