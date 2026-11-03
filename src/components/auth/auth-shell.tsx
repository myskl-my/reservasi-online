import Link from "next/link";
import { ArrowLeft, Scissors, ShieldCheck } from "lucide-react";

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
    <div className="page-glow flex min-h-screen flex-col bg-canvas">
      <header className="border-b border-line/80 bg-surface/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link href="/" className="group flex items-center gap-2.5">
            <span className="bg-gradient-accent flex h-9 w-9 items-center justify-center rounded-control shadow-glow-accent transition-transform duration-200 group-hover:-translate-y-0.5">
              <Scissors aria-hidden="true" className="h-4.5 w-4.5 text-white" strokeWidth={2.2} />
            </span>
            <span className="text-[15px] font-bold tracking-tight text-ink">
              Reservasi online
            </span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:border-accent/40 hover:text-accent-strong"
          >
            <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.4} />
            Kembali ke situs
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:py-14">
        <div className="w-full max-w-md">
          <div className="animate-fade-in-up mb-6 text-center">
            <span className="bg-gradient-accent mx-auto flex h-14 w-14 items-center justify-center rounded-2xl shadow-glow-accent">
              <ShieldCheck
                aria-hidden="true"
                className="h-7 w-7 text-white"
                strokeWidth={2.1}
              />
            </span>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink">
              {title}
            </h1>
            <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-ink-muted">
              {description}
            </p>
          </div>
          <div className="animate-fade-in-up" style={{ animationDelay: "80ms" }}>
            {children}
          </div>
          {footer ? (
            <div className="mt-5 text-center text-sm">{footer}</div>
          ) : null}
        </div>
      </main>

      <footer className="border-t border-line bg-surface/70 py-5 text-center text-xs text-ink-muted backdrop-blur-sm">
        Area internal Reservasi online. Akses hanya untuk staf yang berwenang.
      </footer>
    </div>
  );
}
