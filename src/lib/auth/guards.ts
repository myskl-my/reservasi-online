import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { ApiError } from "@/lib/http";
import type { SessionUser } from "@/lib/types";

export async function requireAdminApi(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new ApiError(401, "UNAUTHENTICATED", "Anda harus login terlebih dahulu.");
  }
  return user;
}

export async function requireAdminPage(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
