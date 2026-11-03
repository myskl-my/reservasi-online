import { db } from "@/lib/db";
import { nowIso } from "@/lib/dates";
import { sha256Hex } from "@/lib/auth/password";

export const MAX_LOGIN_ATTEMPTS = 3;
export const LOGIN_LOCK_MS = 15 * 60 * 1000;
export const GLOBAL_LOGIN_SCOPE = "global";
export const LOGIN_LOCKED_MESSAGE =
  "Terlalu banyak percobaan. Silakan coba lagi dalam 15 menit.";

interface LoginStateRow {
  attempt_count: number;
  locked_until: string | null;
}

export interface AttemptReservation {
  allowed: boolean;
  attemptNumber: number;
  lockedUntil: string | null;
}

export interface LoginState {
  attemptCount: number;
  lockedUntil: string | null;
}

/**
 * Satu statement UPSERT atomik:
 * - baris locked dilewati (tidak ada baris dikembalikan),
 * - kunci yang sudah kedaluwarsa memulai hitungan baru,
 * - selain itu hitungan bertambah tepat satu.
 */
const RESERVE_ATTEMPT_SQL = `
  INSERT INTO admin_login_state (scope, attempt_count, locked_until, updated_at)
  VALUES (?, 1, NULL, ?)
  ON CONFLICT(scope) DO UPDATE SET
    attempt_count = CASE
      WHEN admin_login_state.locked_until IS NOT NULL THEN 1
      ELSE admin_login_state.attempt_count + 1
    END,
    locked_until = NULL,
    updated_at = excluded.updated_at
  WHERE admin_login_state.locked_until IS NULL
     OR admin_login_state.locked_until <= ?
  RETURNING attempt_count, locked_until
`;

export async function getLoginState(scope: string): Promise<LoginState | null> {
  const row = await db.get<LoginStateRow>(
    "SELECT attempt_count, locked_until FROM admin_login_state WHERE scope = ?",
    scope,
  );
  if (!row) return null;

  const lockedUntil =
    row.locked_until && row.locked_until > nowIso() ? row.locked_until : null;

  return {
    attemptCount: Number(row.attempt_count),
    lockedUntil,
  };
}

/**
 * Memesan satu slot percobaan sebelum PIN diverifikasi. Pemanggilan ini atomik,
 * sehingga permintaan bersamaan tidak dapat melewati batas percobaan.
 */
export async function reserveLoginAttempt(
  scope: string,
): Promise<AttemptReservation> {
  const now = new Date();
  const nowText = now.toISOString();
  const row = await db.get<LoginStateRow>(
    RESERVE_ATTEMPT_SQL,
    scope,
    nowText,
    nowText,
  );

  if (!row) {
    const state = await getLoginState(scope);
    return {
      allowed: false,
      attemptNumber: 0,
      lockedUntil: state?.lockedUntil ?? null,
    };
  }

  const attemptNumber = Number(row.attempt_count);

  // Terjadi hanya saat beberapa permintaan memesan slot terakhir bersamaan.
  // Kunci scope agar sisa permintaan tidak pernah diverifikasi.
  if (attemptNumber > MAX_LOGIN_ATTEMPTS) {
    await recordLoginFailure(scope);
    const state = await getLoginState(scope);
    return {
      allowed: false,
      attemptNumber,
      lockedUntil: state?.lockedUntil ?? null,
    };
  }

  return { allowed: true, attemptNumber, lockedUntil: null };
}

/**
 * Menandai percobaan gagal. Kunci 15 menit dipasang saat hitungan mencapai
 * batas. Kunci yang masih aktif tidak diperpanjang.
 */
export async function recordLoginFailure(scope: string): Promise<void> {
  const now = new Date();
  const nowText = now.toISOString();
  const lockedUntil = new Date(now.getTime() + LOGIN_LOCK_MS).toISOString();

  await db.run(
    `
      UPDATE admin_login_state
      SET locked_until = ?, updated_at = ?
      WHERE scope = ?
        AND attempt_count >= ?
        AND (locked_until IS NULL OR locked_until <= ?)
    `,
    lockedUntil,
    nowText,
    scope,
    MAX_LOGIN_ATTEMPTS,
    nowText,
  );
}

/**
 * Reset setelah login berhasil. Karena login yang sah membuktikan identitas
 * admin, seluruh penghitung percobaan dikosongkan agar penguncian tidak
 * tertinggal pada sumber permintaan lain.
 */
export async function resetLoginAttempts(): Promise<void> {
  await db.run(
    `
      UPDATE admin_login_state
      SET attempt_count = 0, locked_until = NULL, updated_at = ?
      WHERE attempt_count > 0 OR locked_until IS NOT NULL
    `,
    nowIso(),
  );
}

/**
 * Kunci rate limit berdasarkan sumber permintaan. IP tidak disimpan mentah;
 * hanya hash yang dipakai sebagai kunci. Penguncian global tetap berlaku
 * sehingga mengganti cookie atau membuka sesi/browser baru tidak membantu.
 */
export async function loginSourceScope(request: Request): Promise<string> {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const source =
    forwardedFor?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown";
  const digest = await sha256Hex(source);
  return `source:${digest.slice(0, 32)}`;
}
