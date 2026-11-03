import { db } from "@/lib/db";
import { hashPin } from "@/lib/auth/pin";
import { nowIso } from "@/lib/dates";
import { conflict } from "@/lib/http";

export interface AdminLoginRecord {
  id: string;
  email: string;
  name: string;
  pin_hash: string | null;
}

export async function adminExists(): Promise<boolean> {
  const row = await db.get<{ count: number }>(
    "SELECT COUNT(*) AS count FROM users WHERE role = 'ADMIN'",
  );
  return Number(row?.count ?? 0) > 0;
}

export async function countAdmins(): Promise<number> {
  const row = await db.get<{ count: number }>(
    "SELECT COUNT(*) AS count FROM users WHERE role = 'ADMIN'",
  );
  return Number(row?.count ?? 0);
}

export async function createFirstAdmin(input: {
  name: string;
  email: string;
  pin: string;
}): Promise<void> {
  const pinHash = await hashPin(input.pin);
  const now = nowIso();
  const id = crypto.randomUUID();

  const result = await db.run(
    `
      INSERT INTO users (
        id, email, name, password_hash, pin_hash, pin_updated_at,
        role, is_active, created_at, updated_at
      )
      SELECT ?, ?, ?, '!pin-auth-only', ?, ?, 'ADMIN', 1, ?, ?
      WHERE NOT EXISTS (SELECT 1 FROM users WHERE role = 'ADMIN')
    `,
    id,
    input.email,
    input.name,
    pinHash,
    now,
    now,
    now,
  );

  if (result.changes !== 1) {
    throw conflict(
      "Admin sudah pernah dibuat. Silakan login.",
      "ADMIN_ALREADY_EXISTS",
    );
  }
}

/**
 * Data minimal untuk verifikasi PIN. Hash PIN tidak pernah dikirim ke klien.
 */
export async function findAdminForLogin(): Promise<AdminLoginRecord | null> {
  return db.get<AdminLoginRecord>(
    `
      SELECT id, email, name, pin_hash
      FROM users
      WHERE role = 'ADMIN' AND is_active = 1
      ORDER BY created_at ASC
      LIMIT 1
    `,
  );
}

export async function getTeamMemberName(userId: string): Promise<string | null> {
  const row = await db.get<{ name: string }>(
    "SELECT name FROM users WHERE id = ?",
    userId,
  );
  return row?.name ?? null;
}
