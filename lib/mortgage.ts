export interface PaymentDetails {
  paymentNumber: number;
  balanceNAP: number;
  balanceWAP: number;
  monthlyPayment: number;
  additionalPayment?: number;
  interestNAP: number;
  interestWAP: number;
  decreaseNAP: number;
  decreaseWAP: number;
  remainingBalanceNAP: number;
  remainingBalanceWAP: number;
}

export const Dollar = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
});

export interface AmortizationScheduleParams {
  mortgageAmount: number;
  interestRate: number;
  monthlyPayment: number;
  /** One entry per month, in order; determines the schedule length. */
  additionalPayments: number[];
}

export interface AmortizationScheduleResult {
  details: PaymentDetails[];
  fullInterestPaymentNAP: number;
  fullInterestPaymentWAP: number;
}

/**
 * Builds the full amortization schedule for both the no-additional-payments (NAP)
 * and with-additional-payments (WAP) scenarios. Once a scenario's balance is paid
 * off, later months accrue no further interest and stay clamped at a zero balance
 * instead of continuing to apply payments to a nonexistent debt.
 */
export function buildAmortizationSchedule({
  mortgageAmount,
  interestRate,
  monthlyPayment,
  additionalPayments,
}: AmortizationScheduleParams): AmortizationScheduleResult {
  const details: PaymentDetails[] = [];
  let remainingBalanceNAP = mortgageAmount;
  let remainingBalanceWAP = mortgageAmount;
  let fullInterestPaymentNAP = 0;
  let fullInterestPaymentWAP = 0;
  const monthlyRate = interestRate / 12 / 100;

  for (let i = 0; i < additionalPayments.length; i++) {
    const balanceNAP = remainingBalanceNAP;
    const balanceWAP = remainingBalanceWAP;
    const additionalPayment = additionalPayments[i];

    const interestNAP = balanceNAP > 0 ? balanceNAP * monthlyRate : 0;
    const decreaseNAP = balanceNAP > 0 ? Math.min(monthlyPayment - interestNAP, balanceNAP) : 0;
    remainingBalanceNAP = Math.max(balanceNAP - decreaseNAP, 0);

    const interestWAP = balanceWAP > 0 ? balanceWAP * monthlyRate : 0;
    const decreaseWAP = balanceWAP > 0 ? Math.min(monthlyPayment + additionalPayment - interestWAP, balanceWAP) : 0;
    remainingBalanceWAP = Math.max(balanceWAP - decreaseWAP, 0);

    fullInterestPaymentNAP += interestNAP;
    fullInterestPaymentWAP += interestWAP;

    details.push({
      paymentNumber: i + 1,
      balanceNAP,
      balanceWAP,
      monthlyPayment,
      additionalPayment,
      interestNAP,
      interestWAP,
      decreaseNAP,
      decreaseWAP,
      remainingBalanceNAP,
      remainingBalanceWAP,
    });
  }

  return { details, fullInterestPaymentNAP, fullInterestPaymentWAP };
}

/** Standard PMT: fixed monthly payment for a loan amount, annual rate (%) and term in years. */
export function calcMonthlyPayment(mortgageAmount: number, interestRate: number, mortgageLength: number): number {
  if (!(mortgageAmount > 0 && interestRate > 0 && mortgageLength > 0)) return 0;
  //https://superuser.com/questions/871404/what-would-be-the-the-mathematical-equivalent-of-this-excel-formula-pmt
  const p = Number(mortgageAmount);
  const r = Number(interestRate) / 100;
  const t = Number(mortgageLength);
  const n = 12;
  const a = p * (r / n);
  const b = 1 - (1 / Math.pow(1 + (r / n), n * t));
  return Number((a / b).toFixed(2) || 0);
}

export interface YearGroup {
  /** 1-based loan year: payments 1-12 are year 1, 13-24 are year 2, and so on. */
  year: number;
  firstPayment: number;
  lastPayment: number;
  payments: PaymentDetails[];
  interestNAP: number;
  interestWAP: number;
  endingBalanceNAP: number;
  endingBalanceWAP: number;
  hasAdditionalPayment: boolean;
}

/** Groups a schedule into loan years; the last year may hold fewer than 12 payments. */
export function groupByYear(details: PaymentDetails[]): YearGroup[] {
  const groups: YearGroup[] = [];

  for (const d of details) {
    const year = Math.ceil(d.paymentNumber / 12);
    let group = groups[groups.length - 1];
    if (!group || group.year !== year) {
      group = {
        year,
        firstPayment: d.paymentNumber,
        lastPayment: d.paymentNumber,
        payments: [],
        interestNAP: 0,
        interestWAP: 0,
        endingBalanceNAP: 0,
        endingBalanceWAP: 0,
        hasAdditionalPayment: false,
      };
      groups.push(group);
    }

    group.payments.push(d);
    group.lastPayment = d.paymentNumber;
    group.interestNAP += d.interestNAP;
    group.interestWAP += d.interestWAP;
    group.endingBalanceNAP = d.remainingBalanceNAP;
    group.endingBalanceWAP = d.remainingBalanceWAP;
    if (d.additionalPayment) group.hasAdditionalPayment = true;
  }

  return groups;
}
