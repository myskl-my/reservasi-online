"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/cn";
import {
  availabilityStateLabel,
  getAvailabilityState,
  type AvailabilityState,
} from "@/lib/availability";
import { dayNumberID, formatDateID } from "@/lib/dates";
import type { AvailabilityDay, AvailabilityResult } from "@/lib/types";

const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

/** Warna titik status kuota (dipakai indikator & legenda). */
const DOT_CLASSES: Record<AvailabilityState, string> = {
  available: "bg-success",
  almost_full: "bg-warning",
  full: "bg-ink-muted/35",
  closed: "bg-ink-muted/25",
  online_disabled: "bg-ink-muted/25",
};

const STATE_TONE: Record<AvailabilityState, string> = {
  available: "text-success",
  almost_full: "text-warning",
  full: "text-danger",
  closed: "text-ink-muted",
  online_disabled: "text-ink-muted",
};

/** Gaya dasar sel kalender per status. */
const CELL_CLASSES: Record<AvailabilityState, string> = {
  available:
    "border-line bg-surface text-ink hover:border-accent/45 hover:bg-accent-soft hover:shadow-card",
  almost_full:
    "border-warning/25 bg-warning-soft/50 text-ink hover:border-warning/50 hover:shadow-card",
  full: "border-transparent bg-surface-muted/70 text-ink-muted/55 cursor-not-allowed",
  closed: "border-transparent bg-surface-muted/70 text-ink-muted/45 cursor-not-allowed",
  online_disabled:
    "border-transparent bg-surface-muted/70 text-ink-muted/45 cursor-not-allowed",
};

/**
 * Ukuran sel: kotak (aspect-square) di mobile agar tinggi mengikuti lebar,
 * dan tetap seperti semula (tinggi minimum tetap) di layar lebih lebar.
 */
const CELL_SIZE =
  "aspect-square w-full min-w-0 sm:aspect-auto sm:min-h-[4.25rem]";
const MUTED_CELL_SIZE =
  "flex aspect-square w-full min-w-0 items-center justify-center rounded-control bg-surface-muted/30 text-xs text-ink-muted/35 sm:aspect-auto sm:min-h-[4.25rem]";

function monthKey(dateString: string): string {
  return dateString.slice(0, 7);
}

