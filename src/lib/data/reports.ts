import { db } from "@/lib/db";

export interface ReportTotals {
  onlineTotal: number;
  onlineCompleted: number;
  onlineCancelled: number;
  onlineNoShow: number;
  onlineActive: number;
  walkInTotal: number;
  walkInCompleted: number;
  walkInCancelled: number;
  walkInNoShow: number;
  walkInActive: number;
}

export interface ReportDayRow {
  date: string;
  onlineTotal: number;
  onlineCompleted: number;
  onlineCancelled: number;
  onlineNoShow: number;
  walkInTotal: number;
  walkInCompleted: number;
  walkInCancelled: number;
  walkInNoShow: number;
}

export interface ReportData {
  totals: ReportTotals;
  days: ReportDayRow[];
}

function numberOrZero(value: number | null | undefined): number {
  return Number(value ?? 0);
}

export async function getReportData(from: string, to: string): Promise<ReportData> {
  const onlineTotals = await db.get<{
    total: number;
    completed: number | null;
    cancelled: number | null;
    noShow: number | null;
    active: number | null;
  }>(
    `
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled,
        SUM(CASE WHEN status = 'NO_SHOW' THEN 1 ELSE 0 END) AS noShow,
        SUM(CASE WHEN status IN ('CONFIRMED', 'WAITING', 'CALLED', 'IN_SERVICE') THEN 1 ELSE 0 END) AS active
      FROM reservations
      WHERE booking_date BETWEEN ? AND ?
    `,
    from,
    to,
  );

  const walkInTotals = await db.get<{
    total: number;
    completed: number | null;
    cancelled: number | null;
    noShow: number | null;
    active: number | null;
  }>(
    `
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled,
        SUM(CASE WHEN status = 'NO_SHOW' THEN 1 ELSE 0 END) AS noShow,
        SUM(CASE WHEN status IN ('WAITING', 'CALLED', 'IN_SERVICE') THEN 1 ELSE 0 END) AS active
      FROM walk_ins
      WHERE walk_in_date BETWEEN ? AND ?
    `,
    from,
    to,
  );

  const onlineDays = await db.all<{
    date: string;
    total: number;
    completed: number | null;
    cancelled: number | null;
    noShow: number | null;
  }>(
    `
      SELECT
        booking_date AS date,
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled,
        SUM(CASE WHEN status = 'NO_SHOW' THEN 1 ELSE 0 END) AS noShow
      FROM reservations
      WHERE booking_date BETWEEN ? AND ?
      GROUP BY booking_date
      ORDER BY booking_date ASC
    `,
    from,
    to,
  );

  const walkInDays = await db.all<{
    date: string;
    total: number;
    completed: number | null;
    cancelled: number | null;
    noShow: number | null;
  }>(
    `
      SELECT
        walk_in_date AS date,
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled,
        SUM(CASE WHEN status = 'NO_SHOW' THEN 1 ELSE 0 END) AS noShow
      FROM walk_ins
      WHERE walk_in_date BETWEEN ? AND ?
      GROUP BY walk_in_date
      ORDER BY walk_in_date ASC
    `,
    from,
    to,
  );

  const dayMap = new Map<string, ReportDayRow>();
  for (const row of onlineDays) {
    dayMap.set(row.date, {
      date: row.date,
      onlineTotal: Number(row.total),
      onlineCompleted: numberOrZero(row.completed),
      onlineCancelled: numberOrZero(row.cancelled),
      onlineNoShow: numberOrZero(row.noShow),
      walkInTotal: 0,
      walkInCompleted: 0,
      walkInCancelled: 0,
      walkInNoShow: 0,
    });
  }
  for (const row of walkInDays) {
    const existing = dayMap.get(row.date) ?? {
      date: row.date,
      onlineTotal: 0,
      onlineCompleted: 0,
      onlineCancelled: 0,
      onlineNoShow: 0,
      walkInTotal: 0,
      walkInCompleted: 0,
      walkInCancelled: 0,
      walkInNoShow: 0,
    };
    existing.walkInTotal = Number(row.total);
    existing.walkInCompleted = numberOrZero(row.completed);
    existing.walkInCancelled = numberOrZero(row.cancelled);
    existing.walkInNoShow = numberOrZero(row.noShow);
    dayMap.set(row.date, existing);
  }

  return {
    totals: {
      onlineTotal: numberOrZero(onlineTotals?.total),
      onlineCompleted: numberOrZero(onlineTotals?.completed),
      onlineCancelled: numberOrZero(onlineTotals?.cancelled),
      onlineNoShow: numberOrZero(onlineTotals?.noShow),
      onlineActive: numberOrZero(onlineTotals?.active),
      walkInTotal: numberOrZero(walkInTotals?.total),
      walkInCompleted: numberOrZero(walkInTotals?.completed),
      walkInCancelled: numberOrZero(walkInTotals?.cancelled),
      walkInNoShow: numberOrZero(walkInTotals?.noShow),
      walkInActive: numberOrZero(walkInTotals?.active),
    },
    days: Array.from(dayMap.values()).sort((left, right) =>
      left.date.localeCompare(right.date),
    ),
  };
}
