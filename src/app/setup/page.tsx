import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { SetupForm } from "@/components/auth/setup-form";
import { Alert } from "@/components/ui/alert";
import { getCurrentUser } from "@/lib/auth/session";
import { adminExists } from "@/lib/data/users";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Setup Admin",
  robots: { index: false, follow: false },
};

export default async function SetupPage() {
  const user = await getCurrentUser();
  if (user) redirect("/admin");

  if (await adminExists()) {
    redirect("/login");
  }

  const configured = Boolean(process.env.ADMIN_SETUP_TOKEN);

  return (
    <AuthShell
      title="Setup admin pertama"
      description="Halaman ini hanya dapat dipakai sekali, sebelum admin pertama dibuat."
    >
      {configured ? (
        <SetupForm />
      ) : (
        <Alert tone="warning" title="Setup belum dikonfigurasi">
          Tambahkan <code className="font-mono">ADMIN_SETUP_TOKEN</code> pada
          environment server (misalnya <code className="font-mono">.env.local</code>{" "}
          untuk pengembangan lokal), lalu restart server. Token tidak boleh
          dibagikan.
        </Alert>
      )}
    </AuthShell>
  );
}
