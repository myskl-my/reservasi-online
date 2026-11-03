import { getAvailability } from "@/lib/data/settings";
import { ok, runApi } from "@/lib/http";
import { enforceRateLimit } from "@/lib/http-rate-limit";

export async function GET(request: Request): Promise<Response> {
  return runApi(async () => {
    enforceRateLimit(request, "availability", 60, 60_000);
    const availability = await getAvailability();
    return ok(availability);
  });
}
