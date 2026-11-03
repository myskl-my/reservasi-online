import { getAvailability } from "@/lib/data/settings";
import { ok, runApi } from "@/lib/http";

export async function GET(): Promise<Response> {
  return runApi(async () => {
    const availability = await getAvailability();
    return ok(availability);
  });
}
