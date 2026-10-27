-- Auth + saved calculations. Run once in the Neon SQL editor.
-- Safe to re-run (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name VARCHAR(80) NOT NULL,
  last_name VARCHAR(80) NOT NULL,
  email VARCHAR(254) NOT NULL,
  password_hash TEXT, -- NULL for Google-only users
  email_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Emails are stored lowercase; uniqueness is case-insensitive.
CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users (lower(email));

-- Linked third-party (Google) identities.
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(30) NOT NULL,
  provider_account_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_account_id)
);

CREATE INDEX IF NOT EXISTS accounts_user_id_idx ON accounts (user_id);

-- Email verification and password-reset tokens (only the SHA-256 hash is stored).
CREATE TABLE IF NOT EXISTS auth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('verify_email', 'reset_password')),
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auth_tokens_user_type_idx ON auth_tokens (user_id, type);

-- Saved calculations: inputs only; results are recomputed on load.
CREATE TABLE IF NOT EXISTS saved_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  mortgage_amount NUMERIC(14, 2) NOT NULL CHECK (mortgage_amount > 0),
  interest_rate NUMERIC(6, 3) NOT NULL CHECK (interest_rate >= 0),
  mortgage_length NUMERIC(5, 2) NOT NULL CHECK (mortgage_length > 0),
  monthly_additional_payment NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (monthly_additional_payment >= 0),
  additional_payments JSONB, -- per-month overrides, NULL if not customized
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS saved_calculations_user_idx ON saved_calculations (user_id, updated_at DESC);
