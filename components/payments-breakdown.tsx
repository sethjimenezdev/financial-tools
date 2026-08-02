'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { X } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Dollar, type PaymentDetails } from '@/lib/mortgage'
import { useLanguage } from '@/lib/i18n'

interface PaymentsBreakdownProps {
  details: PaymentDetails[];
  onAdditionalPaymentChange: (amount: number, index: number) => void;
}

export interface PdfSummary {
  mortgageAmount: number;
  interestRate: number;
  mortgageLength: number;
  numberOfPayments: number;
  monthlyPayment: number;
  monthlyAdditionalPayment: number;
  fullInterestPaymentNAP: number;
  fullInterestPaymentWAP: number;
  fullInterestSavings: number;
}

export interface PaymentsBreakdownHandle {
  downloadPdf: (summary: PdfSummary) => void;
}

const OPTIONAL_COLUMN_KEYS = [
  { key: 'balanceNAP', value: (d: PaymentDetails) => d.balanceNAP },
  { key: 'balanceWAP', value: (d: PaymentDetails) => d.balanceWAP },
  { key: 'decreaseNAP', value: (d: PaymentDetails) => d.decreaseNAP },
  { key: 'decreaseWAP', value: (d: PaymentDetails) => d.decreaseWAP },
  { key: 'interestNAP', value: (d: PaymentDetails) => d.interestNAP },
  { key: 'interestWAP', value: (d: PaymentDetails) => d.interestWAP },
  { key: 'remainingBalanceNAP', value: (d: PaymentDetails) => d.remainingBalanceNAP },
  { key: 'remainingBalanceWAP', value: (d: PaymentDetails) => d.remainingBalanceWAP },
] as const;

function AdditionalPaymentInput({
  value,
  index,
  onChange,
  className,
}: {
  value: number | undefined;
  index: number;
  onChange: (amount: number, index: number) => void;
  className: string;
}) {
  return (
    <input
      className={className}
      type="text"
      inputMode="numeric"
      value={value ? value.toLocaleString('en-US') : ''}
      onChange={(e) => {
        const raw = e.target.value.replace(/,/g, '');
        if (raw !== '' && !/^\d+$/.test(raw)) return;
        onChange(raw === '' ? 0 : Number(raw), index);
      }}
    ></input>
  );
}

function AdditionalPaymentCell({
  detail,
  index,
  onChange,
  clearAriaLabel,
  inputClassName,
}: {
  detail: PaymentDetails;
  index: number;
  onChange: (amount: number, index: number) => void;
  clearAriaLabel: string;
  inputClassName: string;
}) {
  if (detail.balanceWAP === 0) {
    return <span className="px-2 py-1 text-sm text-slate-400 dark:text-slate-500">{Dollar.format(0)}</span>;
  }

  return (
    <>
      <AdditionalPaymentInput
        value={detail.additionalPayment}
        index={index}
        onChange={onChange}
        className={inputClassName}
      />
      <button
        type="button"
        aria-label={clearAriaLabel}
        className="p-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
        onClick={() => onChange(0, index)}
      >
        <X size={14} />
      </button>
    </>
  );
}

