"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { ChevronDown, X } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Dollar,
  groupByYear,
  type PaymentDetails,
  type YearGroup,
} from "@/lib/mortgage";
import { useLanguage } from "@/lib/i18n";

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
  /** Expands the year holding the payment and scrolls its row into view. */
  revealPayment: (paymentNumber: number) => void;
}

/** Approximate height of the desktop table's sticky column header, used as a scroll offset. */
const DESKTOP_STICKY_HEADER_OFFSET = 44;

type ScrollTarget = { kind: "year" | "payment"; number: number };

function findVisibleElement(
  prefix: string,
  number: number,
): HTMLElement | null {
  for (const viewport of ["desktop", "mobile"]) {
    const el = document.getElementById(`${prefix}-${viewport}-${number}`);
    if (el && el.offsetParent !== null) return el;
  }
  return null;
}

function AdditionalPaymentDot({ label }: { label: string }) {
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className="inline-block h-2 w-2 shrink-0 rounded-full bg-indigo-500"
    />
  );
}

function YearJumpSelect({
  years,
  label,
  yearLabel,
  rangeLabel,
  onSelect,
  className,
}: {
  years: YearGroup[];
  label: string;
  yearLabel: string;
  rangeLabel: string;
  onSelect: (year: number) => void;
  className: string;
}) {
  return (
    <label
      className={`items-center gap-2 text-sm text-slate-700 dark:text-slate-300 ${className}`}
    >
      {label}
      <select
        value=""
        onChange={(e) => e.target.value && onSelect(Number(e.target.value))}
        className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option value="">—</option>
        {years.map((g) => (
          <option key={g.year} value={g.year}>
            {yearLabel} {g.year} ({rangeLabel} {g.firstPayment}–{g.lastPayment})
          </option>
        ))}
      </select>
    </label>
  );
}

