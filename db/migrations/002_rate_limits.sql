-- Sliding-window rate limit hits for auth endpoints. Run once in the Neon SQL editor.
CREATE TABLE IF NOT EXISTS rate_limits (
  id BIGSERIAL PRIMARY KEY,
  key VARCHAR(160) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rate_limits_key_created_idx ON rate_limits (key, created_at DESC);
