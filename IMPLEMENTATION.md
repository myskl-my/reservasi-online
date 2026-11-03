# Implementasi CutQueue

Dokumen ini menjelaskan keputusan teknis, aturan bisnis, keamanan, pengujian, dan rencana deployment. Untuk cara menjalankan aplikasi, lihat `README.md`.

## 1. Ringkasan Arsitektur

- Next.js 16 App Router dengan React Server Components untuk hampir seluruh halaman.
- Route API berada di `src/app/api/**/route.ts` dan memakai runtime Node.js.
- Database SQLite lokal diakses melalui modul bawaan `node:sqlite`.
- Lapisan data dipisahkan dari route: `src/lib/data/*`.
- Akses database memakai antarmuka async `DbClient` di `src/lib/db.ts` sebagai titik penggantian menuju D1.
- UI memakai Tailwind CSS tanpa pustaka komponen eksternal.
- Validasi input server memakai Zod; validasi klien hanya untuk umpan balik.
- Bahasa UI adalah Bahasa Indonesia. Tidak ada sistem i18n.
- Halaman publik memakai data awal dari server, lalu memperbarui ketersediaan/status lewat polling ringan di klien. Tidak ada data reservasi lengkap yang dikirim untuk statistik publik.

Halaman publik dan admin semuanya dinamis (`force-dynamic`) karena data operasional berubah terus. Aplikasi hanya memiliki peran `ADMIN`; capster adalah data operasional tanpa akun.

## 2. Keputusan Teknis Utama

1. **Database lokal dahulu.** Cloudflare ditunda sesuai kebutuhan. SQLite memberi pengembangan tanpa layanan eksternal dan tanpa dependensi native.
2. **Adapter async.** Walaupun `node:sqlite` sinkron, seluruh pemanggilan dibungkus Promise agar penggantian ke D1 tidak mengubah lapisan data.
3. **Tanpa ORM.** Query SQL eksplisit agar constraint, transaksi, dan guard kuota/antrean mudah dibaca dan diuji.
4. **Autentikasi sendiri.** Login admin memakai PIN yang di-hash PBKDF2-SHA256 di server; sesi disimpan sebagai hash token di database dan cookie HttpOnly. Penghitung percobaan login disimpan di database agar tahan restart dan aman terhadap permintaan bersamaan.
5. **Satu tanggal, bukan slot jam.** Karena belum ada durasi layanan atau jadwal per capster, reservasi hanya memilih tanggal dan antrean diproses berurutan.
6. **Status eksplisit.** `CHECKED_IN` tidak dipakai; check-in langsung mengubah `CONFIRMED` menjadi `WAITING`.
7. **Guard di SQL.** Transisi status, kuota, dan satu pelanggan aktif per capster dijaga dengan kondisi `UPDATE ... WHERE` agar aman terhadap perubahan bersamaan.
8. **Waktu server.** Penyimpanan timestamp memakai ISO UTC. Tanggal bisnis dihitung dengan `Intl` pada zona `Asia/Jakarta`.

## 3. Skema Database

Migrasi: `db/migrations/0001_init.sql`, `db/migrations/0002_admin_only_capsters.sql`, dan `db/migrations/0003_remove_capsters.sql`.

| Tabel | Isi penting |
| --- | --- |
| `users` | Hanya akun `ADMIN`, email unik case-insensitive, hash PIN PBKDF2, status aktif |
| `sessions` | Hash token sesi admin, waktu kedaluwarsa |
| `admin_login_state` | Penghitung percobaan, penguncian 15 menit, dan rate limit per sumber login |
| `reservations` | Reservasi online, kode booking unik, nomor antrean per tanggal |
| `walk_ins` | Antrean walk-in, nomor per tanggal, phone opsional |
| `app_settings` | `online_booking_enabled`, `default_daily_quota` |
| `daily_settings` | Kuota khusus dan status tutup per tanggal |
| `reservations` | Reservasi online, kode booking unik, nomor antrean per tanggal |
| `walk_ins` | Antrean walk-in, nomor per tanggal, phone opsional |
| `schema_migrations` | Versi migrasi yang sudah diterapkan |

Constraint penting:

