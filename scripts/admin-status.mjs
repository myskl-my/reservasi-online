import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const root = process.cwd();
const dbPath = process.env.RESERVASI_ONLINE_DB_PATH || path.join(root, "data", "reservasi-online.db");

function fail(message) {
  console.error(`Gagal: ${message}`);
  process.exit(1);
}

async function main() {
  if (!fs.existsSync(dbPath)) {
    fail(`database tidak ditemukan di ${dbPath}. Jalankan npm run db:migrate.`);
  }

  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA busy_timeout = 5000;");
  try {
    const users = db.prepare("SELECT email, pin_hash, is_active, created_at FROM users WHERE role = 'ADMIN' ORDER BY created_at").all();
    if (users.length === 0) {
      console.log("Belum ada admin.");
      return;
    }

    for (const user of users) {
      console.log(`Admin: ${user.email}`);
      console.log(`PIN: ${user.pin_hash ? "sudah diatur" : "BELUM diatur"}`);
      console.log(`Aktif: ${Number(user.is_active) === 1 ? "ya" : "tidak"}`);
      console.log(`Dibuat: ${user.created_at}`);
    }

    const sessionCount = db.prepare("SELECT COUNT(*) AS count FROM sessions").get().count;
    console.log(`Sesi aktif: ${Number(sessionCount)}`);

    const rows = db.prepare("SELECT scope, attempt_count, locked_until FROM admin_login_state ORDER BY scope").all();
    if (rows.length === 0) {
      console.log("Status login: belum ada percobaan tercatat.");
    } else {
      const now = new Date().toISOString();
      for (const row of rows) {
        const locked = row.locked_until && row.locked_until > now;
        console.log(`${row.scope}: percobaan=${row.attempt_count} ${locked ? `terkunci sampai ${row.locked_until}` : "tidak terkunci"}`);
      }
    }
  } finally {
    db.close();
  }
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));