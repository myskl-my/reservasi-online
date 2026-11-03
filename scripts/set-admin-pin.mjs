/**
 * Alat operator untuk mengatur atau mereset PIN admin.
 *
 * Tidak ada endpoint HTTP untuk mengganti PIN. Perubahan hanya dapat dilakukan
 * dari server (akses shell/berkas database) memakai skrip ini.
 *
 * Pemakaian:
 *   npm run admin:pin                    # isi/reset PIN admin (prompt)
 *   npm run admin:pin -- --status        # lihat status PIN dan penguncian
 *   npm run admin:pin -- --reset-lock    # hapus penguncian login
 *   ADMIN_PIN=123456 npm run admin:pin   # tanpa prompt (hindari shell history)
 */
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { DatabaseSync } from "node:sqlite";
import { hash } from "@node-rs/argon2";

const PIN_PATTERN = /^\d{6,12}$/;
const ARGON2_OPTIONS = {
  algorithm: 2, // Algorithm.Argon2id
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
};

const root = process.cwd();
const dbPath = process.env.RESERVASI_ONLINE_DB_PATH || path.join(root, "data", "cutqueue.db");

function parseArgs(argv) {
  const args = { email: null, resetLock: false, status: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--reset-lock") args.resetLock = true;
    else if (arg === "--status") args.status = true;
    else if (arg === "--email") args.email = argv[index + 1] ?? null;
    else if (arg.startsWith("--email=")) args.email = arg.slice("--email=".length);
  }
  return args;
}

function fail(message) {
  console.error(`Gagal: ${message}`);
  process.exit(1);
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
        if (/^\d$/.test(char)) {
          value += char;
        } else {
          process.stdout.write("\u0007");
        }
      }
    };
    process.stdin.on("data", onData);
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!fs.existsSync(dbPath)) {
    fail(`database tidak ditemukan di ${dbPath}. Jalankan npm run db:migrate.`);
  }

  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA busy_timeout = 5000;");

  try {
    const columns = db.prepare("PRAGMA table_info(users)").all();
    if (!columns.some((column) => column.name === "pin_hash")) {
      fail("kolom pin_hash belum ada. Jalankan npm run db:migrate terlebih dahulu.");
    }

    const users = db
      .prepare(
        "SELECT id, email, name, pin_hash FROM users WHERE role = 'ADMIN' ORDER BY created_at",
      )
      .all();
    if (users.length === 0) {
      fail("belum ada akun admin. Buat admin lewat /setup.");
    }

    if (args.status) {
      for (const user of users) {
        console.log(
          `Admin ${user.email}: PIN ${user.pin_hash ? "sudah diatur" : "BELUM diatur"}`,
        );
      }
      const rows = db
        .prepare(
          "SELECT scope, attempt_count, locked_until FROM admin_login_state ORDER BY scope",
        )
        .all();
      if (rows.length === 0) {
        console.log("Status login: belum ada percobaan tercatat.");
      } else {
        const now = new Date().toISOString();
        for (const row of rows) {
          const locked = row.locked_until && row.locked_until > now;
          console.log(
            `${row.scope}: percobaan=${row.attempt_count} ${
              locked ? `terkunci sampai ${row.locked_until}` : "tidak terkunci"
            }`,
          );
        }
      }
      return;
    }

    if (args.resetLock) {
      const result = db.prepare("DELETE FROM admin_login_state").run();
      console.log(`Penguncian login dihapus (${Number(result.changes)} baris).`);
    }

    const target = args.email
      ? users.find(
          (user) =>
            String(user.email).toLowerCase() === String(args.email).toLowerCase(),
        )
      : users[0];

    if (!target) {
      fail(`admin dengan email ${args.email} tidak ditemukan.`);
    }

    let pin = process.env.ADMIN_PIN?.trim();
    if (!pin) {
      pin = await promptHidden(`PIN baru untuk ${target.email} (6-12 digit): `);
      const confirmation = await promptHidden("Ulangi PIN baru: ");
      if (pin !== confirmation) {
        fail("konfirmasi PIN tidak sama.");
      }
    }

    if (!PIN_PATTERN.test(pin)) {
      fail("PIN harus 6-12 digit angka.");
    }

    const pinHash = await hash(pin, ARGON2_OPTIONS);
    const now = new Date().toISOString();
    const result = db
      .prepare(
        "UPDATE users SET pin_hash = ?, pin_updated_at = ?, updated_at = ? WHERE id = ?",
      )
      .run(pinHash, now, now, target.id);

    if (Number(result.changes) !== 1) {
      fail("PIN admin tidak dapat disimpan.");
    }

    // Ganti PIN berarti sesi lama dan penguncian lama tidak relevan lagi.
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(target.id);
    db.prepare("DELETE FROM admin_login_state").run();

    console.log(`PIN admin untuk ${target.email} berhasil diperbarui.`);
    console.log("Semua sesi lama dihapus. Silakan login ulang di /login.");
  } finally {
    db.close();
  }
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
