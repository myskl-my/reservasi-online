# Reservasi online

Reservasi online adalah aplikasi web reservasi dan manajemen antrean barbershop. Pelanggan dapat membuat reservasi tanpa akun, menerima kode booking, dan memantau status antrean. Admin mengelola kuota, reservasi, walk-in, data capster, pemanggilan antrean, dan laporan. Capster adalah data operasional tanpa akun atau akses login.

Antarmuka menggunakan Bahasa Indonesia dan seluruh tanggal operasional mengikuti zona `Asia/Jakarta`.

## Fitur

### Pelanggan (tanpa login)

- Beranda berupa dashboard ringkas antrean hari ini: jumlah aktif, kuota, sisa tempat, dan indikator kapasitas.
- Navigasi publik minimal: logo dan satu tombol **Reservasi**; tautan cek status tersedia di footer.
- Kalender reservasi 30 hari dengan status tersedia, hampir penuh, penuh, ditutup, dan online nonaktif.
- Alur reservasi tanpa akun: pilih tanggal, isi nama dan WhatsApp, konfirmasi, lalu terima kode booking.
- Kode booking unik berformat `CQ-XXXXXXXX`.
- Cek status dengan kode booking: nomor antrean, posisi, status, dan tanggal saja.
- Jumlah antrean dan status diperbarui otomatis melalui polling ringan tanpa memuat data pelanggan lain.

### Admin

- Dashboard operasional: kuota terpakai, layanan berlangsung, status antrean, dan reservasi terbaru.
- Reservasi: filter tanggal/status/kata kunci, check-in, panggil, mulai, selesaikan, batalkan, atau tandai tidak hadir.
- Walk-in: tambah pelanggan, panggil, mulai, selesaikan, batalkan, atau tandai tidak hadir.
- Pengaturan: aktif/nonaktif booking online, kuota default, kuota khusus per tanggal, tutup tanggal.
- Laporan: rekap online dan walk-in per hari (maksimal 31 hari).

## Teknologi

| Bagian | Teknologi |
| --- | --- |
| Framework | Next.js 16.4.4 (App Router, Server Components) |
| UI | React 19.2.0, Tailwind CSS 4.3.3 |
| Bahasa | TypeScript 5.9 |
| Validasi | Zod 4.3.3 |
| Database | SQLite lokal via `node:sqlite`; Cloudflare D1 (opsional) via adapter `DbClient` |
| Autentikasi | PIN admin PBKDF2-SHA256 (Web Crypto) + cookie sesi server |
| Pengujian | Node.js test runner + skrip integrasi HTTP |

Mode default adalah Node.js dengan database SQLite lokal. Deploy ke Cloudflare (Workers/Pages + D1) sudah dikonfigurasi via OpenNext/wrangler; konteks D1 hanya aktif bila `OPENNEXT_CLOUDFLARE_DEV=1` (dev) atau saat berjalan di Worker produksi.

## Menjalankan Secara Lokal

Prasyarat: Node.js 24 atau lebih baru (karena memakai modul bawaan `node:sqlite`) dan npm.

```powershell
npm install
Copy-Item .env.example .env.local
```

Buat token setup acak dan tempelkan sebagai `ADMIN_SETUP_TOKEN` di `.env.local`:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

Jalankan aplikasi:

```powershell
npm run dev
```

`npm run dev` menjalankan migrasi database terlebih dahulu, lalu Next.js di `http://localhost:3000`. Database default berada di `data/reservasi-online.db`.

Langkah pertama:

1. Buka `/setup`, masukkan token setup, nama, email, dan PIN admin (6–12 digit), lalu buat akun admin pertama.
2. Login di `/login` dengan PIN admin tersebut.
3. Atur kuota di menu **Pengaturan**.
4. Bagikan alamat publik kepada pelanggan.

Halaman `/setup` otomatis mengalihkan ke `/login` setelah admin pertama dibuat.

## Peran dan Akses

| Area | URL | Akses |
| --- | --- | --- |
| Publik | `/`, `/booking`, `/booking/status` | Tanpa login |
| Admin | `/admin`, `/admin/reservations`, `/admin/walk-ins`, `/admin/settings`, `/admin/reports` | Hanya akun `ADMIN` |
| Setup | `/setup` | Hanya sebelum admin pertama ada, wajib token |
| Login | `/login` | Hanya admin |

Tidak ada pendaftaran akun melalui halaman publik. Capster tidak memiliki akun, PIN, atau sesi login.

## Autentikasi dan Penguncian Login