- `reservations.booking_code` unik.
- `UNIQUE (booking_date, queue_number)` dan `UNIQUE (walk_in_date, queue_number)`.
- `daily_settings.max_quota` dibatasi 1 sampai 500.
- Status dibatasi dengan `CHECK`.
- Foreign key aktif pada runtime (`PRAGMA foreign_keys = ON`). Selama migrasi, runner mematikan foreign key sementara lalu menjalankan `PRAGMA foreign_key_check` sebelum commit.
- Tidak ada tabel `barbers` atau kolom penugasan capster pada skema final.
- Mode WAL dan `busy_timeout` 5000 ms untuk konkurensi lokal.

## 4. Aturan Bisnis

### 4.1 Reservasi online

`createBooking` di `src/lib/data/reservations.ts`:

1. Menolak tanggal masa lalu.
2. Menolak tanggal di luar horizon 30 hari inklusif.
3. Mencoba `INSERT ... SELECT` atomik yang sekaligus memeriksa:
   - booking online aktif,
   - tanggal tidak ditutup,
   - jumlah reservasi aktif masih di bawah kuota efektif.
4. Nomor antrean dihitung dengan `MAX(queue_number) + 1` untuk tanggal tersebut.
5. Kode booking dibuat dari 8 byte acak dengan alfabet `A-Z` dan `2-7`.
6. Jika terjadi benturan unik (kode atau nomor antrean), percobaan diulang maksimal 3 kali.
7. Jika insert tidak menghasilkan baris, error dijelaskan lewat pemeriksaan status booking, tanggal, dan kuota.

Kuota efektif = `daily_settings.max_quota` jika ada, selain itu `app_settings.default_daily_quota`.

Status yang memakai kuota: `CONFIRMED`, `WAITING`, `CALLED`, `IN_SERVICE`.

Konsekuensi operasional:

- Menurunkan kuota di bawah jumlah aktif tidak membatalkan reservasi lama.
- Booking baru ditolak sampai jumlah aktif berada di bawah kuota.
- Menutup tanggal tidak mengubah reservasi lama.
- Booking selesai/batal/tidak hadir otomatis melepas slot.

### 4.2 Tanggal dan zona waktu

- `todayDateString()` menghitung tanggal `Asia/Jakarta`.
- Format tampilan memakai `Intl` dengan locale `id-ID`.
- Timestamp ISO UTC ditampilkan dalam WIB.
- Horizon booking adalah 30 hari termasuk hari ini.
- Laporan dibatasi maksimal 31 hari; rentang yang lebih panjang dipersingkat dari tanggal akhir.

### 4.3 Antrean dan pemanggilan

- Nomor online memakai `R-<queue_number>` pada UI; nomor walk-in memakai `W-<queue_number>`.
- Pemanggilan selalu mengambil status `WAITING` dengan nomor terkecil, lalu waktu pembuatan terlama.
- Satu capster hanya boleh punya satu pelanggan `CALLED` atau `IN_SERVICE`, dihitung gabungan dari `reservations` dan `walk_ins`.
- `callNextForAdmin(kind)` memanggil pelanggan `WAITING` dengan nomor terkecil.
- Admin dapat memanggil reservasi online atau walk-in kapan saja; tidak ada prioritas walk-in.
- Admin dapat menangani beberapa pelanggan `CALLED` atau `IN_SERVICE` sekaligus.
- Start layanan memerlukan status `CALLED`.
- Complete memerlukan status `IN_SERVICE`.
- Admin dapat menandai reservasi atau walk-in yang sudah dipanggil sebagai no-show.

### 4.4 Matriks transisi

| Aktor | Dari | Aksi | Ke |
| --- | --- | --- | --- |
| Admin | reservasi `CONFIRMED` (hari yang sama) | check-in | `WAITING` |
| Admin | reservasi `WAITING` | panggil online berikutnya | `CALLED` |
| Admin | reservasi `CALLED` (hari yang sama) | start | `IN_SERVICE` |
| Admin | reservasi `IN_SERVICE` | complete | `COMPLETED` |
| Admin | reservasi `CONFIRMED`/`WAITING`/`CALLED` | cancel | `CANCELLED` |
| Admin | reservasi `CONFIRMED`/`WAITING`/`CALLED` (hari yang sama) | no-show | `NO_SHOW` |
| Admin | walk-in `WAITING` | panggil walk-in berikutnya | `CALLED` |
| Admin | walk-in `CALLED` (hari yang sama) | start | `IN_SERVICE` |
| Admin | walk-in `IN_SERVICE` (hari yang sama) | complete | `COMPLETED` |
| Admin | walk-in `WAITING`/`CALLED` (hari yang sama) | cancel/no-show | `CANCELLED`/`NO_SHOW` |

