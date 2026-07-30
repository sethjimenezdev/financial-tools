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
