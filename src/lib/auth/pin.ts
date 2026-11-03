import { hash, verify, type Options } from "@node-rs/argon2";

export const PIN_MIN_LENGTH = 6;
export const PIN_MAX_LENGTH = 12;
export const PIN_PATTERN = new RegExp(`^\\d{${PIN_MIN_LENGTH},${PIN_MAX_LENGTH}}$`);

// Parameter Argon2id sesuai rekomendasi OWASP untuk PIN berentropi rendah:
// 19 MiB memori, 2 iterasi, 1 lane, salt acak dari pustaka. Pustaka memakai
// Argon2id sebagai algoritma default dan hal itu diverifikasi di hashPin().
const ARGON2_OPTIONS: Options = {
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
};

const ARGON2ID_PREFIX = "$argon2id$";

export function isValidPinFormat(pin: string): boolean {
  return PIN_PATTERN.test(pin);
}

export async function hashPin(pin: string): Promise<string> {
  if (!isValidPinFormat(pin)) {
    throw new Error("Format PIN tidak valid.");
  }
  const encoded = await hash(pin, ARGON2_OPTIONS);
  if (!encoded.startsWith(ARGON2ID_PREFIX)) {
    throw new Error("Hash PIN tidak memakai Argon2id.");
  }
  return encoded;
}

export async function verifyPin(
  pin: string,
  storedHash: string | null,
): Promise<boolean> {
  if (!storedHash || !storedHash.startsWith(ARGON2ID_PREFIX)) return false;
  try {
    return await verify(storedHash, pin);
  } catch {
    // Hash rusak atau tidak dikenal tidak boleh dianggap cocok.
    return false;
  }
}
