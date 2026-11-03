import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { DatabaseSync } from "node:sqlite";
import { hashPin, isPbkdf2Hash } from "./lib/pin-hash.mjs";

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

function promptHidden(question) {
  if (!process.stdin.isTTY) {
    const rl = readline.createInterface({ input: process.stdin });
    return new Promise((resolve) => {
      rl.once("line", (line) => {
        rl.close();
        resolve(line.trim());
      });
    });
  }
  process.stdout.write(question);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf8");
  return new Promise((resolve, reject) => {
    let value = "";
    const cleanup = () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.off("data", onData);
    };
    const onData = (chunk) => {
      for (const char of chunk) {
        if (char === "\r" || char === "\n" || char === "\u0004") {
          cleanup();
          process.stdout.write("\n");
          resolve(value);
          return;
        }
        if (char === "\u0003") {
          cleanup();
          process.stdout.write("\n");
          reject(new Error("Dibatalkan."));
          return;
        }
        if (char === "\u007f" || char === "\b") {
          value = value.slice(0, -1);
          continue;
        }
        value += char;
      }
    };
    process.stdin.on("data", onData);
  });
}

async function main() {
  if (!fs.existsSync(dbPath)) {
    fail(`database tidak ditemukan di ${dbPath}. Jalankan npm run db:migrate.`);
  }

  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA busy_timeout = 5000;");
  try {
    const users = db.prepare("SELECT id, email FROM users WHERE role = 'ADMIN' ORDER BY created_at").all();
    if (users.length === 0) {
      fail("belum ada admin. Jalankan npm run setup.");
    }

    const targetEmail = (process.env.ADMIN_EMAIL?.trim() || await prompt(`Email admin (${users.map((u) => u.email).join(", ")}): `)).toLowerCase();
    const target = users.find((u) => String(u.email).toLowerCase() === targetEmail);
    if (!target) {
      fail(`admin dengan email ${targetEmail} tidak ditemukan.`);
    }

    const pin = process.env.ADMIN_PIN?.trim() || await promptHidden(`PIN baru untuk ${target.email} (6-12 digit): `);
    const confirmation = process.env.ADMIN_PIN ? pin : await promptHidden("Ulangi PIN baru: ");
    if (!process.env.ADMIN_PIN && pin !== confirmation) {
      fail("konfirmasi PIN tidak sama.");
    }
    if (!/^\d{6,12}$/.test(pin)) {
      fail("PIN harus 6-12 digit angka.");
    }

    const pinHash = await hashPin(pin);
    if (!isPbkdf2Hash(pinHash)) {
      fail("hash PIN tidak memakai PBKDF2.");
    }

    const now = new Date().toISOString();
    const result = db.prepare("UPDATE users SET pin_hash = ?, pin_updated_at = ?, updated_at = ? WHERE id = ?").run(pinHash, now, now, target.id);
    if (Number(result.changes) !== 1) {
      fail("PIN admin tidak dapat disimpan.");
    }

    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(target.id);
    db.prepare("DELETE FROM admin_login_state").run();
    console.log(`PIN admin untuk ${target.email} berhasil diperbarui.`);
    console.log("Semua sesi lama dihapus. Silakan login ulang di /login.");
  } finally {
    db.close();
  }
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));