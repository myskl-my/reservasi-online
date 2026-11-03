import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { nowIso } from "@/lib/dates";
import { randomHex, sha256Hex } from "@/lib/auth/password";
import type { SessionUser } from "@/lib/types";

export const SESSION_COOKIE = "cq_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

interface SessionRow {
  id: string;
  email: string;
  name: string;
}

const SESSION_QUERY = `
  SELECT u.id, u.email, u.name
  FROM sessions s
  JOIN users u ON u.id = s.user_id
  WHERE s.token_hash = ?
    AND s.expires_at > ?
    AND u.is_active = 1
    AND u.role = 'ADMIN'
  LIMIT 1
`;

function toSessionUser(row: SessionRow): SessionUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
  };
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;

  const tokenHash = await sha256Hex(token);
  const row = await db.get<SessionRow>(SESSION_QUERY, tokenHash, nowIso());
  if (!row) return null;

  return toSessionUser(row);
}

export async function createSession(userId: string): Promise<void> {
  const cookieStore = await cookies();
  const previousToken = cookieStore.get(SESSION_COOKIE)?.value;

  // Rotasi token: sesi lama pada browser yang sama tidak dibiarkan valid.
  if (previousToken && /^[0-9a-f]{64}$/.test(previousToken)) {
    await db.run(
      "DELETE FROM sessions WHERE token_hash = ?",
      await sha256Hex(previousToken),
    );
  }

  const token = randomHex(32);
  const tokenHash = await sha256Hex(token);
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  await db.run("DELETE FROM sessions WHERE expires_at <= ?", createdAt);
  await db.run(
    "INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
    tokenHash,
    userId,
    expiresAt,
    createdAt,
  );

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token && /^[0-9a-f]{64}$/.test(token)) {
    const tokenHash = await sha256Hex(token);
    await db.run("DELETE FROM sessions WHERE token_hash = ?", tokenHash);
  }

  cookieStore.delete(SESSION_COOKIE);
}

export async function deleteSessionsForUser(userId: string): Promise<void> {
  await db.run("DELETE FROM sessions WHERE user_id = ?", userId);
}
