import { ApiError } from "@/lib/http";
import { consumeRateLimit, requestSourceKey } from "@/lib/rate-limit";

/**
 * Terapkan rate limit per-sumber permintaan. Melempar 429 bila batas terlampaui.
 */
export function enforceRateLimit(
  request: Request,
  name: string,
  limit: number,
  windowMs: number,
): void {
  const key = `${name}:${requestSourceKey(request)}`;
  const result = consumeRateLimit(key, limit, windowMs);
  if (!result.allowed) {
    throw new ApiError(
      429,
      "RATE_LIMITED",
      `Terlalu banyak permintaan. Coba lagi dalam ${result.retryAfterSeconds} detik.`,
    );
  }
}
