import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-accent text-white shadow-glow-accent hover:brightness-[1.06] hover:-translate-y-0.5 active:translate-y-0 active:brightness-95 focus-visible:outline-accent",
  secondary:
    "border border-line bg-surface text-ink shadow-card hover:border-accent/40 hover:text-accent-strong hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-accent",
  danger:
    "border border-danger/25 bg-surface text-danger hover:bg-danger-soft hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-danger",
  ghost:
    "text-ink-muted hover:bg-surface-muted hover:text-ink active:bg-surface-muted focus-visible:outline-accent",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "min-h-8 px-3 py-1.5 text-xs",
  md: "min-h-10 px-4 py-2.5 text-sm",
  lg: "min-h-12 px-6 py-3 text-[15px]",
};

export function buttonClassName(options?: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}): string {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-control font-semibold transition-[transform,filter,colors,box-shadow] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:brightness-100",
    VARIANT_CLASSES[options?.variant ?? "primary"],
    SIZE_CLASSES[options?.size ?? "md"],
    options?.className,
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      type={type}
      className={buttonClassName({ variant, size, className })}
      {...props}
    >
      {children}
    </button>
  );
}
