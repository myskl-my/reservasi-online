import { createBooking } from "@/lib/data/reservations";
import { assertSameOrigin, ok, readJson, runApi } from "@/lib/http";
import { enforceRateLimit } from "@/lib/http-rate-limit";
import { bookingSchema } from "@/lib/validation";

export async function POST(request: Request): Promise<Response> {
  return runApi(async () => {
    enforceRateLimit(request, "booking-create", 10, 60_000);
    assertSameOrigin(request);
    const input = await readJson(request, bookingSchema);
    const booking = await createBooking({
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      bookingDate: input.bookingDate,
    });
    return ok({ booking }, 201);
  });
}
