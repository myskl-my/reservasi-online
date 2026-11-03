/**
 * Rate limiter sederhana berbasis memori (fixed window per key).
 *
 * Cukup untuk satu proses Node.js / satu instance SQLite. Jika nanti
 * berjalan multi-instance, ganti backend ini dengan penyimpanan bersama
 * (D1/Redis) tanpa mengubah pemanggilnya.
 */

interface WindowEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, WindowEntry>();

// Bersihkan entri kedaluwwarsa secara berkala agar map tidak tumbuh tanpa batas.
const SWEEP_INTERVAL_MS = 60_000;
let lastSweepAt = Date.now();

function sweep(now: number): void {
  if (now - lastSweepAt < SWEEP_INTERVAL_MS) return;
  lastSweepAt = now;
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Catat satu permintaan untuk `key`. Mengembalikan apakah permintaan
 * masih di dalam batas `limit` selama `windowMs`.
 */
export function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const entry = store.get(key);
  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  if (entry.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }

  entry.count += 1;
  return {
    allowed: true,
    remaining: limit - entry.count,
    retryAfterSeconds: 0,
  };
}

/** Hash/IP aman-privasi: cukup untuk kunci rate limit, bukan identitas. */
export function requestSourceKey(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const source =
    forwardedFor?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown";
  // String pendek non-kriptografis; rate limit bukan sekuritas utama.
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 31 + source.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}
