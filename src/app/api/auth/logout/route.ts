import { destroySession } from "@/lib/auth/session";
import { assertSameOrigin, ok, runApi } from "@/lib/http";

export async function POST(request: Request): Promise<Response> {
  return runApi(async () => {
    assertSameOrigin(request);
    await destroySession();
    return ok({ loggedOut: true });
  });
}
