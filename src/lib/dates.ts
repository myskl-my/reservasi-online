export const APP_TIME_ZONE = "Asia/Jakarta";
export const BOOKING_HORIZON_DAYS = 30;
export const MAX_REPORT_DAYS = 31;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function todayDateString(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") map[part.type] = part.value;
  }
  return `${map.year}-${map.month}-${map.day}`;
}

export function isValidDateString(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function addDays(dateString: string, days: number): string {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

export function dateRange(startDate: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => addDays(startDate, index));
}

export function isDateInBookingWindow(
  dateString: string,
  today: string = todayDateString(),
): boolean {
  if (!isValidDateString(dateString)) return false;
  return dateString >= today && dateString <= addDays(today, BOOKING_HORIZON_DAYS - 1);
}

export function isPastDate(dateString: string, today: string = todayDateString()): boolean {
  return dateString < today;
}

export function formatDateID(dateString: string): string {
  if (!isValidDateString(dateString)) return dateString;
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${dateString}T00:00:00Z`));
}

export function formatDateShortID(dateString: string): string {
  if (!isValidDateString(dateString)) return dateString;
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${dateString}T00:00:00Z`));
}

export function weekdayShortID(dateString: string): string {
  if (!isValidDateString(dateString)) return dateString;
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    timeZone: "UTC",
  }).format(new Date(`${dateString}T00:00:00Z`));
}

export function dayNumberID(dateString: string): string {
  if (!isValidDateString(dateString)) return dateString;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${dateString}T00:00:00Z`));
}

export function monthShortID(dateString: string): string {
  if (!isValidDateString(dateString)) return dateString;
  return new Intl.DateTimeFormat("id-ID", {
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${dateString}T00:00:00Z`));
}

export function formatDateTimeID(isoString: string | null): string {
  if (!isoString) return "-";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: APP_TIME_ZONE,
  }).format(date);
}

export function formatTimeID(isoString: string | null): string {
  if (!isoString) return "-";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: APP_TIME_ZONE,
  }).format(date);
}

export function daysBetweenInclusive(from: string, to: string): number {
  const fromDate = new Date(`${from}T00:00:00Z`).getTime();
  const toDate = new Date(`${to}T00:00:00Z`).getTime();
  return Math.floor((toDate - fromDate) / 86_400_000) + 1;
}
