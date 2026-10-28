# Payments breakdown: year grouping and compact mobile view

## Problem

On mobile, the breakdown renders one tall card per payment (about 360 for a 30-year loan). Users lose their place while scrolling and have no sense of position. The primary job of this view is scanning and comparing the schedule, not editing it row by row.

## Shared model (mobile and desktop)

- Group payments into **loan years**: payments 1-12 are Year 1, 13-24 are Year 2, and so on. The last year may be partial (for example "Payments 349-360"). No calendar dates.
- Grouping and yearly totals live in a pure function in `lib/mortgage` (for example `groupByYear(details)`), unit-tested and shared by both views.
- Year headers are real buttons with `aria-expanded` and `aria-controls`. Each shows:
  - the year number and payment range
  - the ending balance
  - the interest total, only when an interest column is toggled on
  - a marker if any month in the year has an additional payment
- A "Jump to year" select (near the column toggles) expands the chosen year and scrolls to it.
- The payoff jump button keeps the `payment-row-desktop-*` / `payment-row-mobile-*` IDs. When its target is in a collapsed year, the year expands first, then it scrolls.
- Expansion state lives in component state and survives edits to additional payments.
- All new strings go through `t` in both English and Spanish.

## Mobile

- Year headers are sticky.
- Only year 1 is expanded on load.
- Compact rows show payment number, monthly payment, and the first selected metric (remaining balance by default). A small indigo dot marks rows with an additional payment.
- Tapping a row expands it inline (one at a time) to show the other toggled columns and the additional-payment input.
- Paid-off rows collapse into a single "Paid off at payment N" line.

## Desktop

- Keep the existing table and top scrollbar.
- Add collapsible year-group rows, a sticky column header, and the jump-to-year select.
- All years are expanded by default.
- No compact rows, inline-expand editing, or paid-off collapse.

## Unchanged

- PDF export stays a flat, full table regardless of on-screen collapse state.

## Delivery

One branch, in this order:

1. This spec.
2. Grouping logic with tests first (TDD).
3. Mobile UI.
4. Desktop additions.

Implementation does not start until explicitly requested.
