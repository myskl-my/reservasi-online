import Link from "next/link";

export default function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-control bg-accent text-xs font-bold tracking-wide text-white">
              RO
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-base font-semibold tracking-tight text-ink">
                Reservasi Online
              </span>
              <span className="mt-1 text-[10px] font-medium tracking-[0.16em] text-ink-muted uppercase">
                Barbershop
              </span>
            </span>
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </main>

      <footer className="border-t border-line bg-canvas">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-ink-muted sm:flex-row sm:px-6">
        </div>
      </footer>
    </div>
  );
}
