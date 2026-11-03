import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dbPath = process.env.RESERVASI_ONLINE_DB_PATH || path.join(root, "data", "cutqueue.db");
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new DatabaseSync(dbPath);
db.exec("PRAGMA foreign_keys = OFF;");
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA busy_timeout = 5000;");
db.exec(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY NOT NULL,
    applied_at TEXT NOT NULL
  );
`);

const applied = new Set(
  db.prepare("SELECT version FROM schema_migrations").all().map((row) => row.version),
);

const migrationsDir = path.join(root, "db", "migrations");
const files = fs
  .readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".sql"))
  .sort();

for (const file of files) {
  if (applied.has(file)) continue;
  const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
  db.exec("BEGIN IMMEDIATE;");
  try {
    db.exec(sql);
    const violations = db.prepare("PRAGMA foreign_key_check").all();
    if (violations.length > 0) {
      throw new Error(
        `Migration ${file} violates foreign keys: ${JSON.stringify(violations)}`,
      );
    }
    db.prepare("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)").run(
      file,
      new Date().toISOString(),
    );
    db.exec("COMMIT;");
    console.log(`Applied migration: ${file}`);
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }
}

db.exec("PRAGMA foreign_keys = ON;");
db.close();
console.log(`Database ready: ${dbPath}`);
