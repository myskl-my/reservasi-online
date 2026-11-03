import { createBooking } from "@/lib/data/reservations";
import { assertSameOrigin, ok, readJson, runApi } from "@/lib/http";
import { bookingSchema } from "@/lib/validation";

export async function POST(request: Request): Promise<Response> {
  return runApi(async () => {
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
