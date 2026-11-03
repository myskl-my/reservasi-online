"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { apiRequest, ApiClientError } from "@/lib/client/api";
import type { AppSettings } from "@/lib/types";

export function SettingsForm({ settings }: { settings: AppSettings }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(settings.onlineBookingEnabled);
  const [quota, setQuota] = useState(String(settings.defaultDailyQuota));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setSuccess(null);

    const quotaValue = Number.parseInt(quota, 10);
    if (!Number.isInteger(quotaValue) || quotaValue < 1 || quotaValue > 500) {
      setFieldErrors({ defaultDailyQuota: "Kuota harus bilangan bulat 1–500." });
      return;
    }

    setPending(true);
    try {
      await apiRequest<{ settings: AppSettings }>("/api/admin/settings", {
        method: "PATCH",
        body: {
          onlineBookingEnabled: enabled,
          defaultDailyQuota: quotaValue,
        },
      });
      setSuccess("Pengaturan global berhasil disimpan.");
      router.refresh();
    } catch (requestError) {
      if (requestError instanceof ApiClientError) {
        setError(requestError.message);
        setFieldErrors(requestError.fields);
      } else {
        setError("Pengaturan gagal disimpan.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? <Alert tone="error">{error}</Alert> : null}
      {success ? <Alert tone="success">{success}</Alert> : null}

      <label className="flex items-start gap-3 rounded-control border border-line bg-surface-muted/60 p-3.5">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-line accent-success focus:ring-success/30"
        />
        <span>
          <span className="block text-sm font-medium text-ink">
            Reservasi online aktif
          </span>
          <span className="mt-0.5 block text-xs leading-relaxed text-ink-muted">
            Jika dimatikan, pelanggan tidak dapat membuat booking baru. Reservasi
            yang sudah ada tetap berlaku dan tetap harus dilayani.
          </span>
        </span>
      </label>

      <Field
        label="Kuota default per hari"
        htmlFor="default-quota"
        hint="Berlaku untuk tanggal tanpa kuota khusus. Rentang 1–500."
        error={fieldErrors.defaultDailyQuota}
      >
        <Input
          id="default-quota"
          type="number"
          min={1}
          max={500}
          step={1}
          value={quota}
          onChange={(event) => setQuota(event.target.value)}
          className="max-w-32"
          required
        />
      </Field>

      <Button type="submit" disabled={pending}>
        {pending ? "Menyimpan..." : "Simpan Pengaturan"}
      </Button>
    </form>
  );
}
