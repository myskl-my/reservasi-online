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

function constantTimeEqual(left, right) {
  if (typeof left !== "string" || typeof right !== "string") return false;
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  const length = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < length; i += 1) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return diff === 0;
}

async function main() {
  if (!fs.existsSync(dbPath)) {
    fail(`database tidak ditemukan di ${dbPath}. Jalankan npm run db:migrate.`);
  }

  const expectedToken = process.env.ADMIN_SETUP_TOKEN;
  if (!expectedToken) {
    fail("ADMIN_SETUP_TOKEN belum diatur.");
  }

  const token = process.env.SETUP_TOKEN?.trim() || await prompt("Token setup: ");
  if (!constantTimeEqual(token, expectedToken)) {
    fail("token setup tidak valid.");
  }

  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA busy_timeout = 5000;");
  try {
    const count = db.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'ADMIN'").get().count;
    if (Number(count) > 0) {
      fail("admin sudah ada. Gunakan npm run reset:admin untuk membuat ulang.");
    }

    const email = (process.env.ADMIN_EMAIL?.trim() || await prompt("Email admin: ")).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      fail("format email tidak valid.");
    }

    const pin = process.env.ADMIN_PIN?.trim() || await promptHidden("PIN admin (6-12 digit): ");
    const confirmation = process.env.ADMIN_PIN ? pin : await promptHidden("Ulangi PIN admin: ");
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
    const id = crypto.randomUUID();
    const result = db.prepare(`
      INSERT INTO users (
        id, email, name, password_hash, pin_hash, pin_updated_at,
        role, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, '!pin-auth-only', ?, ?, 'ADMIN', 1, ?, ?)
    `).run(id, email, email, pinHash, now, now, now);

    if (Number(result.changes) !== 1) {
      fail("admin tidak dapat dibuat.");
    }

    console.log(`Admin ${email} berhasil dibuat.`);
    console.log("Silakan login di /login.");
  } finally {
    db.close();
  }
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));