import { constantTimeEqualText } from "@/lib/auth/password";
import { adminExists, createFirstAdmin } from "@/lib/data/users";
import { ApiError, assertSameOrigin, conflict, ok, readJson, runApi } from "@/lib/http";
import { enforceRateLimit } from "@/lib/http-rate-limit";
import { setupSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  return runApi(async () => {
    enforceRateLimit(request, "admin-setup", 5, 60_000);
    assertSameOrigin(request);
    const input = await readJson(request, setupSchema);

    const expectedToken = process.env.ADMIN_SETUP_TOKEN;
    if (!expectedToken) {
      throw new ApiError(
        503,
        "SETUP_NOT_CONFIGURED",
        "Setup admin belum dikonfigurasi pada server.",
      );
    }

    if (!constantTimeEqualText(input.setupToken, expectedToken)) {
      throw new ApiError(403, "INVALID_SETUP_TOKEN", "Token setup tidak valid.");
    }

    if (await adminExists()) {
      throw conflict(
        "Admin sudah pernah dibuat. Silakan login.",
        "ADMIN_ALREADY_EXISTS",
      );
    }

    await createFirstAdmin({
      name: input.name,
      email: input.email,
      pin: input.pin,
    });

    return ok({ created: true }, 201);
  });
}
