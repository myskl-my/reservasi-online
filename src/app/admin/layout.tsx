import { ShieldCheck, Scissors } from "lucide-react";
import { requireAdminPage } from "@/lib/auth/guards";
import { AdminNav } from "@/components/internal/admin-nav";
import { LogoutButton } from "@/components/auth/logout-button";


export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireAdminPage();

  return (
    <div className="page-glow min-h-screen bg-canvas">
      <header className="sticky top-0 z-40 border-b border-line/80 bg-surface/85 backdrop-blur-md supports-[backdrop-filter]:bg-surface/70">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="bg-gradient-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-control shadow-glow-accent">
              <Scissors aria-hidden="true" className="h-5 w-5 text-white" strokeWidth={2.2} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold leading-tight tracking-tight text-ink">
                Reservasi online
                <span className="ml-1.5 text-accent-strong">Admin</span>
              </p>
              <p className="truncate text-xs text-ink-muted">
                {user.name} · {user.email}
              </p>
            </div>
            <span className="hidden items-center gap-1 text-xs font-semibold text-success sm:inline-flex">
              <ShieldCheck aria-hidden="true" className="h-3 w-3" strokeWidth={2.6} />
              Admin
            </span>
          </div>
          <LogoutButton />
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6">
        <AdminNav />
        <main>{children}</main>
      </div>
    </div>
  );
}
