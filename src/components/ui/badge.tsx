import { cn } from "@/lib/cn";
import { STATUS_META, type ReservationStatus } from "@/lib/types";

export function StatusBadge({
  status,
  className,
}: {
  status: ReservationStatus;
  className?: string;
}) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-control px-2.5 py-1 text-xs font-semibold tracking-[0.08em] uppercase",
        "bg-accent-soft text-accent-strong border border-accent/20",
        className,
      )}
      title={meta.description}
    >
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
    amber: "bg-warning-soft text-warning border-warning/20",
    green: "bg-success-soft text-success border-success/20",
    red: "bg-danger-soft text-danger border-danger/20",
    blue: "bg-info-soft text-info border-info/20",
    violet: "bg-plum-soft text-plum border-plum/20",
  } as const;

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-control px-2.5 py-1 text-xs font-semibold tracking-[0.08em] uppercase border",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
