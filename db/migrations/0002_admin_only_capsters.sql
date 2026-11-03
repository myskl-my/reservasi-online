CREATE TABLE users_new (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role = 'ADMIN'),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO users_new (id, email, name, password_hash, role, is_active, created_at, updated_at)
SELECT id, email, name, password_hash, role, is_active, created_at, updated_at
FROM users
WHERE role = 'ADMIN';

CREATE TABLE barbers_new (
  id TEXT PRIMARY KEY NOT NULL,
  display_name TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  is_walkin_handler INTEGER NOT NULL DEFAULT 0 CHECK (is_walkin_handler IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO barbers_new (id, display_name, is_active, is_walkin_handler, created_at, updated_at)
SELECT id, display_name, is_active, is_walkin_handler, created_at, updated_at
FROM barbers;

DELETE FROM sessions
WHERE user_id NOT IN (SELECT id FROM users_new);

DROP TABLE barbers;
ALTER TABLE barbers_new RENAME TO barbers;

DROP TABLE users;
ALTER TABLE users_new RENAME TO users;

CREATE UNIQUE INDEX idx_barbers_single_handler
  ON barbers(is_walkin_handler)
  WHERE is_walkin_handler = 1;

CREATE INDEX idx_barbers_is_active ON barbers(is_active);