export const PaymentsBreakdown = forwardRef<PaymentsBreakdownHandle, PaymentsBreakdownProps>(function PaymentsBreakdown(
  { details, onAdditionalPaymentChange },
  ref
) {
  const { t, language } = useLanguage();
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(OPTIONAL_COLUMN_KEYS.map(c => [c.key, c.key === 'remainingBalanceNAP' || c.key === 'decreaseNAP' || c.key === 'interestNAP']))
  );
  const toggleColumn = (key: string) =>
    setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }));

  const tableRef = useRef<HTMLTableElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);
  const [contentWidth, setContentWidth] = useState(0);

  useEffect(() => {
    const el = tableRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setContentWidth(el.scrollWidth));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const OPTIONAL_COLUMNS = OPTIONAL_COLUMN_KEYS.map(c => ({
    ...c,
    label: t.columns[c.key],
    mobileLabel: t.columnsMobile[c.key],
  }));
  const shownColumns = OPTIONAL_COLUMNS.filter(c => visibleColumns[c.key]);

  useImperativeHandle(ref, () => ({
    downloadPdf: (summary: PdfSummary) => {
      const doc = new jsPDF({ orientation: 'landscape' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const marginX = 14;
      let y = 16;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(t.appTitle, marginX, y);

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text(t.appSubtitle, marginX, y + 5);
      doc.setTextColor(0, 0, 0);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const generatedOn = new Date().toLocaleDateString(language === 'es' ? 'es-MX' : 'en-US');
      doc.text(`${t.generatedOnLabel}: ${generatedOn}`, marginX, y + 11);

      y += 18;

      const leftSummaryRows: [string, string][] = [
        [t.mortgageAmountLabel, Dollar.format(summary.mortgageAmount)],
        [t.interestRateLabel, `${summary.interestRate}%`],
        [t.mortgageLengthLabel, `${summary.mortgageLength} ${t.yearsUnit}`],
        [t.numberOfPaymentsLabel, String(summary.numberOfPayments)],
        [t.monthlyPaymentLabel, Dollar.format(summary.monthlyPayment)],
        [t.monthlyAdditionalPaymentLabel, Dollar.format(summary.monthlyAdditionalPayment)],
      ];

      const rightSummaryRows: [string, string][] = [
        [t.fullInterestPaymentNAPLabel, Dollar.format(summary.fullInterestPaymentNAP)],
        [t.fullInterestPaymentWAPLabel, Dollar.format(summary.fullInterestPaymentWAP)],
        [t.fullInterestSavingsLabel, Dollar.format(summary.fullInterestSavings)],
      ];

      const rightWidth = 90;
      const rightX = pageWidth - marginX - rightWidth;

      autoTable(doc, {
        startY: y,
        margin: { left: marginX, right: marginX },
        theme: 'plain',
        tableWidth: 140,
        styles: { fontSize: 10, cellPadding: 1.2 },
        columnStyles: {
          0: { fontStyle: 'bold', textColor: [71, 85, 105], cellWidth: 75 },
          1: { textColor: [15, 23, 42] },
        },
        body: leftSummaryRows,
      });

      const leftFinalY =
        (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ??
        y + leftSummaryRows.length * 6;

      autoTable(doc, {
        startY: y,
        margin: { left: rightX, right: marginX },
        theme: 'plain',
        tableWidth: rightWidth,
        styles: { fontSize: 10, cellPadding: 1.2 },
        columnStyles: {
          0: { fontStyle: 'bold', textColor: [71, 85, 105], cellWidth: 50 },
          1: { textColor: [15, 23, 42] },
        },
        body: rightSummaryRows,
      });

      const rightFinalY =
        (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ??
        y + rightSummaryRows.length * 6;

      const summaryFinalY = Math.max(leftFinalY, rightFinalY);

      const head = [[
        t.columns.paymentNumber,
        t.columns.letraHipotecaria,
        t.columns.pagoAdicional,
        ...shownColumns.map(col => col.label),
      ]];

      const body = details.map((d, i) => [
        String(i + 1),
        Dollar.format(d.monthlyPayment),
        Dollar.format(d.additionalPayment ?? 0),
        ...shownColumns.map(col => Dollar.format(col.value(d))),
      ]);

      autoTable(doc, {
        head,
        body,
        startY: summaryFinalY + 8,
        margin: { left: marginX, right: marginX },
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [51, 65, 85], textColor: 255 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: { 0: { halign: 'center' } },
      });

      doc.save(`mortgage-amortization-${new Date().toISOString().slice(0, 10)}.pdf`);
    },
  }), [details, shownColumns, t, language]);

  return (
    <div id="payments-breakdown">
      <div className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">{t.selectColumnsLabel}</div>
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-3 text-sm">
        {OPTIONAL_COLUMNS.map(col => (
          <label key={col.key} className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={visibleColumns[col.key]}
              onChange={() => toggleColumn(col.key)}
              className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
            />
            {col.label}
          </label>
        ))}
      </div>

      <div className="hidden md:block">
        <div
          ref={topScrollRef}
          className="overflow-x-auto"
          onScroll={() => {
            if (bottomScrollRef.current && topScrollRef.current) {
              bottomScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
            }
          }}
        >
          <div style={{ width: contentWidth, height: 1 }} />
        </div>
        <div
          ref={bottomScrollRef}
          className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800"
          onScroll={() => {
            if (topScrollRef.current && bottomScrollRef.current) {
              topScrollRef.current.scrollLeft = bottomScrollRef.current.scrollLeft;
            }
          }}
        >
          <table ref={tableRef} className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300">
              <tr className="text-end">
                <th className="px-3 py-2 text-center">{t.columns.paymentNumber}</th>
                <th className="px-3 py-2">{t.columns.letraHipotecaria}</th>
                <th className="px-3 py-2">{t.columns.pagoAdicional}</th>
                {shownColumns.map(col => (
                  <th key={col.key} className="px-3 py-2">{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {details.map((d: PaymentDetails, i: number) => (
                <tr
                  key={i}
                  id={`payment-row-desktop-${d.paymentNumber}`}
                  className={`text-end odd:bg-white even:bg-slate-50 dark:odd:bg-slate-900 dark:even:bg-slate-800/60 ${
                    d.balanceWAP === 0 ? 'text-slate-400 dark:text-slate-500' : ''
                  }`}
                >
                  <td className="px-3 py-2 text-center">{i + 1}</td>
                  <td className="px-3 py-2">{Dollar.format(d.monthlyPayment)}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <AdditionalPaymentCell
                        detail={d}
                        index={i}
                        onChange={onAdditionalPaymentChange}
                        clearAriaLabel={t.clearAdditionalPaymentAria}
                        inputClassName="w-28 rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </td>
                  {shownColumns.map(col => (
                    <td key={col.key} className="px-3 py-2">{Dollar.format(col.value(d))}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ul className="flex flex-col gap-3 md:hidden">
        {details.map((d: PaymentDetails, i: number) => (
          <li
            key={i}
            id={`payment-row-mobile-${d.paymentNumber}`}
            className={`rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm ${
              d.balanceWAP === 0 ? 'text-slate-400 dark:text-slate-500' : ''
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-3">
              <span className="font-semibold">{t.columns.paymentNumber}{i + 1}</span>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {Dollar.format(d.monthlyPayment)}
              </span>
            </div>

            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
              {shownColumns.map(col => (
                <div key={col.key}>
                  <dt className="text-xs text-slate-500 dark:text-slate-400">{col.mobileLabel}</dt>
                  <dd className="font-medium">{Dollar.format(col.value(d))}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <label className="text-xs text-slate-500 dark:text-slate-400 shrink-0">
                {t.columns.pagoAdicional}
              </label>
              <AdditionalPaymentCell
                detail={d}
                index={i}
                onChange={onAdditionalPaymentChange}
                clearAriaLabel={t.clearAdditionalPaymentAria}
                inputClassName="w-full sm:w-28 rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
});

PaymentsBreakdown.displayName = 'PaymentsBreakdown';
