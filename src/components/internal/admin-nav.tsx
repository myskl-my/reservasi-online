"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const links = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/reservations", label: "Reservasi" },
  { href: "/admin/walk-ins", label: "Walk-in" },
  { href: "/admin/settings", label: "Pengaturan" },
  { href: "/admin/reports", label: "Laporan" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigasi admin"
      className="flex flex-wrap gap-1 rounded-card border border-line bg-surface p-1 shadow-card"
    >
      {links.map((link) => {
        const active = link.exact
          ? pathname === link.href
          : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-control px-3.5 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-accent text-white shadow-[0_1px_2px_rgba(41,40,36,0.12)]"
                : "text-ink-muted hover:bg-surface-muted hover:text-ink",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
