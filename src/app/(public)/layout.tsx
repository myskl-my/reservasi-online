import Link from "next/link";
import { Home, Scissors } from "lucide-react";

export default function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="page-glow flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-line/80 bg-surface/85 backdrop-blur-md supports-[backdrop-filter]:bg-surface/70">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="group flex items-center gap-2.5"
            aria-label="Reservasi Online - beranda"
          >
            <span className="bg-gradient-accent flex h-10 w-10 items-center justify-center rounded-control shadow-glow-accent transition-transform duration-200 group-hover:-translate-y-0.5">
              <Scissors aria-hidden="true" className="h-5 w-5 text-white" strokeWidth={2.2} />
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-[15px] font-bold tracking-tight text-ink">
                Reservasi Online
              </span>
              <span className="mt-1 text-[10px] font-semibold tracking-[0.18em] text-accent-strong uppercase">
                Barbershop
              </span>
            </span>
          </Link>

          <nav aria-label="Navigasi utama" className="flex items-center gap-1">
            <NavLink href="/" icon={<Home aria-hidden="true" className="h-4 w-4" strokeWidth={2.2} />} label="Beranda" />
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        {children}
      </main>

      <footer className="border-t border-line bg-surface/70 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 py-7 text-xs text-ink-muted sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <span className="bg-gradient-accent flex h-7 w-7 items-center justify-center rounded-lg">
              <Scissors aria-hidden="true" className="h-3.5 w-3.5 text-white" strokeWidth={2.4} />
            </span>
            <span className="font-semibold text-ink">
              Reservasi Online
            </span>
            <span aria-hidden="true">·</span>
            <span>Sistem antrean barbershop</span>
          </div>
          <span>© {new Date().getFullYear()} Reservasi Online</span>
        </div>
      </footer>
    </div>
  );
}

function NavLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-semibold text-ink-muted transition-colors duration-150 hover:bg-accent-soft hover:text-accent-strong"
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}
