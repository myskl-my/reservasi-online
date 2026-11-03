"use client";

import { useState } from "react";
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

const DOT_CLASSES: Record<AvailabilityState, string> = {
  available: "bg-success",
  almost_full: "bg-warning",
  full: "bg-ink-muted/40",
  closed: "border border-ink-muted/50 bg-transparent",
  online_disabled: "border border-ink-muted/40 bg-transparent",
};

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

  if (!firstDate) {
    return (
      <p className="rounded-control bg-surface-muted/60 px-4 py-8 text-center text-sm text-ink-muted">
        Jadwal reservasi belum tersedia.
      </p>
    );
  }

  const dayByDate = new Map(days.map((day) => [day.date, day]));
  const canGoPrevious = visibleMonth > firstMonth;
  const canGoNext = visibleMonth < lastMonth;

  return (
    <div className="space-y-4">
      {!availability.onlineBookingEnabled ? (
        <Alert tone="warning">
          Reservasi online sedang dinonaktifkan. Reservasi yang sudah
          dikonfirmasi tetap berlaku.
        </Alert>
      ) : null}

      <div className="rounded-control border border-line bg-surface p-3 sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <button
            type="button"
            aria-label="Bulan sebelumnya"
            disabled={!canGoPrevious}
            onClick={() => setVisibleMonth(previousMonth(visibleMonth))}
            className="flex h-9 w-9 items-center justify-center rounded-control border border-line bg-surface text-lg text-ink-muted transition-colors hover:border-ink-muted/30 hover:bg-surface-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-35"
          >
            ‹
          </button>
          <p className="text-sm font-semibold capitalize tracking-tight text-ink">
            {monthLabel(visibleMonth)}
          </p>
          <button
            type="button"
            aria-label="Bulan berikutnya"
            disabled={!canGoNext}
            onClick={() => setVisibleMonth(nextMonth(visibleMonth))}
            className="flex h-9 w-9 items-center justify-center rounded-control border border-line bg-surface text-lg text-ink-muted transition-colors hover:border-ink-muted/30 hover:bg-surface-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-35"
          >
            ›
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {WEEKDAYS.map((weekday) => (
            <div
              key={weekday}
              className="pb-1 text-center text-[10px] font-semibold tracking-[0.08em] text-ink-muted uppercase"
            >
              {weekday}
            </div>
          ))}

          {buildMonthCells(visibleMonth).map((date, index) => {
            if (!date) {
              return <div key={`empty-${index}`} aria-hidden="true" />;
            }

            const day = dayByDate.get(date);
            if (!day) {
              return (
                <div
                  key={date}
                  className="min-h-[3rem] rounded-control px-1 py-1.5 text-center text-xs text-ink-muted/40 sm:min-h-[4rem]"
                  aria-hidden="true"
                >
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

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-ink-muted">
        <LegendDot className="bg-success" label="Tersedia" />
        <LegendDot className="bg-warning" label="Hampir penuh" />
        <LegendDot className="bg-ink-muted/40" label="Penuh" />
        <LegendDot
          className="border border-ink-muted/50 bg-transparent"
          label="Tutup"
        />
        {!availability.onlineBookingEnabled ? (
          <LegendDot
            className="border border-ink-muted/40 bg-transparent"
            label="Online nonaktif"
          />
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
  const stateText =
    state === "available" || state === "almost_full"
      ? `Sisa ${day.remaining}`
      : state === "closed"
        ? "Tutup"
        : state === "full"
          ? "Penuh"
          : "";

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
        "flex min-h-[3rem] flex-col items-center justify-center rounded-control border px-1 py-1.5 transition-colors sm:min-h-[4rem]",
        selected
          ? "border-accent bg-accent text-white shadow-[0_1px_2px_rgba(41,40,36,0.16)]"
          : disabled
            ? "cursor-not-allowed border-transparent bg-surface-muted/50 text-ink-muted/55"
            : "border-line bg-surface text-ink hover:border-accent/50 hover:bg-accent-soft/70",
        !selected && day.isToday ? "ring-1 ring-accent/50" : null,
      )}
    >
      <span className="text-sm font-semibold leading-none">
        {dayNumberID(day.date)}
      </span>
      <span
        className={cn(
          "mt-1.5 flex items-center gap-1 text-[9px] leading-none",
          selected ? "text-white/80" : "text-ink-muted",
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            selected ? "bg-surface" : DOT_CLASSES[state],
          )}
        />
        {stateText}
      </span>
    </button>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden="true" className={cn("h-2 w-2 rounded-full", className)} />
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