Walk-in dibuat admin dan langsung berstatus `WAITING`. Walk-in tidak memiliki status `CONFIRMED`. Semua aksi transisi memerlukan sesi admin.

### 4.5 Antrean global

- Admin langsung memanggil dan memproses antrean.
- Tidak ada capster, handler walk-in, atau penugasan pelanggan.
- Pemanggilan online dan walk-in independen.
- Beberapa pelanggan dapat berstatus `CALLED` atau `IN_SERVICE` sekaligus.

## 5. Autentikasi dan Keamanan

### PIN admin

- PIN 6–12 digit; format divalidasi Zod di server.
- Hash PBKDF2-SHA256 (Web Crypto): 100.000 iterasi, salt acak 16 byte, output 32 byte.
- Format tersimpan berupa string `$pbkdf2$100000$<salt-base64>$<hash-base64>` — identik di aplikasi web (`src/lib/auth/pin.ts`) dan skrip CLI (`scripts/lib/pin-hash.mjs`).
- PBKDF2 dipilih agar berjalan di Node.js maupun Cloudflare Workers tanpa modul native.
- Verifikasi hanya di server; PIN asli dan hash-nya tidak pernah dikirim ke browser.
- `password_hash` lama dipertahankan demi integritas data, tetapi tidak lagi dipakai oleh alur login.

### Pembatasan percobaan login

- Tabel `admin_login_state` menyimpan `attempt_count`, `locked_until`, dan `updated_at` per `scope`.
- Dua cakupan: `global` (seluruh endpoint login) dan `source:<hash-ip>` (rate limit per sumber).
- Ambang terpisah: **3 percobaan per sumber** (mengunci sumber itu 15 menit) dan **10 percobaan global** (mengunci seluruh login 15 menit) — ambang global yang lebih tinggi mencegah satu pihak mengunci admin sepenuhnya (anti-DoS login) sementara tetap membatasi brute-force tersebar.
- Setiap permintaan memesan slot lewat satu statement `INSERT ... ON CONFLICT ... RETURNING` yang atomik sebelum PIN diverifikasi, sehingga permintaan bersamaan tidak dapat melewati batas.
- Saat hitungan mencapai ambang, `locked_until = now + 15 menit` dipasang. Selama terkunci, UPSERT tidak menghasilkan baris sehingga PIN yang benar pun ditolak pada cakupan tersebut.
- Setelah 15 menit, UPSERT memulai periode baru dengan hitungan 1.
- Login berhasil mereset seluruh penghitung dan penguncian.
- Respons terkunci: HTTP 429 `LOGIN_LOCKED` dengan pesan "Terlalu banyak percobaan. Silakan coba lagi dalam 15 menit." Pesan tidak mengungkap PIN, hash, atau detail internal.

### Sesi

- Token acak 32 byte (64 karakter hex).
- Yang disimpan di database hanya SHA-256 dari token.
- Masa berlaku 12 jam.
- Cookie `cq_session`: HttpOnly, SameSite=Lax, Path=/, Secure saat produksi.
- Setiap login merotasi token: sesi lama pada cookie yang sama dihapus.
- Login menghapus sesi kedaluwarsa.
- Logout menghapus sesi dan cookie.
- User nonaktif kehilangan akses karena query sesi memeriksa `users.is_active` dan `users.role = 'ADMIN'`.

### Bootstrap admin

- `/setup` hanya berfungsi sebelum admin pertama ada.
- Wajib `ADMIN_SETUP_TOKEN`; perbandingan waktu konstan.
- Setelah admin ada, setup mengembalikan konflik dan halaman mengalihkan ke login.
- Form setup membuat PIN admin (6–12 digit) dan menyimpannya sebagai hash; token tidak membuat sesi otomatis.
- Mengganti PIN hanya dapat dilakukan dari server lewat `npm run admin:pin`; tidak ada endpoint publik untuk membuat admin atau mengganti PIN.

