import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { DatabaseSync } from "node:sqlite";

const root = process.cwd();
const dbPath = process.env.RESERVASI_ONLINE_DB_PATH || path.join(root, "data", "reservasi-online.db");

function fail(message) {
  console.error(`Gagal: ${message}`);
  process.exit(1);
}

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  if (!fs.existsSync(dbPath)) {
    fail(`database tidak ditemukan di ${dbPath}. Jalankan npm run db:migrate.`);
  }

  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA busy_timeout = 5000;");
  try {
    const count = db.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'ADMIN'").get().count;
    if (Number(count) === 0) {
      console.log("Belum ada admin. Jalankan npm run setup.");
      return;
    }

    const confirm = process.env.CONFIRM?.trim() || await prompt("Hapus semua akun admin dan sesi? (ketik YES): ");
    if (confirm !== "YES") {
      fail("dibatalkan.");
    }

    db.prepare("DELETE FROM sessions").run();
    db.prepare("DELETE FROM admin_login_state").run();
    const result = db.prepare("DELETE FROM users WHERE role = 'ADMIN'").run();
    console.log(`Admin dihapus (${Number(result.changes)} akun). Setup ulang dengan npm run setup.`);
  } finally {
    db.close();
  }
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));