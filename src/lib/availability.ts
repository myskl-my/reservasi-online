import type { AvailabilityDay } from "./types";

export type AvailabilityState =
  | "available"
  | "almost_full"
  | "full"
  | "closed"
  | "online_disabled";

const ALMOST_FULL_RATIO = 0.2;

export function almostFullThreshold(quota: number): number {
  return Math.max(1, Math.ceil(quota * ALMOST_FULL_RATIO));
}

export function getAvailabilityState(
  day: AvailabilityDay,
  onlineBookingEnabled: boolean,
): AvailabilityState {
  if (!onlineBookingEnabled) return "online_disabled";
  if (day.dateClosed) return "closed";
  if (day.remaining <= 0 || !day.isAvailable) return "full";
  if (day.remaining <= almostFullThreshold(day.quota)) return "almost_full";
  return "available";
}

export function availabilityStateLabel(state: AvailabilityState): string {
  switch (state) {
    case "almost_full":
      return "Hampir penuh";
    case "full":
      return "Penuh";
    case "closed":
      return "Tutup";
    case "online_disabled":
      return "Online nonaktif";
    default:
      return "Tersedia";
  }
}

export function capacityUsedPercent(day: AvailabilityDay): number {
  if (day.quota <= 0) return 100;
  return Math.min(
    100,
    Math.max(0, Math.round((day.booked / day.quota) * 100)),
  );
}