### Kontrol akses

- Seluruh halaman admin dilindungi `requireAdminPage`.
- Seluruh API admin memakai `requireAdminApi`.
- Pengguna tanpa sesi admin diarahkan ke `/login` pada halaman dan mendapat 401 pada API.
- Mutasi JSON memeriksa `Origin` bila header tersedia (`assertSameOrigin`) dan mewajibkan `Content-Type: application/json`.
- Semua input divalidasi Zod di server; pesan error field dikembalikan ke UI.
- Nomor telepon publik disamarkan; nomor lengkap hanya tersedia untuk admin.

### Keterbatasan keamanan saat ini

- Penguncian login bersifat global dan per sumber, dengan durasi tetap 15 menit. Operator dapat menghapusnya lewat `npm run admin:pin -- --reset-lock`.
- Rate limit per sumber membaca `X-Forwarded-For`/`X-Real-IP`; header dapat dipalsukan bila aplikasi tidak berada di belakang proxy tepercaya. Penguncian global tetap menahan percobaan walau header dipalsukan.
- Tidak ada token CSRF terpisah; mitigasi mengandalkan SameSite=Lax, pemeriksaan Origin, dan method JSON.
- Belum ada audit log perubahan status.
- Secret setup harus dianggap sensitif; jangan tampilkan di log atau commit.

## 6. API

Format sukses:

```json
{ "ok": true, "data": {} }
```

Format gagal:

```json
{ "ok": false, "error": { "code": "CODE", "message": "...", "fields": {} } }
```

### Publik

| Method | Path | Fungsi |
| --- | --- | --- |
| GET | `/api/public/availability` | Ketersediaan 30 hari dan pengaturan kuota |
| POST | `/api/public/reservations` | Buat reservasi |
| GET | `/api/public/reservations/status?code=...` | Status reservasi berdasarkan kode |

### Auth dan setup

| Method | Path | Fungsi |
| --- | --- | --- |
| POST | `/api/setup` | Buat admin pertama dengan token setup |
| POST | `/api/auth/login` | Login admin |
| POST | `/api/auth/logout` | Hapus sesi |

### Admin

| Method | Path | Fungsi |
| --- | --- | --- |
| GET/PATCH | `/api/admin/settings` | Baca/ubah pengaturan global |
| PUT | `/api/admin/dates` | Atur kuota khusus atau tutup tanggal |
| POST | `/api/admin/queue/call` | Panggil online/walk-in berikutnya |
| POST | `/api/admin/reservations/[id]/transition` | Check-in/start/complete/cancel/no-show |
| POST | `/api/admin/walk-ins` | Tambah walk-in hari ini |
| POST | `/api/admin/walk-ins/[id]/transition` | Start/complete/cancel/no-show walk-in |

Kode error penting: `VALIDATION_ERROR`, `INVALID_CREDENTIALS`, `LOGIN_LOCKED`, `UNAUTHENTICATED`, `FORBIDDEN`, `FORBIDDEN_ORIGIN`, `INVALID_TRANSITION`, `INVALID_DATE`, `INVALID_CAPSTER`, `QUOTA_FULL`, `DATE_CLOSED`, `BOOKING_DISABLED`, `ACTIVE_ASSIGNMENT`, `WALKIN_PRIORITY`, `NOT_WALKIN_HANDLER`, `RESERVATION_NOT_FOUND`.

## 7. Halaman

| Area | Route |
| --- | --- |
| Publik | `/`, `/booking`, `/booking/status` |
| Auth | `/login`, `/setup` |
| Admin | `/admin`, `/admin/reservations`, `/admin/walk-ins`, `/admin/settings`, `/admin/reports` |

Komponen aksi admin mengirim POST/PATCH melalui `apiRequest`, menampilkan error, dan memanggil `router.refresh()`. Panel panggil antrean tersedia di dashboard serta halaman reservasi/walk-in untuk tanggal hari ini.

