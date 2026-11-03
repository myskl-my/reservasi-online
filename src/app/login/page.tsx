import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { Alert } from "@/components/ui/alert";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Login Staf",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ setup?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/admin");

  const params = await searchParams;
  const setupSuccess = params.setup === "success";

  return (
    <AuthShell
      title="Masuk ke Reservasi online"
      description="Area admin Reservasi online. Masukkan PIN admin untuk melanjutkan."
    >
      <div className="space-y-4">
        {setupSuccess ? (
          <Alert tone="success">
            Admin berhasil dibuat. Silakan masuk dengan PIN Anda.
          </Alert>
        ) : null}
        <LoginForm />
      </div>
    </AuthShell>
  );
}
