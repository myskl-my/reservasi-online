"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  RefreshCw,
  Search,
  WifiOff,
} from "lucide-react";
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
  available: "bg-gradient-accent",
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
      {/* Header gradient: memberi bobot visual pada kartu utama. */}
      <div className="bg-gradient-accent relative overflow-hidden px-6 py-5 sm:px-8 sm:py-6">
        <div
          aria-hidden="true"
          className="absolute -top-16 -right-12 h-40 w-40 rounded-full bg-white/15 blur-2xl"
        />
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.16em] text-white/80 uppercase">
              <span className="animate-pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-white" />
              Live · antrean hari ini
            </p>
            <h2 className="mt-2 flex items-center gap-2 text-xl font-bold tracking-tight text-white sm:text-[22px]">
              <CalendarDays aria-hidden="true" className="h-5 w-5" strokeWidth={2.2} />
              {formatDateID(today.date)}
            </h2>
          </div>
          <Badge tone={BADGE_TONE[state]} className="bg-white/95">
            {stateLabel}
          </Badge>
        </div>
      </div>

      <CardBody className="space-y-7 p-6 sm:p-8">
        <div>
          <div className="flex items-end gap-2.5">
            <p className="text-6xl font-bold leading-none tracking-tighter text-ink tabular-nums sm:text-7xl">
              {today.booked}
            </p>
            <p className="pb-2 text-sm font-medium text-ink-muted">
              dari <span className="font-bold text-ink">{today.quota}</span> kuota
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
            <span className="font-medium">Kapasitas terisi</span>
            <span className="font-bold text-ink tabular-nums">
              {usedPercent}%
            </span>
          </div>
          <div
            role="progressbar"
            aria-label="Kapasitas antrean hari ini"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={usedPercent}
            className="mt-2.5 h-3 overflow-hidden rounded-full bg-surface-muted ring-1 ring-line"
          >
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-500 ease-out",
                BAR_CLASSES[state],
              )}
              style={{ width: `${usedPercent}%` }}
            />
          </div>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2">
          <Link
            href="/booking"
            className={buttonClassName({ size: "lg", className: "sm:col-span-2" })}
          >
            Reservasi Sekarang
            <ArrowRight aria-hidden="true" className="h-4 w-4" strokeWidth={2.4} />
          </Link>
          <Link
            href="/booking#tanggal"
            className={buttonClassName({ variant: "secondary", className: "w-full" })}
          >
            <CalendarDays aria-hidden="true" className="h-4 w-4" strokeWidth={2.2} />
            Tanggal Lain
          </Link>
          <Link
            href="/booking/status"
            className={buttonClassName({ variant: "secondary", className: "w-full" })}
          >
            <Search aria-hidden="true" className="h-4 w-4" strokeWidth={2.2} />
            Cek Status
          </Link>
        </div>

        {connection === "offline" ? (
          <div className="flex items-center justify-center gap-2 border-t border-line pt-4 text-xs font-medium text-warning">
            <WifiOff aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.2} />
            Data mungkin belum terbaru.
            <button
              type="button"
              onClick={() => void refresh()}
              className="inline-flex items-center gap-1 font-semibold underline underline-offset-2"
            >
              <RefreshCw aria-hidden="true" className="h-3 w-3" strokeWidth={2.4} />
              Coba lagi
            </button>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