const OPTIONAL_COLUMN_KEYS = [
  { key: "balanceNAP", value: (d: PaymentDetails) => d.balanceNAP },
  { key: "balanceWAP", value: (d: PaymentDetails) => d.balanceWAP },
  { key: "decreaseNAP", value: (d: PaymentDetails) => d.decreaseNAP },
  { key: "decreaseWAP", value: (d: PaymentDetails) => d.decreaseWAP },
  { key: "interestNAP", value: (d: PaymentDetails) => d.interestNAP },
  { key: "interestWAP", value: (d: PaymentDetails) => d.interestWAP },
  {
    key: "remainingBalanceNAP",
    value: (d: PaymentDetails) => d.remainingBalanceNAP,
  },
  {
    key: "remainingBalanceWAP",
    value: (d: PaymentDetails) => d.remainingBalanceWAP,
  },
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
      value={value ? value.toLocaleString("en-US") : ""}
      onChange={(e) => {
        const raw = e.target.value.replace(/,/g, "");
        if (raw !== "" && !/^\d+$/.test(raw)) return;
        onChange(raw === "" ? 0 : Number(raw), index);
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
    return (
      <span className="px-2 py-1 text-sm text-slate-400 dark:text-slate-500">
        {Dollar.format(0)}
      </span>
    );
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

export const PaymentsBreakdown = forwardRef<
  PaymentsBreakdownHandle,
  PaymentsBreakdownProps
>(function PaymentsBreakdown({ details, onAdditionalPaymentChange }, ref) {
  const { t, language } = useLanguage();
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(
    () =>
      Object.fromEntries(
        OPTIONAL_COLUMN_KEYS.map((c) => [
          c.key,
          c.key === "remainingBalanceNAP" ||
            c.key === "decreaseNAP" ||
            c.key === "interestNAP",
        ]),
      ),
  );
  const toggleColumn = (key: string) =>
    setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }));

  const groups = useMemo(() => groupByYear(details), [details]);

  // Mobile hides the paid-off tail (rows after the WAP payoff); desktop keeps every row.
  const { mobileGroups, paidOffAtPayment } = useMemo(() => {
    const active = groups
      .map((g) => ({
        ...g,
        payments: g.payments.filter((d) => d.balanceWAP > 0),
      }))
      .filter((g) => g.payments.length > 0);
    const activeCount = active.reduce((n, g) => n + g.payments.length, 0);
    return {
      mobileGroups: active,
      paidOffAtPayment:
        activeCount < details.length
          ? (active[active.length - 1]?.payments.at(-1)?.paymentNumber ?? null)
          : null,
    };
  }, [groups, details.length]);

  // Both viewports start collapsed (mobile opens year 1 only). They track expanded years so years
  // that appear later, when the term changes, also start collapsed.
  const [expandedDesktop, setExpandedDesktop] = useState<Set<number>>(
    () => new Set(),
  );
  const [expandedMobile, setExpandedMobile] = useState<Set<number>>(
    () => new Set([1]),
  );
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [scrollTarget, setScrollTarget] = useState<ScrollTarget | null>(null);
  const [stickyTop, setStickyTop] = useState(0);

  const toggleIn = (setter: typeof setExpandedMobile, year: number) =>
    setter((prev) => {
      const next = new Set(prev);
      if (!next.delete(year)) next.add(year);
      return next;
    });

  const expandYear = (year: number) => {
    setExpandedMobile((prev) => new Set(prev).add(year));
    setExpandedDesktop((prev) => new Set(prev).add(year));
  };

  useEffect(() => {
    if (!scrollTarget) return;
    const prefix = scrollTarget.kind === "year" ? "year-header" : "payment-row";
    findVisibleElement(prefix, scrollTarget.number)?.scrollIntoView({
      behavior: "smooth",
      block: scrollTarget.kind === "year" ? "start" : "center",
    });
    setScrollTarget(null);
  }, [scrollTarget]);

  // Year headers stick just below the page's own sticky header.
  useEffect(() => {
    const header = document.querySelector("header");
    if (!header) return;
    const observer = new ResizeObserver(() =>
      setStickyTop(header.getBoundingClientRect().height),
    );
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

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

  const OPTIONAL_COLUMNS = OPTIONAL_COLUMN_KEYS.map((c) => ({
    ...c,
    label: t.columns[c.key],
    mobileLabel: t.columnsMobile[c.key],
  }));
  const shownColumns = OPTIONAL_COLUMNS.filter((c) => visibleColumns[c.key]);

  const hasNAPColumn = shownColumns.some((c) => c.key.endsWith("NAP"));
  const hasWAPColumn = shownColumns.some((c) => c.key.endsWith("WAP"));
  const summaryWAP = hasWAPColumn && !hasNAPColumn;

  const yearSummary = (g: YearGroup) => {
    const parts = [
      `${t.endingBalanceLabel}: ${Dollar.format(summaryWAP ? g.endingBalanceWAP : g.endingBalanceNAP)}`,
    ];
    if (visibleColumns.interestNAP)
      parts.push(
        `${t.columnsMobile.interestNAP}: ${Dollar.format(g.interestNAP)}`,
      );
    if (visibleColumns.interestWAP)
      parts.push(
        `${t.columnsMobile.interestWAP}: ${Dollar.format(g.interestWAP)}`,
      );
    return parts.join(" · ");
  };

  useImperativeHandle(
    ref,
    () => ({
      revealPayment: (paymentNumber: number) => {
        expandYear(Math.ceil(paymentNumber / 12));
        setScrollTarget({ kind: "payment", number: paymentNumber });
      },
      downloadPdf: (summary: PdfSummary) => {
        const doc = new jsPDF({ orientation: "landscape" });
        const pageWidth = doc.internal.pageSize.getWidth();
        const marginX = 14;
        let y = 16;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text(t.appTitle, marginX, y);

        doc.setFont("helvetica", "italic");
        doc.setFontSize(9);
        doc.setTextColor(148, 163, 184);
        doc.text(t.appSubtitle, marginX, y + 5);
        doc.setTextColor(0, 0, 0);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        const generatedOn = new Date().toLocaleDateString(
          language === "es" ? "es-MX" : "en-US",
        );
        doc.text(`${t.generatedOnLabel}: ${generatedOn}`, marginX, y + 11);

        y += 18;

        const leftSummaryRows: [string, string][] = [
          [t.mortgageAmountLabel, Dollar.format(summary.mortgageAmount)],
          [t.interestRateLabel, `${summary.interestRate}%`],
          [t.mortgageLengthLabel, `${summary.mortgageLength} ${t.yearsUnit}`],
          [t.numberOfPaymentsLabel, String(summary.numberOfPayments)],
          [t.monthlyPaymentLabel, Dollar.format(summary.monthlyPayment)],
          [
            t.monthlyAdditionalPaymentLabel,
            Dollar.format(summary.monthlyAdditionalPayment),
          ],
        ];

        const rightSummaryRows: [string, string][] = [
          [
            t.fullInterestPaymentNAPLabel,
            Dollar.format(summary.fullInterestPaymentNAP),
          ],
          [
            t.fullInterestPaymentWAPLabel,
            Dollar.format(summary.fullInterestPaymentWAP),
          ],
          [
            t.fullInterestSavingsLabel,
            Dollar.format(summary.fullInterestSavings),
          ],
        ];

        const rightWidth = 90;
        const rightX = pageWidth - marginX - rightWidth;

        autoTable(doc, {
          startY: y,
          margin: { left: marginX, right: marginX },
          theme: "plain",
          tableWidth: 140,
          styles: { fontSize: 10, cellPadding: 1.2 },
          columnStyles: {
            0: { fontStyle: "bold", textColor: [71, 85, 105], cellWidth: 75 },
            1: { textColor: [15, 23, 42] },
          },
          body: leftSummaryRows,
        });

        const leftFinalY =
          (doc as unknown as { lastAutoTable?: { finalY: number } })
            .lastAutoTable?.finalY ?? y + leftSummaryRows.length * 6;

        autoTable(doc, {
          startY: y,
          margin: { left: rightX, right: marginX },
          theme: "plain",
          tableWidth: rightWidth,
          styles: { fontSize: 10, cellPadding: 1.2 },
          columnStyles: {
            0: { fontStyle: "bold", textColor: [71, 85, 105], cellWidth: 50 },
            1: { textColor: [15, 23, 42] },
          },
          body: rightSummaryRows,
        });

        const rightFinalY =
          (doc as unknown as { lastAutoTable?: { finalY: number } })
            .lastAutoTable?.finalY ?? y + rightSummaryRows.length * 6;

        const summaryFinalY = Math.max(leftFinalY, rightFinalY);

        const head = [
          [
            t.columns.paymentNumber,
            t.columns.letraHipotecaria,
            t.columns.pagoAdicional,
            ...shownColumns.map((col) => col.label),
          ],
        ];

        const body = details.map((d, i) => [
          String(i + 1),
          Dollar.format(d.monthlyPayment),
          Dollar.format(d.additionalPayment ?? 0),
          ...shownColumns.map((col) => Dollar.format(col.value(d))),
        ]);

        autoTable(doc, {
          head,
          body,
          startY: summaryFinalY + 8,
          margin: { left: marginX, right: marginX },
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [51, 65, 85], textColor: 255 },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: { 0: { halign: "center" } },
        });

        doc.save(
          `mortgage-amortization-${new Date().toISOString().slice(0, 10)}.pdf`,
        );
      },
    }),
    [details, shownColumns, t, language],
  );

  return (
    <div id="payments-breakdown">
      <div className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
        {t.selectColumnsLabel}
      </div>
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-3 text-sm">
        {OPTIONAL_COLUMNS.map((col) => (
          <label
            key={col.key}
            className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300"
          >
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

      <div className="mb-3">
        <YearJumpSelect
          years={groups}
          label={t.jumpToYearLabel}
          yearLabel={t.yearLabel}
          rangeLabel={t.paymentsRangeLabel}
          onSelect={(year) => {
            expandYear(year);
            setScrollTarget({ kind: "year", number: year });
          }}
          className="hidden md:flex"
        />
        <YearJumpSelect
          years={mobileGroups}
          label={t.jumpToYearLabel}
          yearLabel={t.yearLabel}
          rangeLabel={t.paymentsRangeLabel}
          onSelect={(year) => {
            expandYear(year);
            setScrollTarget({ kind: "year", number: year });
          }}
          className="flex md:hidden"
        />
      </div>

      <div className="hidden md:block">
        <div
          ref={topScrollRef}
          className="overflow-x-auto"
          onScroll={() => {
            if (bottomScrollRef.current && topScrollRef.current) {
              bottomScrollRef.current.scrollLeft =
                topScrollRef.current.scrollLeft;
            }
          }}
        >
          <div style={{ width: contentWidth, height: 1 }} />
        </div>
        <div
          ref={bottomScrollRef}
          className="max-h-[75vh] overflow-auto rounded-xl border border-slate-200 dark:border-slate-800"
          onScroll={() => {
            if (topScrollRef.current && bottomScrollRef.current) {
              topScrollRef.current.scrollLeft =
                bottomScrollRef.current.scrollLeft;
            }
          }}
        >
          <table ref={tableRef} className="w-full text-sm">
            <thead className="sticky top-0 z-[1] bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300">
              <tr className="text-end">
                <th className="px-3 py-2 text-center">
                  {t.columns.paymentNumber}
                </th>
                <th className="px-3 py-2">{t.columns.letraHipotecaria}</th>
                <th className="px-3 py-2">{t.columns.pagoAdicional}</th>
                {shownColumns.map((col) => (
                  <th key={col.key} className="px-3 py-2">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            {groups.map((g) => {
              const isOpen = expandedDesktop.has(g.year);
              return (
                <tbody key={g.year}>
                  <tr>
                    <td
                      colSpan={3 + shownColumns.length}
                      id={`year-header-desktop-${g.year}`}
                      style={{
                        scrollMarginTop:
                          stickyTop + DESKTOP_STICKY_HEADER_OFFSET,
                      }}
                      className="border-y border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 p-0"
                    >
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        onClick={() => toggleIn(setExpandedDesktop, g.year)}
                        className="flex w-full items-center gap-3 px-3 py-2 text-start font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500"
                      >
                        <ChevronDown
                          size={16}
                          className={`shrink-0 transition-transform ${isOpen ? "" : "-rotate-90"}`}
                        />
                        <span>
                          {t.yearLabel} {g.year}
                        </span>
                        <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                          {t.paymentsRangeLabel} {g.firstPayment}–
                          {g.lastPayment}
                        </span>
                        <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                          {yearSummary(g)}
                        </span>
                        {g.hasAdditionalPayment && (
                          <AdditionalPaymentDot
                            label={t.hasAdditionalPaymentAria}
                          />
                        )}
                      </button>
                    </td>
                  </tr>
                  {isOpen &&
                    g.payments.map((d: PaymentDetails) => (
                      <tr
                        key={d.paymentNumber}
                        id={`payment-row-desktop-${d.paymentNumber}`}
                        style={{
                          scrollMarginTop:
                            stickyTop + DESKTOP_STICKY_HEADER_OFFSET,
                        }}
                        className={`text-end odd:bg-white even:bg-slate-50 dark:odd:bg-slate-900 dark:even:bg-slate-800/60 ${
                          d.balanceWAP === 0
                            ? "text-slate-400 dark:text-slate-500"
                            : ""
                        }`}
                      >
                        <td className="px-3 py-2 text-center">
                          {d.paymentNumber}
                        </td>
                        <td className="px-3 py-2">
                          {Dollar.format(d.monthlyPayment)}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-end gap-1">
                            <AdditionalPaymentCell
                              detail={d}
                              index={d.paymentNumber - 1}
                              onChange={onAdditionalPaymentChange}
                              clearAriaLabel={t.clearAdditionalPaymentAria}
                              inputClassName="w-28 rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        </td>
                        {shownColumns.map((col) => (
                          <td key={col.key} className="px-3 py-2">
                            {Dollar.format(col.value(d))}
                          </td>
                        ))}
                      </tr>
                    ))}
                </tbody>
              );
            })}
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:hidden">
        {mobileGroups.map((g, groupIndex) => {
          const isOpen = expandedMobile.has(g.year);
          const isLastGroup = groupIndex === mobileGroups.length - 1;
          const [primary, ...secondary] = shownColumns;
          return (
            <section
              key={g.year}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
            >
              <button
                type="button"
                id={`year-header-mobile-${g.year}`}
                aria-expanded={isOpen}
                aria-controls={`year-panel-mobile-${g.year}`}
                onClick={() => toggleIn(setExpandedMobile, g.year)}
                style={{ top: stickyTop, scrollMarginTop: stickyTop }}
                className="sticky z-[5] flex w-full items-start gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-3 text-start focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 font-semibold">
                    <span>
                      {t.yearLabel} {g.year}
                    </span>
                    <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                      {t.paymentsRangeLabel} {g.firstPayment}–{g.lastPayment}
                    </span>
                    {g.hasAdditionalPayment && (
                      <AdditionalPaymentDot
                        label={t.hasAdditionalPaymentAria}
                      />
                    )}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {yearSummary(g)}
                  </div>
                </div>
                <ChevronDown
                  size={18}
                  className={`mt-0.5 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </button>

              {isOpen && (
                <ul
                  id={`year-panel-mobile-${g.year}`}
                  className="divide-y divide-slate-100 dark:divide-slate-800"
                >
                  {g.payments.map((d: PaymentDetails) => {
                    const rowOpen = expandedRow === d.paymentNumber;
                    return (
                      <li
                        key={d.paymentNumber}
                        id={`payment-row-mobile-${d.paymentNumber}`}
                        style={{ scrollMarginTop: stickyTop + 64 }}
                      >
                        <button
                          type="button"
                          aria-expanded={rowOpen}
                          onClick={() =>
                            setExpandedRow(rowOpen ? null : d.paymentNumber)
                          }
                          className="flex w-full items-center gap-3 px-4 py-3 text-start text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500"
                        >
                          <span className="min-w-[5.5rem] shrink-0 whitespace-nowrap font-semibold">
                            {t.columns.paymentNumber}
                            {d.paymentNumber}
                          </span>
                          <span className="flex-1 text-slate-500 dark:text-slate-400">
                            {Dollar.format(d.monthlyPayment)}
                          </span>
                          {d.additionalPayment ? (
                            <AdditionalPaymentDot
                              label={t.hasAdditionalPaymentAria}
                            />
                          ) : null}
                          {primary && (
                            <span className="font-medium">
                              {Dollar.format(primary.value(d))}
                            </span>
                          )}
                          <ChevronDown
                            size={16}
                            className={`shrink-0 text-slate-400 transition-transform ${rowOpen ? "rotate-180" : ""}`}
                          />
                        </button>

                        {rowOpen && (
                          <div className="px-4 pb-4">
                            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                              {primary && (
                                <div>
                                  <dt className="text-xs text-slate-500 dark:text-slate-400">
                                    {primary.mobileLabel}
                                  </dt>
                                  <dd className="font-medium">
                                    {Dollar.format(primary.value(d))}
                                  </dd>
                                </div>
                              )}
                              {secondary.map((col) => (
                                <div key={col.key}>
                                  <dt className="text-xs text-slate-500 dark:text-slate-400">
                                    {col.mobileLabel}
                                  </dt>
                                  <dd className="font-medium">
                                    {Dollar.format(col.value(d))}
                                  </dd>
                                </div>
                              ))}
                            </dl>

                            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                              <label className="text-xs text-slate-500 dark:text-slate-400 shrink-0">
                                {t.columns.pagoAdicional}
                              </label>
                              <AdditionalPaymentCell
                                detail={d}
                                index={d.paymentNumber - 1}
                                onChange={onAdditionalPaymentChange}
                                clearAriaLabel={t.clearAdditionalPaymentAria}
                                inputClassName="w-full sm:w-28 rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                  {isLastGroup && paidOffAtPayment !== null && (
                    <li className="px-4 py-3 text-sm text-slate-400 dark:text-slate-500">
                      {t.paidOffAtPaymentLabel} {paidOffAtPayment}
                    </li>
                  )}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
});

PaymentsBreakdown.displayName = "PaymentsBreakdown";
