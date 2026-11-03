import { getPublicReservationStatus } from "@/lib/data/reservations";
import { ApiError, ok, parseOrThrow, runApi } from "@/lib/http";
import { enforceRateLimit } from "@/lib/http-rate-limit";
import { bookingCodeSchema } from "@/lib/validation";

export async function GET(request: Request): Promise<Response> {
  return runApi(async () => {
    enforceRateLimit(request, "booking-status", 30, 60_000);
    const url = new URL(request.url);
    const code = parseOrThrow(bookingCodeSchema, url.searchParams.get("code") ?? "");
    const reservation = await getPublicReservationStatus(code);

    if (!reservation) {
      throw new ApiError(
        404,
        "RESERVATION_NOT_FOUND",
        "Reservasi tidak ditemukan. Periksa kembali kode booking Anda.",
      );
    }

    return ok({ reservation });
  });
}
