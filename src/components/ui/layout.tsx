import { Inbox, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  eyebrow?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[11px] font-bold tracking-[0.16em] text-accent-strong uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-ink sm:text-[28px]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-ink-muted">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
  icon,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "default" | "warn" | "success" | "danger";
  icon?: React.ReactNode;
}) {
  const valueTone = {
    default: "text-ink",
    warn: "text-warning",
    success: "text-success",
    danger: "text-danger",
  } as const;

  const iconTone = {
    default: "bg-accent-soft text-accent-strong",
    warn: "bg-warning-soft text-warning",
    success: "bg-success-soft text-success",
    danger: "bg-danger-soft text-danger",
  } as const;

  return (
    <div className="group rounded-card border border-line bg-surface p-4 shadow-card transition-shadow duration-200 hover:shadow-float sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
          {label}
        </p>
        {icon ? (
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-control transition-transform duration-200 group-hover:-translate-y-0.5",
              iconTone[tone],
            )}
          >
            {icon}
          </span>
        ) : null}
      </div>
      <p
        className={cn(
          "mt-2 text-3xl font-bold tracking-tight tabular-nums",
          valueTone[tone],
        )}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-card border border-dashed border-line bg-surface-muted/40 px-6 py-12 text-center",
        className,
      )}
    >
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted text-ink-muted">
        <Inbox aria-hidden="true" className="h-5.5 w-5.5" strokeWidth={1.9} />
      </span>
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description ? (
        <p className="mt-1 max-w-md text-sm leading-relaxed text-ink-muted">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function LoadingBlock({ label = "Memuat data..." }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2.5 rounded-card border border-line bg-surface px-4 py-12 text-sm text-ink-muted shadow-card">
      <Loader2
        aria-hidden="true"
        className="h-4 w-4 animate-spin text-accent"
        strokeWidth={2.4}
      />
      {label}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("skeleton rounded-control", className)}
    />
  );
}
