CREATE TABLE reservations_new (
  id TEXT PRIMARY KEY NOT NULL,
  booking_code TEXT NOT NULL UNIQUE,
  queue_number INTEGER NOT NULL CHECK (queue_number > 0),
  booking_date TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  status TEXT NOT NULL CHECK (
    status IN ('CONFIRMED', 'WAITING', 'CALLED', 'IN_SERVICE', 'COMPLETED', 'CANCELLED', 'NO_SHOW')
  ),
  checked_in_at TEXT,
  called_at TEXT,
  started_at TEXT,
  completed_at TEXT,
  cancelled_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (booking_date, queue_number)
);

INSERT INTO reservations_new (
  id, booking_code, queue_number, booking_date, customer_name, customer_phone,
  status, checked_in_at, called_at, started_at, completed_at, cancelled_at,
  created_at, updated_at
)
SELECT
  id, booking_code, queue_number, booking_date, customer_name, customer_phone,
  status, checked_in_at, called_at, started_at, completed_at, cancelled_at,
  created_at, updated_at
FROM reservations;

DROP TABLE reservations;
ALTER TABLE reservations_new RENAME TO reservations;

CREATE INDEX idx_reservations_date_status ON reservations(booking_date, status);
CREATE INDEX idx_reservations_date_queue ON reservations(booking_date, queue_number);
CREATE INDEX idx_reservations_phone ON reservations(customer_phone);

CREATE TABLE walk_ins_new (
  id TEXT PRIMARY KEY NOT NULL,
  walk_in_date TEXT NOT NULL,
  queue_number INTEGER NOT NULL CHECK (queue_number > 0),
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  status TEXT NOT NULL CHECK (
    status IN ('WAITING', 'CALLED', 'IN_SERVICE', 'COMPLETED', 'CANCELLED', 'NO_SHOW')
  ),
  called_at TEXT,
  started_at TEXT,
  completed_at TEXT,
  cancelled_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (walk_in_date, queue_number)
);

INSERT INTO walk_ins_new (
  id, walk_in_date, queue_number, customer_name, customer_phone, status,
  called_at, started_at, completed_at, cancelled_at, created_at, updated_at
)
SELECT
  id, walk_in_date, queue_number, customer_name, customer_phone, status,
  called_at, started_at, completed_at, cancelled_at, created_at, updated_at
FROM walk_ins;

DROP TABLE walk_ins;
ALTER TABLE walk_ins_new RENAME TO walk_ins;

CREATE INDEX idx_walk_ins_date_status ON walk_ins(walk_in_date, status);
CREATE INDEX idx_walk_ins_date_queue ON walk_ins(walk_in_date, queue_number);

DROP TABLE barbers;
