import { requireAdminApi } from "@/lib/auth/guards";
import { adminTransitionWalkIn } from "@/lib/data/walk-ins";
import { assertSameOrigin, ok, readJson, runApi } from "@/lib/http";
import { adminWalkInActionSchema } from "@/lib/validation";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  return runApi(async () => {
    await requireAdminApi();
    assertSameOrigin(request);
    const { id } = await context.params;
    const input = await readJson(request, adminWalkInActionSchema);
    const walkIn = await adminTransitionWalkIn(id, input.action);
    return ok({ walkIn });
  });
}
