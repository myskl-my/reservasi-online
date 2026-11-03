import {
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";

const TONE_CLASSES = {
  info: { box: "border-info/25 bg-info-soft", title: "text-info", icon: Info },
  success: {
    box: "border-success/25 bg-success-soft",
    title: "text-success",
    icon: CheckCircle2,
  },
  warning: {
    box: "border-warning/30 bg-warning-soft",
    title: "text-warning",
    icon: AlertTriangle,
  },
  error: {
    box: "border-danger/30 bg-danger-soft",
    title: "text-danger",
    icon: XCircle,
  },
  neutral: {
    box: "border-line bg-surface",
    title: "text-ink",
    icon: Info,
  },
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
  const Icon: LucideIcon = toneClasses.icon;

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex gap-3 rounded-control border px-4 py-3 text-sm leading-relaxed text-ink",
        toneClasses.box,
        className,
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn("mt-0.5 h-4.5 w-4.5 shrink-0", toneClasses.title)}
        strokeWidth={2.2}
      />
      <div className="min-w-0">
        {title ? (
          <p className={cn("font-semibold", toneClasses.title)}>{title}</p>
        ) : null}
        {children ? (
          <div className={cn(title ? "mt-0.5" : undefined, "text-ink-muted")}>
            {children}
          </div>
        ) : null}
      </div>
    </div>
  );
}
