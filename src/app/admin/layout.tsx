import { requireAdminPage } from "@/lib/auth/guards";
import { AdminNav } from "@/components/internal/admin-nav";
import { LogoutButton } from "@/components/auth/logout-button";
import { Badge } from "@/components/ui/badge";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireAdminPage();

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-accent text-xs font-bold tracking-wide text-white">
              CQ
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight text-ink">
                Reservasi online Admin
              </p>
              <p className="truncate text-xs text-ink-muted">
                {user.name} · {user.email}
              </p>
            </div>
            <Badge tone="green" className="hidden sm:inline-flex">
              Admin
            </Badge>
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
