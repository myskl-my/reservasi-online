import {
  getActiveReservationCount,
  getAppSettings,
  getDailyOverride,
} from "@/lib/data/settings";
import {
  getReservationStatusCounts,
  getTodayReservationsByStatus,
  listReservationsForAdmin,
  type ReservationRow,
} from "@/lib/data/reservations";
import {
  getWalkInStatusCounts,
  listWalkInsByDate,
  type WalkInRow,
} from "@/lib/data/walk-ins";
import type { AppSettings, ReservationStatus, WalkInStatus } from "@/lib/types";

export interface CurrentServiceItem {
  kind: "ONLINE" | "WALK_IN";
  id: string;
  queueNumber: number;
  customerName: string;
  status: ReservationStatus;
  calledAt: string | null;
  startedAt: string | null;
}

export interface DashboardData {
  today: string;
  settings: AppSettings;
  quota: number;
  overrideQuota: number | null;
  dateClosed: boolean;
  activeCount: number;
  remaining: number;
  onlineCounts: Record<ReservationStatus, number>;
  walkInCounts: Record<WalkInStatus, number>;
  currentServices: CurrentServiceItem[];
  recentReservations: ReservationRow[];
}

export async function getDashboardData(today: string): Promise<DashboardData> {
  const [
    settings,
    override,
    activeCount,
    onlineCounts,
    walkInCounts,
  ] = await Promise.all([
    getAppSettings(),
    getDailyOverride(today),
    getActiveReservationCount(today),
    getReservationStatusCounts(today),
    getWalkInStatusCounts(today),
  ]);

  const [calledReservations, inServiceReservations, walkIns, reservations] =
    await Promise.all([
      getTodayReservationsByStatus(today, "CALLED"),
      getTodayReservationsByStatus(today, "IN_SERVICE"),
      listWalkInsByDate(today),
      listReservationsForAdmin({ date: today }),
    ]);

  const currentServices: CurrentServiceItem[] = [
    ...calledReservations.map((row) => toCurrentService("ONLINE", row)),
    ...inServiceReservations.map((row) => toCurrentService("ONLINE", row)),
    ...walkIns
      .filter((row) => row.status === "CALLED" || row.status === "IN_SERVICE")
      .map((row) => toCurrentService("WALK_IN", row)),
  ].sort((left, right) => {
    if (left.status === right.status) return left.queueNumber - right.queueNumber;
    return left.status === "IN_SERVICE" ? -1 : 1;
  });

  const quota = override?.maxQuota ?? settings.defaultDailyQuota;

  return {
    today,
    settings,
    quota,
    overrideQuota: override?.maxQuota ?? null,
    dateClosed: override?.isClosed ?? false,
    activeCount,
    remaining: Math.max(0, quota - activeCount),
    onlineCounts,
    walkInCounts,
    currentServices,
    recentReservations: [...reservations]
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, 8),
  };
}

function toCurrentService(
  kind: "ONLINE" | "WALK_IN",
  row: ReservationRow | WalkInRow,
): CurrentServiceItem {
  return {
    kind,
    id: row.id,
    queueNumber: row.queueNumber,
    customerName: row.customerName,
    status: row.status,
    calledAt: row.calledAt,
    startedAt: row.startedAt,
  };
}
