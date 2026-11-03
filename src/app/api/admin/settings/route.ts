import { requireAdminApi } from "@/lib/auth/guards";
import { getAppSettings, updateAppSettings } from "@/lib/data/settings";
import { assertSameOrigin, ok, readJson, runApi } from "@/lib/http";
import { updateSettingsSchema } from "@/lib/validation";

export async function GET(): Promise<Response> {
  return runApi(async () => {
    await requireAdminApi();
    return ok({ settings: await getAppSettings() });
  });
}

export async function PATCH(request: Request): Promise<Response> {
  return runApi(async () => {
    await requireAdminApi();
    assertSameOrigin(request);
    const input = await readJson(request, updateSettingsSchema);
    await updateAppSettings(input);
    return ok({ settings: await getAppSettings() });
  });
}
