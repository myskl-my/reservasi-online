import { cn } from "@/lib/cn";

const TONE_CLASSES = {
  info: { box: "border-info/20 bg-info-soft", title: "text-info" },
  success: { box: "border-success/20 bg-success-soft", title: "text-success" },
  warning: { box: "border-warning/25 bg-warning-soft", title: "text-warning" },
  error: { box: "border-danger/25 bg-danger-soft", title: "text-danger" },
  neutral: { box: "border-line bg-surface", title: "text-ink" },
} as const;

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: keyof typeof TONE_CLASSES;
  title?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  const toneClasses = TONE_CLASSES[tone];

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-control border px-4 py-3 text-sm leading-relaxed text-ink",
        toneClasses.box,
        className,
      )}
    >
      {title ? (
        <p className={cn("font-semibold", toneClasses.title)}>{title}</p>
      ) : null}
      {children ? (
        <div className={cn(title ? "mt-1" : undefined)}>{children}</div>
      ) : null}
    </div>
  );
}
