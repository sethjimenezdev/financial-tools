-- Admin flag for the user-management page. Run once in the Neon SQL editor.
-- Safe to re-run.
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- There is no in-app way to become an admin. Promote the single admin manually:
-- UPDATE users SET is_admin = true WHERE lower(email) = 'admin@example.com';
