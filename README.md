# Mortgage Calculator

A Next.js mortgage amortization calculator that lets you simulate the impact of additional payments on the total interest paid over the life of a loan. Inspired by an MS Excel Novarise calculator.

---

## Tech Stack

| Technology | Version |
|---|---|
| [Next.js](https://nextjs.org/) | 16.2.12 |
| React | 18.2.0 |
| TypeScript | 7.0.2 |
| Tailwind CSS | 3.3.3 |
| ESLint | 10.8.0 |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install dependencies

```bash
npm install
```

### Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for production

```bash
npm run build
npm start
```

### Lint

```bash
npm run lint
```

---

## Features

- **Mortgage payment calculator** — computes the monthly payment (PMT formula) from principal, interest rate, and loan term.
- **Full amortization table** — displays every payment broken down into interest, principal reduction, and remaining balance.
- **Side-by-side comparison** — each row shows both the *without additional payments* (NAP) and *with additional payments* (WAP) scenarios simultaneously.
- **Global additional payment** — set a single monthly extra payment that applies uniformly to all rows in the table.
- **Per-row additional payment** — override the additional payment for any individual month; the entire amortization recalculates instantly.
- **Clear button per row** — reset an individual row's additional payment back to zero with the ✕ button.
- **Interest savings summary** — shows total interest without additional payments, total interest with additional payments, and the resulting savings.

---

## Project Structure

```
financial-tools/
├── app/
│   ├── globals.css       # Tailwind base + custom styles (bgWhite, bgGrey, input-md)
│   ├── layout.tsx        # Root layout with Inter font and page metadata
│   └── page.tsx          # Main calculator component (all logic lives here)
├── eslint.config.mjs     # ESLint 9 flat config (replaces .eslintrc.json)
├── next.config.js        # Next.js config — enables useTypeScriptCli for TS 7
├── postcss.config.js     # PostCSS config for Tailwind
├── tailwind.config.ts    # Tailwind configuration
└── tsconfig.json         # TypeScript config (target: ES2017, bundler resolution)
```

---

## Configuration Notes

### TypeScript 7 + Next.js 16

TypeScript 7 removed the internal compiler API that Next.js historically used for type-checking. To keep TypeScript 7, `next.config.js` enables the CLI-based type checker:

```js
// next.config.js
const nextConfig = {
  experimental: {
    useTypeScriptCli: true,
  },
}
```

### ESLint 9 flat config

`eslint-config-next@16` requires ESLint ≥ 9, which uses a flat config format (`eslint.config.mjs`) instead of the legacy `.eslintrc.json`. The project uses `@eslint/eslintrc` for backward-compatible `extends` support:

```js
// eslint.config.mjs
import { FlatCompat } from "@eslint/eslintrc";
const compat = new FlatCompat({ baseDirectory: __dirname });
export default [...compat.extends("next/core-web-vitals")];
```

The old `.eslintrc.json` file can be safely deleted — ESLint 9 ignores it entirely.

### Feedback / Database Setup

The in-app "Feedback" button (`components/feedback-modal.tsx`) posts to `app/api/feedback/route.ts`, which stores submissions in a Neon Postgres database using `@neondatabase/serverless`. To enable it:

1. In the Vercel dashboard, open this project → **Storage** tab → create a Postgres database (Neon) and connect it to the project. This auto-injects `DATABASE_URL` and related env vars.
2. Run once via the dashboard's query editor:
   ```sql
   CREATE TABLE IF NOT EXISTS feedback (
     id SERIAL PRIMARY KEY,
     name VARCHAR(120) NOT NULL,
     email VARCHAR(254) NOT NULL,
     type VARCHAR(20) NOT NULL CHECK (type IN ('bug', 'improvement', 'other')),
     comment TEXT NOT NULL,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
     ip_hash VARCHAR(64)
   );

   CREATE INDEX IF NOT EXISTS feedback_created_at_idx ON feedback (created_at DESC);
   ```
3. Locally, run `vercel link` (if needed) then `vercel env pull .env.local` to pull the same vars — see `.env.local.example` for the expected variable names. No local Postgres install is needed; it's a serverless connection.
4. Review submissions directly via the Vercel Postgres dashboard's query console — there is no in-app admin view by design (the form itself requires no login).

### Accounts / Saved Calculations Setup

Signing in is optional; the calculator works anonymously. Accounts (email + password, and Google) let users save calculations.

1. Run `db/migrations/001_auth_and_saved_calculations.sql` once in the Neon SQL editor (creates `users`, `accounts`, `auth_tokens`, `saved_calculations`).
2. Add the auth variables from `.env.local.example` (`AUTH_SECRET`, `APP_URL`, `AUTH_GOOGLE_ID/SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`) locally and in Vercel.
3. Google: create an OAuth client and add `{APP_URL}/api/auth/callback/google` as an authorized redirect URI (local and production).
4. Resend: verify a sending domain and use it in `EMAIL_FROM`.
5. `MAX_SAVED_CALCULATIONS` (default 3) sets the per-user limit.

---

## Calculator Logic

Monthly payment is derived from the standard PMT formula:

$$PMT = \frac{P \cdot \frac{r}{n}}{1 - \left(1 + \frac{r}{n}\right)^{-nt}}$$

Where:
- `P` = principal (mortgage amount)
- `r` = annual interest rate (decimal)
- `n` = 12 (monthly compounding)
- `t` = loan term in years

Each amortization row computes, via `buildAmortizationSchedule` in `lib/mortgage.ts`:

```
interest = balance × (annualRate / 12) / 100        (0 once that scenario's balance has reached 0)
decrease = min(monthlyPayment [+ additionalPayment] - interest, balance)
remainingBalance = balance - decrease                (clamped to a minimum of 0)
```

Both the NAP (no additional payments) and WAP (with additional payments) scenarios are computed independently and share this same clamping: once a scenario's balance hits zero, later months accrue no further interest and stay at a zero balance instead of continuing to apply payments to a paid-off loan. This matters most for WAP, since large additional payments routinely pay a loan off well before its nominal term ends.

---

## Known Limitations

- Inputs accept any numeric string; no input masking or validation beyond `Number()` conversion.
- The final payment of each scenario isn't trued up to land on exactly `$0.00` — because the monthly payment is rounded to the cent, the last row can be off by a few cents (NAP) to a couple dollars (WAP) depending on term length. Cosmetic only; not surfaced in the summary cards.
- Network drive warning (`Slow filesystem detected`) is expected when the project lives on a network share; move to a local folder for better dev performance.

### Admin user

1. Run `db/migrations/003_admin_role.sql` once in the Neon SQL editor (adds `users.is_admin`).
2. Promote the single admin manually: `UPDATE users SET is_admin = true WHERE lower(email) = 'you@example.com';`
3. Sign out and back in; an **Admin** link appears in the account menu and opens `/admin` (user list, sign-in method, email status, hard delete). Admins can't be deleted from the UI.
