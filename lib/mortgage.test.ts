import { describe, expect, it } from 'vitest'
import { buildAmortizationSchedule, groupByYear } from './mortgage'

function schedule(months: number, extra: Record<number, number> = {}) {
  return buildAmortizationSchedule({
    mortgageAmount: 100000,
    interestRate: 6,
    monthlyPayment: 1000,
    additionalPayments: Array.from({ length: months }, (_, i) => extra[i] ?? 0),
  }).details
}

describe('groupByYear', () => {
  it('returns no groups for an empty schedule', () => {
    expect(groupByYear([])).toEqual([])
  })

  it('groups payments into 12-payment loan years', () => {
    const groups = groupByYear(schedule(30))
    expect(groups.map(g => g.year)).toEqual([1, 2, 3])
    expect(groups.map(g => g.payments.length)).toEqual([12, 12, 6])
  })

  it('reports the payment range of each year, including a partial last year', () => {
    const groups = groupByYear(schedule(30))
    expect(groups.map(g => [g.firstPayment, g.lastPayment])).toEqual([[1, 12], [13, 24], [25, 30]])
  })

  it('sums interest per year for both scenarios', () => {
    const details = schedule(24, { 0: 500 })
    const [y1] = groupByYear(details)
    const first12 = details.slice(0, 12)
    expect(y1.interestNAP).toBeCloseTo(first12.reduce((s, d) => s + d.interestNAP, 0))
    expect(y1.interestWAP).toBeCloseTo(first12.reduce((s, d) => s + d.interestWAP, 0))
    expect(y1.interestWAP).not.toBeCloseTo(y1.interestNAP)
  })

  it('uses the last payment remaining balance as the ending balance', () => {
    const details = schedule(24)
    const [y1, y2] = groupByYear(details)
    expect(y1.endingBalanceNAP).toBe(details[11].remainingBalanceNAP)
    expect(y2.endingBalanceWAP).toBe(details[23].remainingBalanceWAP)
  })

  it('flags years that contain an additional payment', () => {
    const groups = groupByYear(schedule(36, { 14: 200 }))
    expect(groups.map(g => g.hasAdditionalPayment)).toEqual([false, true, false])
  })

  it('does not flag explicit zero or undefined additional payments', () => {
    const details = schedule(12)
    details[3] = { ...details[3], additionalPayment: undefined }
    expect(groupByYear(details)[0].hasAdditionalPayment).toBe(false)
  })

  it('keeps payments in their original order and by reference', () => {
    const details = schedule(13)
    const groups = groupByYear(details)
    expect(groups.flatMap(g => g.payments)).toEqual(details)
    expect(groups[0].payments[0]).toBe(details[0])
  })
})
