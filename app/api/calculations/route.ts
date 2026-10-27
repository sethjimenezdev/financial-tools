import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { sql } from '@/lib/db'
import { getMaxSavedCalculations, parseCalculationInput, parseName, rowToCalculation } from '@/lib/calculations'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

  try {
    const rows = await sql`SELECT * FROM saved_calculations WHERE user_id = ${session.user.id} ORDER BY updated_at DESC`
    return NextResponse.json({ ok: true, max: getMaxSavedCalculations(), calculations: rows.map(rowToCalculation) })
  } catch (error) {
    console.error('Failed to list calculations:', error)
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }
  const record = (body ?? {}) as Record<string, unknown>
  const name = parseName(record.name)
  if (!name) return NextResponse.json({ ok: false, error: 'invalid_name' }, { status: 400 })
  const input = parseCalculationInput(record)
  if (!input) return NextResponse.json({ ok: false, error: 'invalid_data' }, { status: 400 })

  const max = getMaxSavedCalculations()
  try {
    // Count check and insert in one statement so concurrent requests can't exceed the limit.
    const rows = await sql`
      INSERT INTO saved_calculations
        (user_id, name, mortgage_amount, interest_rate, mortgage_length, monthly_additional_payment, additional_payments)
      SELECT ${session.user.id}, ${name}, ${input.mortgageAmount}, ${input.interestRate}, ${input.mortgageLength},
             ${input.monthlyAdditionalPayment}, ${input.additionalPayments ? JSON.stringify(input.additionalPayments) : null}::jsonb
      WHERE (SELECT count(*) FROM saved_calculations WHERE user_id = ${session.user.id}) < ${max}
      RETURNING *
    `
    if (!rows[0]) return NextResponse.json({ ok: false, error: 'limit_reached', max }, { status: 409 })
    return NextResponse.json({ ok: true, calculation: rowToCalculation(rows[0]) }, { status: 201 })
  } catch (error) {
    console.error('Failed to save calculation:', error)
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 })
  }
}