- Login admin memakai PIN 6–12 digit. Verifikasi PIN hanya terjadi di server; browser tidak pernah menerima PIN asli maupun hash-nya.
- PIN disimpan sebagai hash PBKDF2-SHA256 (100.000 iterasi, salt acak 16 byte, Web Crypto) — format `$pbkdf2$…`, kompatibel Node.js maupun Cloudflare Workers.
- Maksimal 3 percobaan PIN salah per sumber permintaan (IP). Percobaan ketiga yang gagal mengunci sumber tersebut selama 15 menit.
- Penguncian **global** (seluruh admin) memakai ambang lebih tinggi (10 percobaan) agar pihak yang salah PIN tidak mudah mengunci login admin sepenuhnya (anti-DoS login).
- Penghitung percobaan disimpan di tabel `admin_login_state` pada database, bukan di memori server atau penyimpanan browser. Penguncian bertahan setelah restart server.
- Login yang berhasil mereset penghitung. Setelah 15 menit, percobaan baru dimulai dengan penghitung baru.
- Sesi memakai cookie `cq_session` (HttpOnly, SameSite=Lax, Secure pada HTTPS/produksi), berlaku 12 jam, dan dirotasi setiap login. Logout menghapus sesi di server.
- Halaman dan API admin selalu memeriksa sesi di server; status login di frontend bukan kontrol akses.
- Mengganti PIN hanya dapat dilakukan dari server lewat `npm run admin:pin`. Tidak ada endpoint HTTP publik untuk membuat akun admin atau mengganti PIN.

## Aturan Bisnis

- Reservasi hanya untuk tanggal, bukan jam tertentu. Nomor antrean bukan jaminan waktu layanan.
- Kuota dihitung dari reservasi berstatus `CONFIRMED`, `WAITING`, `CALLED`, dan `IN_SERVICE`.
- Status `COMPLETED`, `CANCELLED`, dan `NO_SHOW` tidak memakai kuota.
- Booking baru ditolak jika booking online nonaktif, tanggal ditutup, atau kuota aktif sudah penuh.
- Menurunkan kuota atau menutup tanggal tidak membatalkan reservasi lama. Booking baru ditolak sampai jumlah aktif berada di bawah kuota.
- Tanggal yang dapat dipesan pelanggan adalah hari ini sampai 29 hari ke depan (30 hari inklusif).
- Walk-in memakai nomor `W-` terpisah dan tidak mengurangi kuota reservasi online.
- Admin dapat memanggil reservasi online atau walk-in kapan saja; tidak ada prioritas walk-in.
- Admin dapat menangani beberapa pelanggan `CALLED` atau `IN_SERVICE` sekaligus.
- Check-in dan status tidak hadir hanya dapat dilakukan pada tanggal reservasi.

### Status

| Status | Arti | Memakai kuota |
| --- | --- | --- |
| `CONFIRMED` | Reservasi dikonfirmasi, belum check-in | Ya |
| `WAITING` | Sudah check-in, menunggu dipanggil | Ya |
| `CALLED` | Sedang dipanggil | Ya |
| `IN_SERVICE` | Sedang dilayani | Ya |
| `COMPLETED` | Layanan selesai | Tidak |
| `CANCELLED` | Dibatalkan | Tidak |
| `NO_SHOW` | Pelanggan tidak hadir | Tidak |

Walk-in menggunakan status yang sama kecuali `CONFIRMED`, dimulai dari `WAITING`.

Alur utama:

```text
CONFIRMED -> WAITING -> CALLED -> IN_SERVICE -> COMPLETED
```

`CANCELLED` dan `NO_SHOW` hanya dapat diterapkan sebelum layanan dimulai. Status `CHECKED_IN` tidak digunakan; check-in langsung mengubah status menjadi `WAITING`.

## Environment

| Variabel | Wajib | Keterangan |
| --- | --- | --- |
| `ADMIN_SETUP_TOKEN` | Ya, untuk setup awal | Token rahasia untuk membuat admin pertama |
| `RESERVASI_ONLINE_DB_PATH` | Tidak | Lokasi file SQLite; default `data/reservasi-online.db` |

Jangan commit `.env.local`. Token setup tidak boleh dibagikan. Setelah admin pertama dibuat, token tidak diperlukan lagi. PIN admin tidak disimpan di environment: atur lewat `npm run admin:pin` atau form setup awal.

## Perintah

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Migrasi database lalu jalankan server pengembangan |
| `npm run build` | Build produksi |
| `npm run start` | Jalankan hasil build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript tanpa emit |
| `npm run test:unit` | Unit test tanggal, telepon, kode booking, dan status ketersediaan |
| `npm run test:integration` | Uji API dan halaman secara end-to-end |
| `npm run db:migrate` | Terapkan migrasi yang belum dijalankan |
| `npm run db:reset` | Hapus database lokal lalu migrasi ulang |
| `npm run admin:pin` | Atur/reset PIN admin dari server; mendukung `-- --status` dan `-- --reset-lock` |
| `npm run admin:status` | Tampilkan status admin, PIN, sesi, dan penguncian login |
| `npm run setup` | Buat admin pertama dari CLI (token + email + PIN) |
| `npm run reset:admin` | Hapus akun admin, sesi, dan penguncian login |
| `npm run reset:pin` | Ganti PIN admin yang sudah ada |

Catatan: skrip dengan path `node node_modules/...` sengaja dipakai karena jalur folder proyek ini mengandung karakter `&`, yang merusak pemanggilan shim `.bin` pada Windows.

### Pengujian Integrasi

`npm run test:integration` melakukan hal berikut:

