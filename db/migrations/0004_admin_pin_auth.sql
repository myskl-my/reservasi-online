-- Autentikasi admin berbasis PIN.
-- `password_hash` lama dipertahankan agar data akun yang sudah ada tidak hilang,
-- tetapi tidak dipakai lagi oleh alur login.

ALTER TABLE users ADD COLUMN pin_hash TEXT;
ALTER TABLE users ADD COLUMN pin_updated_at TEXT;

-- Status percobaan login admin. Satu baris per cakupan:
--   'global'            -> penguncian global untuk seluruh endpoint login admin
--   'source:<hash-ip>'  -> rate limit per sumber permintaan
-- Nilai waktu memakai ISO UTC agar dapat dibandingkan secara leksikografis.
CREATE TABLE admin_login_state (
  scope TEXT PRIMARY KEY NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  locked_until TEXT,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_admin_login_state_locked_until
  ON admin_login_state(locked_until);
