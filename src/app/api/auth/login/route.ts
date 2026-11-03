import { createSession } from "@/lib/auth/session";
import { findAdminForLogin } from "@/lib/data/users";
import { verifyPin } from "@/lib/auth/pin";
import {
  GLOBAL_LOGIN_SCOPE,
  LOGIN_LOCKED_MESSAGE,
  MAX_LOGIN_ATTEMPTS,
  loginSourceScope,
  recordLoginFailure,
  reserveLoginAttempt,
  resetLoginAttempts,
} from "@/lib/auth/login-throttle";
import { ApiError, assertSameOrigin, ok, readJson, runApi } from "@/lib/http";
import { loginSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function loginLockedError(): ApiError {
  return new ApiError(429, "LOGIN_LOCKED", LOGIN_LOCKED_MESSAGE);
}

export async function POST(request: Request): Promise<Response> {
  return runApi(async () => {
    assertSameOrigin(request);
    const input = await readJson(request, loginSchema);

    // Rate limit per sumber permintaan dan penguncian global. Keduanya dihitung
    // dan disimpan di database (bukan memori maupun browser).
    const sourceScope = await loginSourceScope(request);
    const sourceAttempt = await reserveLoginAttempt(sourceScope);
    if (!sourceAttempt.allowed) throw loginLockedError();

    const globalAttempt = await reserveLoginAttempt(GLOBAL_LOGIN_SCOPE);
    if (!globalAttempt.allowed) throw loginLockedError();

    const admin = await findAdminForLogin();
    const pinMatches = admin ? await verifyPin(input.pin, admin.pin_hash) : false;

    if (!admin || !pinMatches) {
      await recordLoginFailure(GLOBAL_LOGIN_SCOPE);
      await recordLoginFailure(sourceScope);

      const remaining = Math.max(
        0,
        MAX_LOGIN_ATTEMPTS - globalAttempt.attemptNumber,
      );
      if (remaining === 0) throw loginLockedError();

      throw new ApiError(
        401,
        "INVALID_CREDENTIALS",
        `PIN salah. Sisa percobaan: ${remaining}.`,
      );
    }

    await resetLoginAttempts();
    await createSession(admin.id);

    return ok({ name: admin.name });
  });
}
