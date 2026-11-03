import {
  BellRing,
  CheckCircle2,
  CircleDashed,
  Clock,
  UserCheck,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { STATUS_META, type ReservationStatus } from "@/lib/types";

const STATUS_ICON: Record<ReservationStatus, LucideIcon> = {
  CONFIRMED: Clock,
  WAITING: CircleDashed,
  CALLED: BellRing,
  IN_SERVICE: UserCheck,
  COMPLETED: CheckCircle2,
  CANCELLED: XCircle,
  NO_SHOW: XCircle,
};

export function StatusBadge({
  status,
  className,
}: {
  status: ReservationStatus;
  className?: string;
}) {
  const meta = STATUS_META[status];
  const Icon = STATUS_ICON[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[0.06em] uppercase ring-1",
        meta.badgeClassName,
        className,
      )}
      title={meta.description}
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.4} />
      {meta.label}
    </span>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "amber" | "green" | "red" | "blue" | "violet";
  className?: string;
}) {
  const tones = {
    neutral: "bg-surface-muted text-ink-muted border-line",
    amber: "bg-warning-soft text-warning border-warning/25",
    green: "bg-success-soft text-success border-success/25",
    red: "bg-danger-soft text-danger border-danger/25",
    blue: "bg-info-soft text-info border-info/25",
    violet: "bg-plum-soft text-plum border-plum/25",
  } as const;

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[0.08em] uppercase border",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
