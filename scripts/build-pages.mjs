/**
 * Merakit folder `pages-output` untuk Cloudflare Pages dari hasil build OpenNext.
 *
 * OpenNext menghasilkan bundle di `.open-next/`, sedangkan Cloudflare Pages
 * (advanced mode) mengharapkan `_worker.js` di root output. Script ini
 * menggabungkan aset statis Next (`_next`, `BUILD_ID`, `_headers`) dengan
 * bundle worker OpenNext agar `wrangler pages deploy` bisa langsung dipakai.
 *
 * Jalankan setelah `opennextjs-cloudflare build`.
 */
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const openNext = join(root, ".open-next");
const output = join(root, "pages-output");

if (!existsSync(join(openNext, "worker.js"))) {
  console.error(
    "Build OpenNext tidak ditemukan di .open-next/. Jalankan `npm run cf:build` lebih dulu.",
  );
  process.exit(1);
}

console.log("Merakit pages-output dari .open-next ...");

rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });

for (const entry of [".build", "cloudflare", "middleware", "server-functions"]) {
  const from = join(openNext, entry);
  if (existsSync(from)) {
    cpSync(from, join(output, entry), { recursive: true });
  }
}

const assets = join(openNext, "assets");
if (!existsSync(assets)) {
  console.error("Aset statis (.open-next/assets) tidak ditemukan.");
  process.exit(1);
}
cpSync(assets, output, { recursive: true });

cpSync(join(openNext, "worker.js"), join(output, "_worker.js"));

writeFileSync(
  join(output, "_routes.json"),
  `${JSON.stringify(
    {
      version: 1,
      include: ["/*"],
      exclude: ["/_next/static/*", "/favicon.ico", "/BUILD_ID", "/_headers"],
    },
    null,
    2,
  )}\n`,
);

console.log("pages-output siap: _worker.js, _routes.json, _next, server-functions.");
