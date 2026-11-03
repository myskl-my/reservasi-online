const PIN_MIN_LENGTH = 6;
const PIN_MAX_LENGTH = 12;
export const PIN_PATTERN = new RegExp(`^\\d{${PIN_MIN_LENGTH},${PIN_MAX_LENGTH}}$`);

const PBKDF2_PREFIX = "$pbkdf2$";
const PBKDF2_ITERATIONS = 100_000;

export function isValidPinFormat(pin: string): boolean {
  return PIN_PATTERN.test(pin);
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function pbkdf2Hash(pin: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin) as unknown as BufferSource,
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as unknown as BufferSource, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    key,
    256,
  );
  return `${PBKDF2_PREFIX}${PBKDF2_ITERATIONS}$${toBase64(salt)}$${toBase64(
    new Uint8Array(bits),
  )}`;
}

async function pbkdf2Verify(pin: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split("$");
  // $pbkdf2$iterations$salt$hash
  if (parts.length !== 5 || parts[1] !== "pbkdf2") return false;
  const iterations = Number(parts[2]);
  if (!Number.isFinite(iterations) || iterations <= 0) return false;
  const salt = fromBase64(parts[3]);
  const expected = fromBase64(parts[4]);

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin) as unknown as BufferSource,
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as unknown as BufferSource, iterations, hash: "SHA-256" },
    key,
    expected.length * 8,
  );
  const actual = new Uint8Array(bits);

  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i += 1) {
    diff |= actual[i] ^ expected[i];
  }
  return diff === 0;
}

export async function hashPin(pin: string): Promise<string> {
  if (!isValidPinFormat(pin)) {
    throw new Error("Format PIN tidak valid.");
  }

  return pbkdf2Hash(pin);
}

export async function verifyPin(
  pin: string,
  storedHash: string | null,
): Promise<boolean> {
  if (!storedHash) return false;

  if (storedHash.startsWith(PBKDF2_PREFIX)) {
    return pbkdf2Verify(pin, storedHash);
  }

  return false;
}