"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarCheck,
  Footprints,
  LayoutDashboard,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";

const links: Array<{
  href: string;
  label: string;
  exact?: boolean;
  icon: LucideIcon;
}> = [
  { href: "/admin", label: "Dashboard", exact: true, icon: LayoutDashboard },
  { href: "/admin/reservations", label: "Reservasi", icon: CalendarCheck },
  { href: "/admin/walk-ins", label: "Walk-in", icon: Footprints },
  { href: "/admin/settings", label: "Pengaturan", icon: Settings },
  { href: "/admin/reports", label: "Laporan", icon: BarChart3 },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigasi admin"
      className="no-scrollbar flex gap-1 overflow-x-auto rounded-card border border-line bg-surface p-1 shadow-card"
    >
      {links.map((link) => {
        const active = link.exact
          ? pathname === link.href
          : pathname.startsWith(link.href);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-control px-3.5 py-2 text-sm font-semibold transition-all duration-150",
              active
                ? "bg-gradient-accent text-white shadow-glow-accent"
                : "text-ink-muted hover:bg-surface-muted hover:text-ink",
            )}
          >
            <Icon aria-hidden="true" className="h-4 w-4" strokeWidth={2.2} />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
