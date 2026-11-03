import { requireAdminApi } from "@/lib/auth/guards";
import { callNextForAdmin } from "@/lib/data/queue";
import { callNextSchema } from "@/lib/validation";
import { assertSameOrigin, ok, readJson, runApi } from "@/lib/http";

export async function POST(request: Request): Promise<Response> {
  return runApi(async () => {
    await requireAdminApi();
    assertSameOrigin(request);
    const input = await readJson(request, callNextSchema);
    const result = await callNextForAdmin(input.kind);
    return ok(result);
  });
}
