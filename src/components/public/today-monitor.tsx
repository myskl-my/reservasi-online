"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import {
  availabilityStateLabel,
  capacityUsedPercent,
  getAvailabilityState,
  type AvailabilityState,
} from "@/lib/availability";
import { useAvailabilityPolling } from "@/lib/client/use-availability";
import { formatDateID } from "@/lib/dates";
import type { AvailabilityResult } from "@/lib/types";

const BADGE_TONE: Record<
  AvailabilityState,
  "neutral" | "amber" | "green" | "red"
> = {
  available: "green",
  almost_full: "amber",
  full: "red",
  closed: "neutral",
  online_disabled: "neutral",
};

const BAR_CLASSES: Record<AvailabilityState, string> = {
  available: "bg-success",
  almost_full: "bg-warning",
  full: "bg-danger",
  closed: "bg-ink-muted/60",
  online_disabled: "bg-ink-muted/60",
};

export function TodayMonitor({
  initialAvailability,
}: {
  initialAvailability: AvailabilityResult;
}) {
  const { availability, connection, refresh } =
    useAvailabilityPolling(initialAvailability);
  const today =
    availability.days.find((day) => day.isToday) ?? availability.days[0];

  if (!today) {
    return (
      <Card>
        <CardBody className="py-10 text-center text-sm text-ink-muted">
          Jadwal reservasi belum tersedia.
        </CardBody>
      </Card>
    );
  }

  const state = getAvailabilityState(today, availability.onlineBookingEnabled);
  const stateLabel = availabilityStateLabel(state);
  const usedPercent = capacityUsedPercent(today);

  return (
    <Card className="overflow-hidden">
      <CardBody className="space-y-7 p-6 sm:p-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-[0.12em] text-ink-muted uppercase">
              Antrean online hari ini
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-ink sm:text-[22px]">
              {formatDateID(today.date)}
            </h2>
          </div>
          <Badge tone={BADGE_TONE[state]}>{stateLabel}</Badge>
        </div>

        <div>
          <div className="flex items-end gap-2">
            <p className="text-5xl font-semibold leading-none tracking-tight text-ink tabular-nums sm:text-6xl">
              {today.booked}
            </p>
            <p className="pb-1.5 text-sm text-ink-muted">
              dari {today.quota} kuota
            </p>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            {state === "online_disabled"
              ? "Reservasi online sementara dinonaktifkan."
              : state === "closed"
                ? "Reservasi online ditutup untuk hari ini."
                : state === "full"
                  ? "Kuota hari ini penuh. Silakan pilih tanggal lain."
                  : `Tersisa ${today.remaining} tempat untuk hari ini.`}
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs text-ink-muted">
            <span>Kapasitas terisi</span>
            <span className="font-semibold text-ink tabular-nums">
              {usedPercent}%
            </span>
          </div>
          <div
            role="progressbar"
            aria-label="Kapasitas antrean hari ini"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={usedPercent}
            className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted"
          >
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-300",
                BAR_CLASSES[state],
              )}
              style={{ width: `${usedPercent}%` }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Link href="/booking" className={buttonClassName({ className: "w-full" })}>
            Reservasi
          </Link>
          <Link
            href="/booking#tanggal"
            className={buttonClassName({
              variant: "secondary",
              className: "w-full",
            })}
          >
            Lihat Tanggal Lain
          </Link>
          <Link
            href="/booking/status"
            className={buttonClassName({
              variant: "secondary",
              className: "w-full",
            })}
          >
            Cek Status Antrean
          </Link>
        </div>

        <div className="border-t border-line pt-4 text-center text-xs">
          {connection === "offline" ? (
            <span className="text-warning">
              Data mungkin belum terbaru.{" "}
              <button
                type="button"
                onClick={() => void refresh()}
                className="font-semibold underline underline-offset-2"
              >
                Coba lagi
              </button>
            </span>
          ) : null}
        </div>
      </CardBody>
    </Card>
  );
}
