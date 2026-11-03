"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { apiRequest, ApiClientError } from "@/lib/client/api";
import { formatDateID } from "@/lib/dates";
import type { AvailabilityDay } from "@/lib/types";

interface SaveResponse {
  saved: boolean;
  date: string;
  activeCount: number;
  warning: string | null;
}

export function DateOverrideRow({
  day,
  defaultQuota,
}: {
  day: AvailabilityDay;
  defaultQuota: number;
}) {
  const router = useRouter();
  const [quota, setQuota] = useState(
    day.overrideQuota === null ? "" : String(day.overrideQuota),
  );
  const [closed, setClosed] = useState(day.dateClosed);
  const [pending, setPending] = useState<"save" | "reset" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const hasOverride = day.overrideQuota !== null || day.dateClosed;

  async function save(maxQuota: number | null, isClosed: boolean, mode: "save" | "reset") {
    setPending(mode);
    setError(null);
    setMessage(null);
    setWarning(null);
    try {
      const data = await apiRequest<SaveResponse>("/api/admin/dates", {
        method: "PUT",
        body: { date: day.date, maxQuota, isClosed },
      });
      setMessage("Pengaturan tanggal disimpan.");
      setWarning(data.warning);
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof ApiClientError
          ? requestError.message
          : "Pengaturan tanggal gagal disimpan.",
      );
    } finally {
      setPending(null);
    }
  }

  function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = quota.trim();
    let parsed: number | null = null;
    if (trimmed !== "") {
      const value = Number.parseInt(trimmed, 10);
      if (!Number.isInteger(value) || value < 1 || value > 500) {
        setError("Kuota khusus harus bilangan bulat 1–500, atau dikosongkan.");
        return;
      }
      parsed = value;
    }
    void save(parsed, closed, "save");
  }

  return (
    <li className="px-5 py-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 sm:min-w-52">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-ink">
              {formatDateID(day.date)}
            </p>
            {day.isToday ? <Badge tone="blue">Hari ini</Badge> : null}
            {day.overrideQuota !== null ? (
              <Badge tone="violet">Kuota khusus</Badge>
            ) : null}
            {day.dateClosed ? <Badge tone="red">Tutup</Badge> : null}
          </div>
          <p className="mt-1 text-xs text-ink-muted">
            {day.booked} reservasi aktif dari kuota {day.quota} · sisa{" "}
            {day.remaining}
            {day.overrideQuota === null ? ` · default ${defaultQuota}` : ""}
          </p>
        </div>

        <form
          onSubmit={handleSave}
          className="flex flex-wrap items-end gap-2.5"
        >
          <div>
            <label
              htmlFor={`date-quota-${day.date}`}
              className="mb-1.5 block text-xs font-medium text-ink-muted"
            >
              Kuota khusus
            </label>
            <Input
              id={`date-quota-${day.date}`}
              type="number"
              min={1}
              max={500}
              step={1}
              value={quota}
              onChange={(event) => setQuota(event.target.value)}
              placeholder={`${defaultQuota}`}
              className="w-24 sm:w-28"
            />
          </div>

          <label className="flex h-9 items-center gap-2 text-xs font-medium text-ink-muted">
            <input
              type="checkbox"
              checked={closed}
              onChange={(event) => setClosed(event.target.checked)}
              className="h-4 w-4 rounded border-line accent-danger focus:ring-danger/30"
            />
            Tutup tanggal
          </label>

          <Button type="submit" size="sm" disabled={pending !== null}>
            {pending === "save" ? "Menyimpan..." : "Simpan"}
          </Button>
          {hasOverride ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={pending !== null}
              onClick={() => {
                setQuota("");
                setClosed(false);
                void save(null, false, "reset");
              }}
            >
              {pending === "reset" ? "..." : "Reset"}
            </Button>
          ) : null}
        </form>
      </div>

      {error ? (
        <div className="mt-2">
          <Alert tone="error">{error}</Alert>
        </div>
      ) : null}
      {message ? (
        <div className="mt-2">
          <Alert tone="success">{message}</Alert>
        </div>
      ) : null}
      {warning ? (
        <div className="mt-2">
          <Alert tone="warning">{warning}</Alert>
        </div>
      ) : null}
    </li>
  );
}