function monthLabel(key: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${key}-01T00:00:00Z`));
}

function buildMonthCells(key: string): Array<string | null> {
  const [year, month] = key.split("-").map(Number);
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const leading = (firstDay.getUTCDay() + 6) % 7;
  const totalDays = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: Array<string | null> = Array.from({ length: leading }, () => null);

  for (let day = 1; day <= totalDays; day += 1) {
    cells.push(
      `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    );
  }

  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function DateCalendar({
  availability,
  selectedDate,
  onSelect,
}: {
  availability: AvailabilityResult;
  selectedDate: string;
  onSelect: (date: string) => void;
}) {
  const days = availability.days;
  const firstDate = days[0]?.date ?? "";
  const lastDate = days[days.length - 1]?.date ?? "";
  const firstMonth = firstDate ? monthKey(firstDate) : "";
  const lastMonth = lastDate ? monthKey(lastDate) : "";
  const [visibleMonth, setVisibleMonth] = useState(() =>
    selectedDate ? monthKey(selectedDate) : firstMonth,
  );
  const [direction, setDirection] = useState<1 | -1>(1);
  const [animateKey, setAnimateKey] = useState(0);
  const headingRef = useRef<HTMLParagraphElement>(null);

  // Ganti arah animasi slide saat pindah bulan.
  function goMonth(next: string, dir: 1 | -1) {
    setDirection(dir);
    setVisibleMonth(next);
    setAnimateKey((key) => key + 1);
  }

  useEffect(() => {
    if (direction === 1) headingRef.current?.focus();
  }, [animateKey, direction]);

  if (!firstDate) {
    return (
      <p className="rounded-card bg-surface-muted/60 px-4 py-10 text-center text-sm text-ink-muted">
        Jadwal reservasi belum tersedia.
      </p>
    );
  }

  const dayByDate = new Map(days.map((day) => [day.date, day]));
  const canGoPrevious = visibleMonth > firstMonth;
  const canGoNext = visibleMonth < lastMonth;
  const selectedDay = selectedDate ? dayByDate.get(selectedDate) : undefined;

  return (
    <div className="space-y-4">
      {!availability.onlineBookingEnabled ? (
        <Alert tone="warning" title="Reservasi online nonaktif">
          Reservasi online sedang dinonaktifkan. Reservasi yang sudah
          dikonfirmasi tetap berlaku.
        </Alert>
      ) : null}

      {/* Panel kalender utama */}
      <div className="rounded-card border border-line bg-surface p-3 shadow-card sm:p-4">
        {/* Header bulan */}
        <div className="mb-4 flex items-center justify-between gap-2">
          <button
            type="button"
            aria-label="Bulan sebelumnya"
            disabled={!canGoPrevious}
            onClick={() => goMonth(previousMonth(visibleMonth), -1)}
            className="flex h-10 w-10 items-center justify-center rounded-control border border-line bg-surface text-ink-muted transition-all duration-150 hover:border-accent/40 hover:bg-accent-soft hover:text-accent-strong disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-line disabled:hover:bg-surface disabled:hover:text-ink-muted"
          >
            <ChevronLeft aria-hidden="true" className="h-5 w-5" strokeWidth={2.4} />
          </button>

          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="flex h-8 w-8 items-center justify-center rounded-control bg-accent-soft text-accent-strong"
            >
              <CalendarDays aria-hidden="true" className="h-4 w-4" strokeWidth={2.2} />
            </span>
            <p
              ref={headingRef}
              tabIndex={-1}
              aria-live="polite"
              className="text-[15px] font-bold capitalize tracking-tight text-ink outline-none"
            >
              {monthLabel(visibleMonth)}
            </p>
          </div>

          <button
            type="button"
            aria-label="Bulan berikutnya"
            disabled={!canGoNext}
            onClick={() => goMonth(nextMonth(visibleMonth), 1)}
            className="flex h-10 w-10 items-center justify-center rounded-control border border-line bg-surface text-ink-muted transition-all duration-150 hover:border-accent/40 hover:bg-accent-soft hover:text-accent-strong disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-line disabled:hover:bg-surface disabled:hover:text-ink-muted"
          >
            <ChevronRight aria-hidden="true" className="h-5 w-5" strokeWidth={2.4} />
          </button>
        </div>

        {/* Header hari dalam seminggu */}
        <div className="grid grid-cols-7 gap-1.5 pb-1.5 sm:gap-2">
          {WEEKDAYS.map((weekday) => (
            <div
              key={weekday}
              className="text-center text-[10px] font-bold tracking-[0.1em] text-ink-muted uppercase"
            >
              {weekday}
            </div>
          ))}
        </div>

        {/* Grid hari */}
        <div
          key={animateKey}
          className={cn(
            "grid grid-cols-7 gap-1.5 sm:gap-2",
            direction === 1 ? "animate-slide-in-right" : "animate-fade-in",
          )}
        >
          {buildMonthCells(visibleMonth).map((date, index) => {
            if (!date) {
              return <div key={`empty-${index}`} aria-hidden="true" />;
            }

            const day = dayByDate.get(date);
            if (!day) {
              return (
                <div key={date} className={MUTED_CELL_SIZE} aria-hidden="true">
                  {dayNumberID(date)}
                </div>
              );
            }

            return (
              <CalendarDay
                key={date}
                day={day}
                onlineBookingEnabled={availability.onlineBookingEnabled}
                selected={selectedDate === date && day.isAvailable}
                onSelect={() => onSelect(date)}
              />
            );
          })}
        </div>
      </div>

      {/* Indikator sisa kuota untuk tanggal terpilih */}
      <SelectedDateInfo
        selectedDate={selectedDate}
        day={selectedDay}
        onlineBookingEnabled={availability.onlineBookingEnabled}
      />

      {/* Legenda warna indikator */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-medium text-ink-muted">
        <LegendDot className="bg-success" label="Tersedia" />
        <LegendDot className="bg-warning" label="Hampir penuh" />
        <LegendDot className="bg-ink-muted/35" label="Penuh" />
        <LegendDot className="bg-ink-muted/25" label="Tutup" />
        {!availability.onlineBookingEnabled ? (
          <LegendDot className="bg-ink-muted/25" label="Online nonaktif" />
        ) : null}
      </div>
    </div>
  );
}

function CalendarDay({
  day,
  onlineBookingEnabled,
  selected,
  onSelect,
}: {
  day: AvailabilityDay;
  onlineBookingEnabled: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const state = getAvailabilityState(day, onlineBookingEnabled);
  const label = availabilityStateLabel(state);
  const disabled = !day.isAvailable;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${formatDateID(day.date)}, ${label}${
        state === "available" || state === "almost_full"
          ? `, sisa ${day.remaining} tempat`
          : ""
      }${day.isToday ? ", hari ini" : ""}`}
      title={`${formatDateID(day.date)} - ${label}`}
      className={cn(
        "relative flex items-center justify-center rounded-control border text-sm font-bold tabular-nums transition-[background-color,border-color,box-shadow] duration-150 sm:text-base",
        CELL_SIZE,
        selected
          ? "border-transparent bg-gradient-accent text-white shadow-glow-accent"
          : CELL_CLASSES[state],
        !selected && day.isToday && !disabled
          ? "ring-2 ring-accent/50 ring-offset-1 ring-offset-surface"
          : null,
      )}
    >
      {dayNumberID(day.date)}
    </button>
  );
}

function SelectedDateInfo({
  selectedDate,
  day,
  onlineBookingEnabled,
}: {
  selectedDate: string;
  day: AvailabilityDay | undefined;
  onlineBookingEnabled: boolean;
}) {
  if (!selectedDate) {
    return (
      <div className="flex items-center gap-2.5 rounded-card border border-dashed border-line bg-surface-muted/40 px-4 py-3 text-xs font-medium text-ink-muted">
        <CalendarDays aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={2.2} />
        Pilih tanggal untuk melihat sisa kuota.
      </div>
    );
  }

  const dateLabel = formatDateID(selectedDate);

  if (!day) {
    return (
      <div
        aria-live="polite"
        className="flex items-center justify-between gap-3 rounded-card border border-line bg-surface-muted/50 px-4 py-3"
      >
        <DateInfo dateLabel={dateLabel} dotClassName="bg-ink-muted/30" />
        <span className="shrink-0 text-xs font-semibold text-ink-muted">
          Tanpa data kuota
        </span>
      </div>
    );
  }

  const state = getAvailabilityState(day, onlineBookingEnabled);
  const hasQuota = state === "available" || state === "almost_full";

  return (
    <div
      aria-live="polite"
      className={cn(
        "flex items-center justify-between gap-3 rounded-card border px-4 py-3",
        state === "available" && "border-success/25 bg-success-soft/50",
        state === "almost_full" && "border-warning/30 bg-warning-soft/60",
        !hasQuota && "border-line bg-surface-muted/60",
      )}
    >
      <DateInfo dateLabel={dateLabel} dotClassName={DOT_CLASSES[state]} />

      {hasQuota ? (
        <div className="shrink-0 text-right">
          <p
            className={cn(
              "text-2xl font-bold leading-none tabular-nums",
              STATE_TONE[state],
            )}
          >
            {day.remaining}
          </p>
          <p className="mt-0.5 text-[10px] font-semibold tracking-wide text-ink-muted uppercase">
            sisa dari {day.quota}
          </p>
        </div>
      ) : (
        <span
          className={cn(
            "shrink-0 text-sm font-bold",
            STATE_TONE[state],
          )}
        >
          {availabilityStateLabel(state)}
        </span>
      )}
    </div>
  );
}

function DateInfo({
  dateLabel,
  dotClassName,
}: {
  dateLabel: string;
  dotClassName: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span
        aria-hidden="true"
        className={cn("h-2.5 w-2.5 shrink-0 rounded-full", dotClassName)}
      />
      <div className="min-w-0">
        <p className="text-[10px] font-bold tracking-wide text-ink-muted uppercase">
          Tanggal dipilih
        </p>
        <p className="truncate text-sm font-bold text-ink">{dateLabel}</p>
      </div>
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className={cn("h-2 w-2 shrink-0 rounded-full", className)}
      />
      {label}
    </span>
  );
}

function previousMonth(key: string): string {
  const [year, month] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 2, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function nextMonth(key: string): string {
  const [year, month] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}
