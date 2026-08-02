'use client'
import { useEffect, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import { Dollar, buildAmortizationSchedule, type PaymentDetails } from '@/lib/mortgage';
import { useLanguage } from '@/lib/i18n';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageToggle } from '@/components/language-toggle';
import { PaymentsBreakdown, type PaymentsBreakdownHandle } from '@/components/payments-breakdown';
import { FeedbackModal } from '@/components/feedback-modal';
import { PayoffJumpButton } from '@/components/payoff-jump-button';

const Home=() => {
  const { t } = useLanguage();
  const breakdownRef = useRef<PaymentsBreakdownHandle>(null);
  const breakdownSectionRef = useRef<HTMLDivElement>(null);
  const [mortgageAmount, setMortgageAmount] = useState(0);
  const [interestRate, setInterestRate] = useState(0);
  const [mortgageLength, setMortgageLength] = useState(0);
  const [monthlyPayment, setMonthlyPayment] = useState(0);
  const [details, setDetails] = useState<PaymentDetails[]>([]);
  const [fullInterestPaymentNAP, setFullInterestPaymentNAP] = useState(0);
  const [fullInterestPaymentWAP, setFullInterestPaymentWAP] = useState(0);
  const [monthlyAdditionalPayment, setMonthlyAdditionalPayment] = useState(0);
  const [isBreakdownSectionVisible, setIsBreakdownSectionVisible] = useState(false);

  useEffect(()=>{
    if(mortgageAmount > 0 && interestRate > 0 && mortgageLength > 0) {
      const pmt = () =>{
        //https://superuser.com/questions/871404/what-would-be-the-the-mathematical-equivalent-of-this-excel-formula-pmt
        const p = Number(mortgageAmount);
        const r = Number(interestRate)/100;
        const t = Number(mortgageLength);
        const n = 12;
        const a = p * (r/n);
        const b = 1-(1/(Math.pow(1+(r/n),n*t)));
        const monthlyPayment = a/b;
        return Number(monthlyPayment.toFixed(2) || 0);
      }
      setMonthlyPayment(pmt());
    } else {
      setMonthlyPayment(0);
    }
  },[mortgageAmount, interestRate, mortgageLength]);

  useEffect(()=>{
    if(monthlyPayment && mortgageLength && monthlyPayment && interestRate){
      const additionalPayments = Array(mortgageLength * 12).fill(monthlyAdditionalPayment);
      const { details, fullInterestPaymentNAP, fullInterestPaymentWAP } = buildAmortizationSchedule({
        mortgageAmount,
        interestRate,
        monthlyPayment,
        additionalPayments,
      });
      setDetails(details);
      setFullInterestPaymentNAP(fullInterestPaymentNAP);
      setFullInterestPaymentWAP(fullInterestPaymentWAP);
    } else {
      setDetails([]);
      setFullInterestPaymentNAP(0);
      setFullInterestPaymentWAP(0);
    }
  },[interestRate, monthlyPayment, mortgageAmount, mortgageLength, monthlyAdditionalPayment]);

  const addPayment = (amount: number, index: number) =>{
    const additionalPayments = details.map((d, i) => (i === index ? amount : Number(d.additionalPayment ?? 0)));
    const { details: newDetails, fullInterestPaymentNAP, fullInterestPaymentWAP } = buildAmortizationSchedule({
      mortgageAmount,
      interestRate,
      monthlyPayment,
      additionalPayments,
    });
    setDetails(newDetails);
    setFullInterestPaymentNAP(fullInterestPaymentNAP);
    setFullInterestPaymentWAP(fullInterestPaymentWAP);
  }

  useEffect(() => {
    const el = breakdownSectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setIsBreakdownSectionVisible(entry.isIntersecting), { threshold: 0 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const payoffPaymentNumber = details.find(d => d.remainingBalanceWAP === 0)?.paymentNumber ?? null;
  const showPayoffJumpButton = isBreakdownSectionVisible && monthlyAdditionalPayment > 0 && payoffPaymentNumber !== null;

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex flex-col">
            <h1 className="text-lg sm:text-xl font-semibold">
              {t.appTitle}
            </h1>
            <p className="text-xs italic text-gray-400">{t.appSubtitle}</p>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex flex-col gap-6 px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-start justify-between gap-4">
          <p id="app-description" className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
            {t.appDescription}
          </p>
          <FeedbackModal />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-5 sm:p-6 flex flex-col gap-3">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {t.formIntro}
            </div>
            <div className="flex flex-col md:flex-row md:items-center py-1 gap-1 md:gap-0">
              <label className="sm:w-48 shrink-0 text-sm font-medium text-slate-700 dark:text-slate-300">
                {t.mortgageAmountLabel}
              </label>
              <div className="flex items-center rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
                <span className="px-3 text-sm text-slate-500 dark:text-slate-400 bg-transparent">$</span>
                <input
                  className="w-full px-3 py-2 bg-transparent outline-none"
                  id="mortgage-amount"
                  type="text"
                  inputMode="numeric"
                  value={mortgageAmount ? mortgageAmount.toLocaleString('en-US') : ''}
                  onChange={(e)=> {
                    const raw = e.currentTarget.value.replace(/,/g, '');
                    if (raw !== '' && !/^\d+$/.test(raw)) return;
                    setMortgageAmount(raw === '' ? 0 : Number(raw));
                  }}
                ></input>
              </div>
            </div>
            <div className="flex flex-col md:flex-row md:items-center py-1 gap-1 md:gap-0">
              <label className="sm:w-48 shrink-0 text-sm font-medium text-slate-700 dark:text-slate-300">
                {t.interestRateLabel}
              </label>
              <div className="flex items-center rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
                <input
                  className="w-full px-3 py-2 bg-transparent outline-none"
                  id="interest-rate"
                  type="text"
                  onChange={(e)=> setInterestRate(Number(e.currentTarget.value))}
                ></input>
                <span className="px-3 text-sm text-slate-500 dark:text-slate-400 bg-transparent">%</span>
              </div>
            </div>
            <div className="flex flex-col md:flex-row md:items-center py-1 gap-1 md:gap-0">
              <label className="sm:w-48 shrink-0 text-sm font-medium text-slate-700 dark:text-slate-300">
                {t.mortgageLengthLabel}
              </label>
              <div className="flex items-center rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
                <input
                  className="w-full px-3 py-2 bg-transparent outline-none"
                  id="mortgage-length"
                  type="text"
                  onChange={(e)=> setMortgageLength(Number(e.currentTarget.value))}
                ></input>
                <span className="px-3 text-sm text-slate-500 dark:text-slate-400 bg-transparent">{t.yearsUnit}</span>
              </div>
            </div>
            <div className="flex flex-col md:flex-row md:items-center py-1 gap-1 md:gap-0">
              <label className="sm:w-48 shrink-0 text-sm font-medium text-slate-700 dark:text-slate-300">
                {t.numberOfPaymentsLabel}
              </label>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-slate-700 dark:text-slate-200">
                {details.length}
              </div>
            </div>
            <div className="flex flex-col md:flex-row md:items-center py-1 gap-1 md:gap-0">
              <label className="sm:w-48 shrink-0 text-sm font-medium text-slate-700 dark:text-slate-300">
                {t.monthlyPaymentLabel}
              </label>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-slate-700 dark:text-slate-200">
                {Dollar.format(monthlyPayment)}
              </div>
            </div>
            <div className="flex flex-col md:flex-row md:items-center py-1 gap-1 md:gap-0">
              <label className="sm:w-48 shrink-0 text-sm font-medium text-slate-700 dark:text-slate-300">
                {t.monthlyAdditionalPaymentLabel}
              </label>
              <div className="flex items-center rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
                <span className="px-3 text-sm text-slate-500 dark:text-slate-400 bg-transparent">$</span>
                <input
                  className="w-full px-3 py-2 bg-transparent outline-none"
                  id="monthly-additional-payment"
                  type="text"
                  inputMode="numeric"
                  value={monthlyAdditionalPayment ? monthlyAdditionalPayment.toLocaleString('en-US') : ''}
                  onChange={(e)=> {
                    const raw = e.currentTarget.value.replace(/,/g, '');
                    if (raw !== '' && !/^\d+$/.test(raw)) return;
                    setMonthlyAdditionalPayment(raw === '' ? 0 : Number(raw));
                  }}
                ></input>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-5 sm:p-6 flex flex-col gap-3">
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {t.fullInterestPaymentNAPLabel}
              </div>
              <div className="mt-1 text-xl font-semibold">{Dollar.format(fullInterestPaymentNAP)}</div>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {t.fullInterestPaymentWAPLabel}
              </div>
              <div className="mt-1 text-xl font-semibold">{Dollar.format(fullInterestPaymentWAP)}</div>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {t.fullInterestSavingsLabel}
              </div>
              <div className="mt-1 text-xl font-semibold text-emerald-600 dark:text-emerald-400">
                {Dollar.format(fullInterestPaymentWAP === 0 ? 0 : fullInterestPaymentNAP - fullInterestPaymentWAP)}
              </div>
            </div>

            <button
              type="button"
              id="download-pdf"
              name="download-pdf"
              disabled={details.length === 0}
              onClick={() => breakdownRef.current?.downloadPdf({
                mortgageAmount,
                interestRate,
                mortgageLength,
                numberOfPayments: details.length,
                monthlyPayment,
                monthlyAdditionalPayment,
                fullInterestPaymentNAP,
                fullInterestPaymentWAP,
                fullInterestSavings: fullInterestPaymentWAP === 0 ? 0 : fullInterestPaymentNAP - fullInterestPaymentWAP,
              })}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <Download size={16} />
              {t.downloadPdfLabel}
            </button>
          </div>
        </div>

        <div ref={breakdownSectionRef}>
          {details.length > 0 && (
            <PaymentsBreakdown ref={breakdownRef} details={details} onAdditionalPaymentChange={addPayment} />
          )}
        </div>
      </main>

      <PayoffJumpButton visible={showPayoffJumpButton} targetPaymentNumber={payoffPaymentNumber} />
    </>
  );
}


export default Home;