Form pengaturan tanggal dan kuota memakai komponen klien per baris; data awal dirender server. Halaman booking dan status juga menerima data awal dari server untuk menghindari efek pengambilan data saat mount.

### Design system

- Token warna, radius, dan bayangan didefinisikan di `@theme` pada `src/app/globals.css`: `canvas`, `surface`, `surface-muted`, `ink`, `ink-muted`, `line`, `accent`, serta token semantik `success`, `warning`, `danger`, `info`, dan `plum`.
- Komponen bersama (`Button`, `Card`, `Alert`, `Badge`, `StatCard`, `Input`) memakai token tersebut, sehingga tidak ada kelas palet Tailwind mentah di halaman.
- Radius: `rounded-card` untuk container dan `rounded-control` untuk tombol/input. Bayangan card sangat ringan; tidak ada gradient, animasi masuk, atau gambar dekoratif.
- Fokus keyboard memakai outline aksen 2px; kalender menampilkan status tanggal dengan kombinasi warna, titik/garis, teks, dan label `aria-label` (tidak bergantung pada warna saja).

UI pelanggan memakai pola minimal:

- Header publik hanya berisi logo dan tombol **Reservasi**; tautan status berada di footer.
- `/` menampilkan satu kartu monitoring hari ini (jumlah aktif, kuota, sisa, kapasitas) yang diperbarui otomatis.
- `/booking` memakai kalender `DateCalendar` dengan status tersedia/hampir penuh/penuh/tutup/online nonaktif, lalu wizard dua langkah (tanggal -> data) dan tampilan sukses ringkas.
- `/booking/status` hanya menampilkan nomor antrean, posisi, status, dan tanggal. Status aktif diperbarui otomatis; data pelanggan lain, nomor telepon, capster, dan riwayat waktu tidak ditampilkan.
- Polling memakai hook bersama `usePolling`; ambang "hampir penuh" adalah sisa <= 20% kuota (minimal 1 tempat) di `src/lib/availability.ts`.

## 8. Pengujian dan Verifikasi

Diverifikasi pada 2026-11-03 dengan Node.js 24.19.0.

| Pemeriksaan | Hasil |
| --- | --- |
| `npm run typecheck` | Lulus |
| `npm run lint` | Lulus tanpa error/warning |
| `npm run build` | Lulus, seluruh route terbentuk |
| `npm run test:unit` | 18 tes lulus |
| `npm run test:integration` | 157 pemeriksaan lulus |

Unit test mencakup:

- Batas tengah malam `Asia/Jakarta`.
- Aritmetika tanggal, leap year, rentang, dan validasi tanggal.
- Horizon booking.
- Normalisasi nomor telepon Indonesia dan internasional.
- Format, keunikan, dan validasi kode booking.
- Penyamaran nomor telepon.
- Status ketersediaan, ambang hampir penuh, dan persentase kapasitas.

Uji integrasi menjalankan server sendiri dengan database sementara dan mencakup:

- Setup token benar/salah, setup ganda, login PIN, penguncian setelah 3 percobaan, penolakan PIN benar saat terkunci, penguncian setelah restart, percobaan bersamaan, penguncian kedaluwarsa, dan penolakan akses anonim.
- Pemanggilan dan transisi antrean global oleh admin.
- Penolakan origin lintas situs.
- Validasi telepon, tanggal masa lalu, kode booking salah.
- Kuota penuh, pelepasan kuota setelah selesai/batal/no-show.
- Nomor antrean berurutan dan kode booking valid.
- Check-in, pemanggilan, mulai, selesai, tidak hadir oleh admin.
- Prioritas walk-in dan larangan non-handler.
- Tidak ada pembatasan jumlah pelanggan aktif.
- Kuota khusus, penutupan tanggal, dan penurunan kuota.
- Hash sesi, hash PIN PBKDF2, satu akun admin, dan ketiadaan token/PIN mentah di database.
- Tidak ada tabel `barbers`, route barber, atau route capster.
- Render seluruh halaman admin dan publik serta redirect login.

Database uji `data/reservasi-online-integration.db` dihapus setelah lulus; jika gagal, file disimpan untuk investigasi.

## 9. Batasan yang Diketahui

