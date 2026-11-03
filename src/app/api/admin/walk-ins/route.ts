import { requireAdminApi } from "@/lib/auth/guards";
import { createWalkIn } from "@/lib/data/walk-ins";
import { assertSameOrigin, ok, readJson, runApi } from "@/lib/http";
import { createWalkInSchema } from "@/lib/validation";

export async function POST(request: Request): Promise<Response> {
  return runApi(async () => {
    await requireAdminApi();
    assertSameOrigin(request);
    const input = await readJson(request, createWalkInSchema);
    const walkIn = await createWalkIn({
      customerName: input.customerName,
      customerPhone: input.customerPhone,
    });
    return ok({ walkIn }, 201);
  });
}
