import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-white shadow-[0_1px_2px_rgba(41,40,36,0.14)] hover:bg-accent-strong active:bg-accent-strong focus-visible:outline-accent",
  secondary:
    "border border-line bg-surface text-ink hover:border-ink-muted/30 hover:bg-surface-muted active:bg-surface-muted focus-visible:outline-accent",
  danger:
    "border border-danger/25 bg-surface text-danger hover:bg-danger-soft active:bg-danger-soft focus-visible:outline-danger",
  ghost:
    "text-ink-muted hover:bg-surface-muted hover:text-ink active:bg-surface-muted focus-visible:outline-accent",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "min-h-8 px-3 py-1.5 text-xs",
  md: "min-h-10 px-4 py-2.5 text-sm",
};

export function buttonClassName(options?: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}): string {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-control font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
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
    />
  );
}
