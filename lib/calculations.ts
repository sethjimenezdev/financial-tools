export interface CalculationInput {
  mortgageAmount: number
  interestRate: number
  mortgageLength: number
  monthlyAdditionalPayment: number
  /** One entry per month; null when the user never customized individual months. */
  additionalPayments: number[] | null
}

export interface SavedCalculation extends CalculationInput {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export const DEFAULT_MAX_SAVED_CALCULATIONS = 3

export function getMaxSavedCalculations(): number {
  const n = Number.parseInt(process.env.MAX_SAVED_CALCULATIONS ?? '', 10)
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX_SAVED_CALCULATIONS
}

const MAX_AMOUNT = 1_000_000_000
const MAX_YEARS = 50

function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

/** Validates untrusted JSON; returns the clean input or null. */
export function parseCalculationInput(body: Record<string, unknown>): CalculationInput | null {
  const { mortgageAmount, interestRate, mortgageLength, monthlyAdditionalPayment, additionalPayments } = body
  if (!isNum(mortgageAmount) || mortgageAmount <= 0 || mortgageAmount > MAX_AMOUNT) return null
  if (!isNum(interestRate) || interestRate <= 0 || interestRate > 100) return null
  if (!isNum(mortgageLength) || !Number.isInteger(mortgageLength) || mortgageLength < 1 || mortgageLength > MAX_YEARS) return null
  if (!isNum(monthlyAdditionalPayment) || monthlyAdditionalPayment < 0 || monthlyAdditionalPayment > MAX_AMOUNT) return null

  let extras: number[] | null = null
  if (additionalPayments !== null && additionalPayments !== undefined) {
    if (!Array.isArray(additionalPayments) || additionalPayments.length !== mortgageLength * 12) return null
    if (!additionalPayments.every((p) => isNum(p) && p >= 0 && p <= MAX_AMOUNT)) return null
    extras = additionalPayments.map((p: number) => Math.round(p * 100) / 100)
  }

  return {
    mortgageAmount: Math.round(mortgageAmount * 100) / 100,
    interestRate: Math.round(interestRate * 1000) / 1000,
    mortgageLength,
    monthlyAdditionalPayment: Math.round(monthlyAdditionalPayment * 100) / 100,
    additionalPayments: extras,
  }
}

export function parseName(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const name = value.trim()
  return name.length >= 1 && name.length <= 120 ? name : null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rowToCalculation(row: Record<string, any>): SavedCalculation {
  return {
    id: row.id,
    name: row.name,
    mortgageAmount: Number(row.mortgage_amount),
    interestRate: Number(row.interest_rate),
    mortgageLength: Number(row.mortgage_length),
    monthlyAdditionalPayment: Number(row.monthly_additional_payment),
    additionalPayments: row.additional_payments ?? null,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  }
}
