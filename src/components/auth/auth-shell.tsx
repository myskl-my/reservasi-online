import Link from "next/link";

export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-control bg-accent text-xs font-bold tracking-wide text-white">
              CQ
            </span>
            <span className="text-base font-semibold tracking-tight text-ink">
Reservasi online
            </span>
          </Link>
          <Link
            href="/"
            className="text-xs font-medium text-ink-muted transition-colors hover:text-ink"
          >
            Kembali ke situs
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:py-14">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-ink">
              {title}
            </h1>
            <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-ink-muted">
              {description}
            </p>
          </div>
          {children}
          {footer ? (
            <div className="mt-5 text-center text-sm">{footer}</div>
          ) : null}
        </div>
      </main>

      <footer className="border-t border-line bg-canvas py-5 text-center text-xs text-ink-muted">
        Area internal Reservasi online. Akses hanya untuk staf yang berwenang.
      </footer>
    </div>
  );
}
