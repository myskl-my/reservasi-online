"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiRequest, ApiClientError } from "@/lib/client/api";

export function ActionButton({
  url,
  body,
  label,
  pendingLabel,
  variant = "secondary",
  size = "sm",
  confirmMessage,
  disabled = false,
  className,
}: {
  url: string;
  body?: unknown;
  label: string;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
  confirmMessage?: string;
  disabled?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setPending(true);
    setError(null);
    try {
      await apiRequest<unknown>(url, {
        method: "POST",
        body: body ?? {},
      });
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof ApiClientError
          ? requestError.message
          : "Aksi gagal diproses.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <Button
        variant={variant}
        size={size}
        onClick={handleClick}
        disabled={disabled || pending}
        className={className}
      >
        {pending ? (pendingLabel ?? "Memproses...") : label}
      </Button>
      {error ? (
        <span role="alert" className="max-w-56 text-xs font-medium text-danger">
          {error}
        </span>
      ) : null}
    </span>
  );
}
