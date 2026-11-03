import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const dbPath = process.env.RESERVASI_ONLINE_DB_PATH || path.join(root, "data", "reservasi-online.db");

for (const suffix of ["", "-wal", "-shm"]) {
  const file = dbPath + suffix;
  if (fs.existsSync(file)) {
    fs.rmSync(file);
    console.log(`Removed ${file}`);
  }
}

const result = spawnSync(process.execPath, [path.join(root, "scripts", "db-migrate.mjs")], {
  stdio: "inherit",
  env: process.env,
});
process.exit(result.status ?? 1);