- Membuat database sementara `data/reservasi-online-integration.db`.
- Menjalankan migrasi.
- Menjalankan Next.js dev pada port acak.
- Menguji setup admin, login PIN, penguncian setelah 3 percobaan (termasuk restart server, percobaan bersamaan, dan penguncian kedaluwarsa), booking, kuota, walk-in, pemanggilan dan transisi oleh admin, laporan database, keamanan sesi, penghapusan route barber/capster, dan render seluruh halaman.
- Menghentikan server dan menghapus database sementara jika semua pemeriksaan lulus.

Hentikan server `npm run dev` lain terlebih dahulu karena Next.js dev memakai lock direktori `.next`.

## Struktur Proyek

```text
db/migrations/            Skema SQL dan migrasi
scripts/                  Migrasi, reset, CLI PIN admin, dan uji integrasi
src/app/                  Halaman dan route API Next.js
  (public)/               Halaman pelanggan
  admin/                  Halaman admin
  api/                    Route API
src/components/           Komponen UI, publik, admin, auth
src/lib/                  Tipe, tanggal, database, auth, validasi, data
src/lib/data/             Query dan aturan bisnis
tests/unit/               Unit test
data/reservasi-online.db          Database lokal (tidak di-commit)
```

## Penyimpanan Data dan Backup

- Data operasional (reservasi, walk-in, pengaturan, laporan, sesi, admin) disimpan di SQLite pada file `data/reservasi-online.db`.
- Lokasi dapat diubah dengan env `RESERVASI_ONLINE_DB_PATH`.
- Reset admin (`npm run reset:admin`) hanya menghapus akun admin, sesi, dan penguncian login; data reservasi/laporan tetap.
- `npm run db:reset` menghapus seluruh database dan menjalankan migrasi ulang.
- Backup rutin file `data/reservasi-online.db` beserta `-wal` dan `-shm` (jika ada).
- Untuk hosting/container, pastikan folder data berada di volume persisten dan jangan jalankan lebih dari satu instance ke file DB yang sama.
- Untuk multi-instance atau Cloudflare, gunakan database terpusat (D1/Postgres) melalui adapter `DbClient`.

## Deployment

Untuk saat ini aplikasi memerlukan host Node.js dengan penyimpanan persisten, misalnya VPS atau container. Pastikan:

1. Jalankan `npm run build` lalu `npm run start` di belakang HTTPS.
2. Isi `ADMIN_SETUP_TOKEN` hanya saat setup awal.
3. Sediakan disk persisten untuk file SQLite dan lakukan backup rutin.
4. Jangan menjalankan lebih dari satu instance aplikasi terhadap file SQLite yang sama tanpa strategi locking yang memadai.
5. Letakkan aplikasi di belakang proxy tepercaya yang menimpa `X-Forwarded-For`, dan atur PIN admin lewat `npm run admin:pin` bila akun admin sudah ada sebelum migrasi PIN.

Cloudflare (Pages + D1) sudah dikonfigurasi via OpenNext/wrangler (`wrangler.toml`, `wrangler.jsonc`, `open-next.config.ts`). Target deploy adalah **Cloudflare Pages** project `reservasionline`:

- `npm run deploy` — build OpenNext, merakit `pages-output`, lalu upload ke Pages. Ini perintah deploy utama.
- `npm run cf:build` — hanya build OpenNext ke `.open-next`.
- `npm run cf:pages` — hanya merakit `pages-output` dari hasil build.
- `npm run cf:deploy` — upload `pages-output` ke Pages (tanpa build).
- `npm run cf:migrate` — terapkan migrasi ke D1 remote (`db/migrations`).
- `OPENNEXT_CLOUDFLARE_DEV=1 npm run dev` mengaktifkan konteks D1 lokal bila diperlukan; default `npm run dev` tetap memakai SQLite.

Catatan teknis: npm scripts memanggil `node node_modules/...` secara langsung (bukan shim `.bin`) karena path project mengandung karakter `&` yang memecah shell Windows. `pages-output` bersifat generated (di-ignore git).

## Asumsi dan Batasan

- Satu barbershop, satu jenis layanan, tanpa pemilihan capster atau jam layanan.
- Tidak ada pembayaran, notifikasi WhatsApp/SMS, atau email.
- Penguncian login memakai penyimpanan SQLite bersama, tetapi durasinya tetap 15 menit dan tidak dapat diubah dari UI. Operator dapat menghapus penguncian dengan `npm run admin:pin -- --reset-lock`.
- Rate limit per sumber memakai `X-Forwarded-For`/`X-Real-IP`; jalankan di belakang proxy tepercaya agar header tidak dapat dipalsukan. Penguncian global tetap berlaku meskipun header dipalsukan.
- Belum ada audit log login dan pembersihan sesi terjadwal selain saat login.
- Daftar reservasi admin dibatasi 200 baris per tanggal; laporan dibatasi 31 hari.
- Nomor telepon internasional didukung untuk validasi, tetapi penyamaran nomor menyederhanakan kode negara.
- Pembaruan antrean memakai polling (20-30 detik), bukan push realtime; halaman perlu terbuka atau dibuka kembali untuk melihat perubahan.
- Detail keputusan teknis dan batasan lain ada di `IMPLEMENTATION.md`.
