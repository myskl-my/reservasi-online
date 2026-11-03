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
          <p className="text-[11px] font-semibold tracking-[0.14em] text-accent uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-[26px]">
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
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "default" | "warn" | "success" | "danger";
}) {
  const valueTone = {
    default: "text-ink",
    warn: "text-warning",
    success: "text-success",
    danger: "text-danger",
  } as const;

  return (
    <div className="rounded-card border border-line bg-surface p-4 shadow-card sm:p-5">
      <p className="text-xs font-medium text-ink-muted">{label}</p>
      <p
        className={cn(
          "mt-1.5 text-2xl font-semibold tracking-tight tabular-nums sm:text-[28px]",
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
        "flex flex-col items-center justify-center rounded-control border border-dashed border-line bg-surface-muted/40 px-6 py-10 text-center",
        className,
      )}
    >
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
    <div className="flex items-center justify-center rounded-control border border-line bg-surface px-4 py-10 text-sm text-ink-muted">
      {label}
    </div>
  );
}
