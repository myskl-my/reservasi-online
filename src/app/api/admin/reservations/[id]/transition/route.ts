import { requireAdminApi } from "@/lib/auth/guards";
import { adminTransitionReservation } from "@/lib/data/reservations";
import { assertSameOrigin, ok, readJson, runApi } from "@/lib/http";
import { adminReservationActionSchema } from "@/lib/validation";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  return runApi(async () => {
    await requireAdminApi();
    assertSameOrigin(request);
    const { id } = await context.params;
    const input = await readJson(request, adminReservationActionSchema);
    const reservation = await adminTransitionReservation(id, input.action);
    return ok({ reservation });
  });
}
