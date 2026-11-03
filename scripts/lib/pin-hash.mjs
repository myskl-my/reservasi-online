/**
 * Hash PIN PBKDF2-SHA256 — format sama dengan src/lib/auth/pin.ts:
 *   $pbkdf2$<iterations>$<saltBase64>$<hashBase64>
 *
 * Dipakai skrip CLI (Node.js). Aplikasi web memakai implementasi TypeScript
 * di src/lib/auth/pin.ts dengan format identik agar hash saling validasi.
 */

export const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_PREFIX = "$pbkdf2$";
const PIN_PATTERN = /^\d{6,12}$/;

function toBase64(bytes) {
  return Buffer.from(bytes).toString("base64");
}

export function isValidPinFormat(pin) {
  return PIN_PATTERN.test(pin);
}

export async function hashPin(pin) {
  if (!isValidPinFormat(pin)) {
    throw new Error("Format PIN tidak valid.");
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    key,
    256,
  );
  return `${PBKDF2_PREFIX}${PBKDF2_ITERATIONS}$${toBase64(salt)}$${toBase64(
    new Uint8Array(bits),
  )}`;
}

export function isPbkdf2Hash(storedHash) {
  return typeof storedHash === "string" && storedHash.startsWith(PBKDF2_PREFIX);
}
