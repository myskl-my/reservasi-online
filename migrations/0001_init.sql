
CREATE TABLE users (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'BARBER')),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

CREATE TABLE barbers (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  is_walkin_handler INTEGER NOT NULL DEFAULT 0 CHECK (is_walkin_handler IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX idx_barbers_single_handler
  ON barbers(is_walkin_handler)
  WHERE is_walkin_handler = 1;

CREATE INDEX idx_barbers_is_active ON barbers(is_active);

CREATE TABLE app_settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO app_settings (key, value, updated_at)
VALUES
  ('online_booking_enabled', 'true', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('default_daily_quota', '20', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

CREATE TABLE daily_settings (
  booking_date TEXT PRIMARY KEY NOT NULL,
  max_quota INTEGER CHECK (max_quota IS NULL OR (max_quota >= 1 AND max_quota <= 500)),
  is_closed INTEGER NOT NULL DEFAULT 0 CHECK (is_closed IN (0, 1)),
  updated_at TEXT NOT NULL
);

CREATE TABLE reservations (
  id TEXT PRIMARY KEY NOT NULL,
  booking_code TEXT NOT NULL UNIQUE,
  queue_number INTEGER NOT NULL CHECK (queue_number > 0),
  booking_date TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  status TEXT NOT NULL CHECK (
    status IN ('CONFIRMED', 'WAITING', 'CALLED', 'IN_SERVICE', 'COMPLETED', 'CANCELLED', 'NO_SHOW')
  ),
  assigned_barber_id TEXT REFERENCES barbers(id) ON DELETE SET NULL,
  checked_in_at TEXT,
  called_at TEXT,
  started_at TEXT,
  completed_at TEXT,
  cancelled_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (booking_date, queue_number)
);

CREATE INDEX idx_reservations_date_status ON reservations(booking_date, status);
CREATE INDEX idx_reservations_date_queue ON reservations(booking_date, queue_number);
CREATE INDEX idx_reservations_barber_status ON reservations(assigned_barber_id, status);
CREATE INDEX idx_reservations_phone ON reservations(customer_phone);

CREATE TABLE walk_ins (
  id TEXT PRIMARY KEY NOT NULL,
  walk_in_date TEXT NOT NULL,
  queue_number INTEGER NOT NULL CHECK (queue_number > 0),
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  status TEXT NOT NULL CHECK (
    status IN ('WAITING', 'CALLED', 'IN_SERVICE', 'COMPLETED', 'CANCELLED', 'NO_SHOW')
  ),
  assigned_barber_id TEXT REFERENCES barbers(id) ON DELETE SET NULL,
  called_at TEXT,
  started_at TEXT,
  completed_at TEXT,
  cancelled_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (walk_in_date, queue_number)
);

CREATE INDEX idx_walk_ins_date_status ON walk_ins(walk_in_date, status);
CREATE INDEX idx_walk_ins_date_queue ON walk_ins(walk_in_date, queue_number);
CREATE INDEX idx_walk_ins_barber_status ON walk_ins(assigned_barber_id, status);
