import { db } from "@/lib/db";
import {
  ACTIVE_RESERVATION_STATUSES,
  type AppSettings,
  type AvailabilityDay,
  type AvailabilityResult,
  type ReservationStatus,
} from "@/lib/types";
import {
  BOOKING_HORIZON_DAYS,
  addDays,
  dateRange,
  nowIso,
  todayDateString,
} from "@/lib/dates";

export interface DailyOverride {
  date: string;
  maxQuota: number | null;
  isClosed: boolean;
}

const ACTIVE_PLACEHOLDERS = ACTIVE_RESERVATION_STATUSES.map(() => "?").join(", ");

export async function getAppSettings(): Promise<AppSettings> {
  const rows = await db.all<{ key: string; value: string }>(
    `
      SELECT key, value FROM app_settings
      WHERE key IN ('online_booking_enabled', 'default_daily_quota')
    `,
  );
  const map = new Map(rows.map((row) => [row.key, row.value]));

  const onlineRaw = map.get("online_booking_enabled");
  const quotaRaw = Number.parseInt(map.get("default_daily_quota") ?? "20", 10);
  const defaultDailyQuota = Number.isFinite(quotaRaw)
    ? Math.min(500, Math.max(1, quotaRaw))
    : 20;

  return {
    onlineBookingEnabled: onlineRaw !== "false",
    defaultDailyQuota,
  };
}

export async function updateAppSettings(input: AppSettings): Promise<void> {
  const now = nowIso();
  await db.batch([
    {
      sql: `
        INSERT INTO app_settings (key, value, updated_at) VALUES ('online_booking_enabled', ?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
      `,
      params: [input.onlineBookingEnabled ? "true" : "false", now],
    },
    {
      sql: `
        INSERT INTO app_settings (key, value, updated_at) VALUES ('default_daily_quota', ?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
      `,
      params: [String(input.defaultDailyQuota), now],
    },
  ]);
}

export async function getDailyOverride(date: string): Promise<DailyOverride | null> {
  const row = await db.get<{
    booking_date: string;
    max_quota: number | null;
    is_closed: number;
  }>(
    "SELECT booking_date, max_quota, is_closed FROM daily_settings WHERE booking_date = ?",
    date,
  );
  if (!row) return null;
  return {
    date: row.booking_date,
    maxQuota: row.max_quota === null ? null : Number(row.max_quota),
    isClosed: row.is_closed === 1,
  };
}

export async function setDailyOverride(input: {
  date: string;
  maxQuota: number | null;
  isClosed: boolean;
}): Promise<void> {
  if (input.maxQuota === null && !input.isClosed) {
    await db.run("DELETE FROM daily_settings WHERE booking_date = ?", input.date);
    return;
  }

  await db.run(
    `
      INSERT INTO daily_settings (booking_date, max_quota, is_closed, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(booking_date) DO UPDATE SET
        max_quota = excluded.max_quota,
        is_closed = excluded.is_closed,
        updated_at = excluded.updated_at
    `,
    input.date,
    input.maxQuota,
    input.isClosed ? 1 : 0,
    nowIso(),
  );
}

export async function getActiveReservationCount(date: string): Promise<number> {
  const row = await db.get<{ count: number }>(
    `
      SELECT COUNT(*) AS count FROM reservations
      WHERE booking_date = ? AND status IN (${ACTIVE_PLACEHOLDERS})
    `,
    date,
    ...ACTIVE_RESERVATION_STATUSES,
  );
  return Number(row?.count ?? 0);
}

export interface DailyCountRow {
  booking_date: string;
  count: number;
}

export async function getActiveCountsByDate(
  from: string,
  to: string,
): Promise<Map<string, number>> {
  const rows = await db.all<DailyCountRow>(
    `
      SELECT booking_date, COUNT(*) AS count FROM reservations
      WHERE booking_date BETWEEN ? AND ?
        AND status IN (${ACTIVE_PLACEHOLDERS})
      GROUP BY booking_date
    `,
    from,
    to,
    ...ACTIVE_RESERVATION_STATUSES,
  );
  return new Map(rows.map((row) => [row.booking_date, Number(row.count)]));
}

export async function getAvailability(options?: {
  today?: string;
  days?: number;
}): Promise<AvailabilityResult> {
  const today = options?.today ?? todayDateString();
  const days = options?.days ?? BOOKING_HORIZON_DAYS;
  const end = addDays(today, days - 1);
  const settings = await getAppSettings();

  const overrides = await db.all<{
    booking_date: string;
    max_quota: number | null;
    is_closed: number;
  }>(
    `
      SELECT booking_date, max_quota, is_closed FROM daily_settings
      WHERE booking_date BETWEEN ? AND ?
    `,
    today,
    end,
  );
  const overrideMap = new Map(
    overrides.map((row) => [
      row.booking_date,
      {
        maxQuota: row.max_quota === null ? null : Number(row.max_quota),
        isClosed: row.is_closed === 1,
      },
    ]),
  );

  const counts = await getActiveCountsByDate(today, end);

  const availabilityDays: AvailabilityDay[] = dateRange(today, days).map((date) => {
    const override = overrideMap.get(date);
    const quota = override?.maxQuota ?? settings.defaultDailyQuota;
    const booked = counts.get(date) ?? 0;
    const dateClosed = override?.isClosed ?? false;
    const remaining = Math.max(0, quota - booked);

    return {
      date,
      quota,
      booked,
      remaining,
      isClosed: !settings.onlineBookingEnabled || dateClosed,
      dateClosed,
      isAvailable: settings.onlineBookingEnabled && !dateClosed && remaining > 0,
      isToday: date === today,
      overrideQuota: override?.maxQuota ?? null,
    };
  });

  return {
    onlineBookingEnabled: settings.onlineBookingEnabled,
    defaultDailyQuota: settings.defaultDailyQuota,
    timezone: "Asia/Jakarta",
    days: availabilityDays,
  };
}

export function normalizeStatusFilter(value: string | null): ReservationStatus | null {
  if (!value) return null;
  const allowed: ReservationStatus[] = [
    "CONFIRMED",
    "WAITING",
    "CALLED",
    "IN_SERVICE",
    "COMPLETED",
    "CANCELLED",
    "NO_SHOW",
  ];
  return allowed.includes(value as ReservationStatus)
    ? (value as ReservationStatus)
    : null;
}