- Tidak ada notifikasi WhatsApp/SMS/email. Pelanggan harus membuka halaman status.
- Tidak ada pembayaran atau deposit.
- Tidak ada pemilihan capster, jenis layanan, durasi, atau slot jam.
- Walk-in hanya dapat ditambahkan untuk hari ini.
- Laporan hanya menghitung penyelesaian per capster; tidak ada metrik pendapatan.
- Daftar reservasi per tanggal dibatasi 200 baris.
- Laporan dibatasi 31 hari.
- Belum ada rate limiting, audit log, dan pembersihan sesi terjadwal selain saat login.
- Penyamaran nomor internasional menyederhanakan kode negara menjadi `+`.
- Pembaruan publik memakai polling (ketersediaan 30 detik, status aktif 20 detik), bukan push realtime.
- Belum ada pengujian browser otomatis (E2E klik UI); verifikasi halaman dilakukan lewat HTTP dan render server.
- SQLite hanya cocok untuk satu host; multi-instance memerlukan database terpusat.

## 10. Rencana Migrasi Cloudflare (Belum Diimplementasikan)

Sesuai arahan, Cloudflare ditunda. Langkah yang diperlukan:

1. Buat D1 dan terapkan skema yang kompatibel. PRAGMA `journal_mode`, `busy_timeout`, dan `synchronous` khusus SQLite lokal tidak dipakai di D1.
2. Ganti implementasi `src/lib/db.ts` dengan adapter D1 yang tetap memenuhi `DbClient` (`all`, `get`, `run`, `batch`).
3. Pastikan `batch` memakai transaksi D1 dan hasil `changes` dipetakan dengan benar.
4. Gunakan OpenNext untuk Cloudflare (`@opennextjs/cloudflare`) dan `wrangler`.
5. Hapus ketergantungan `node:sqlite` dan `node:fs` dari jalur runtime; migrasi dijalankan lewat `wrangler d1 migrations`.
6. Simpan `ADMIN_SETUP_TOKEN` sebagai secret Worker; aktifkan cookie Secure.
7. Sesuaikan pengujian integrasi agar berjalan terhadap D1 atau lingkungan Cloudflare.
8. Pertimbangkan Cron Trigger untuk membersihkan sesi kedaluwarsa dan audit log.

## 11. Checklist QA Manual

1. Jalankan `npm run dev`, buka `/`, pastikan kartu monitoring hari ini (aktif, kuota, sisa, kapasitas) tampil.
2. Buka `/booking`, pastikan kalender menampilkan status tanggal, lalu buat reservasi dan salin kode.
3. Buka status dari tombol sukses; pastikan hanya nomor antrean, posisi, status, dan tanggal yang tampil.
4. Login admin, check-in reservasi, lalu panggil pelanggan.
5. Mulai dan selesaikan layanan; pastikan slot kuota kembali.
6. Tambah walk-in sebagai admin; pastikan hanya petugas walk-in yang dapat dipanggil untuk walk-in.
7. Tugaskan walk-in saat ada layanan aktif; pastikan penonaktifan handler aman.
8. Tutup tanggal besok dan pastikan booking tanggal tersebut ditolak.
9. Turunkan kuota hari ini di bawah jumlah aktif; pastikan booking baru ditolak tanpa membatalkan yang lama.
10. Panggil beberapa pelanggan sekaligus dan pastikan semua tetap aktif.
11. Cek laporan setelah beberapa status selesai/batal/no-show.
12. Pastikan pengguna anonim diarahkan dari `/admin` ke `/login`, sedangkan `/barber` dan `/admin/barbers` mengembalikan 404.
13. Pastikan tidak ada tautan navigasi atau halaman tersisa untuk akun barber.
14. Masukkan PIN salah tiga kali; pastikan percobaan ketiga mengunci 15 menit dan PIN benar tetap ditolak.
15. Muat ulang halaman, ganti cookie, dan buka browser lain; pastikan penguncian tetap berlaku.
16. Setelah penguncian berakhir, login dengan PIN benar; pastikan berhasil dan penghitung kembali nol.
17. Jalankan `npm run admin:pin -- --status`; pastikan status PIN dan penguncian terbaca tanpa menampilkan hash.
