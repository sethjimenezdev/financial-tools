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
