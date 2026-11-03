export type ReservationStatus =
  | "CONFIRMED"
  | "WAITING"
  | "CALLED"
  | "IN_SERVICE"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export type WalkInStatus = Exclude<ReservationStatus, "CONFIRMED">;

export const RESERVATION_STATUSES: ReservationStatus[] = [
  "CONFIRMED",
  "WAITING",
  "CALLED",
  "IN_SERVICE",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
];

export const WALK_IN_STATUSES: WalkInStatus[] = [
  "WAITING",
  "CALLED",
  "IN_SERVICE",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
];

export const ACTIVE_RESERVATION_STATUSES: ReservationStatus[] = [
  "CONFIRMED",
  "WAITING",
  "CALLED",
  "IN_SERVICE",
];

export const ACTIVE_WALK_IN_STATUSES: WalkInStatus[] = [
  "WAITING",
  "CALLED",
  "IN_SERVICE",
];

export interface StatusMeta {
  label: string;
  description: string;
  badgeClassName: string;
}

export const STATUS_META: Record<ReservationStatus, StatusMeta> = {
  CONFIRMED: {
    label: "Terkonfirmasi",
    description: "Reservasi dikonfirmasi, pelanggan belum check-in.",
    badgeClassName: "bg-info-soft text-info ring-info/25",
  },
  WAITING: {
    label: "Menunggu",
    description: "Pelanggan sudah check-in dan menunggu dipanggil.",
    badgeClassName: "bg-warning-soft text-warning ring-warning/25",
  },
  CALLED: {
    label: "Dipanggil",
    description: "Pelanggan sedang dipanggil.",
    badgeClassName: "bg-plum-soft text-plum ring-plum/25",
  },
  IN_SERVICE: {
    label: "Dilayani",
    description: "Pelanggan sedang dilayani.",
    badgeClassName: "bg-success-soft text-success ring-success/25",
  },
  COMPLETED: {
    label: "Selesai",
    description: "Layanan selesai.",
    badgeClassName: "bg-surface-muted text-ink-muted ring-line",
  },
  CANCELLED: {
    label: "Dibatalkan",
    description: "Reservasi dibatalkan dan tidak dihitung dalam kuota aktif.",
    badgeClassName: "bg-danger-soft text-danger ring-danger/25",
  },
  NO_SHOW: {
    label: "Tidak hadir",
    description: "Pelanggan tidak hadir dan tidak dihitung dalam kuota aktif.",
    badgeClassName: "bg-danger-soft text-danger ring-danger/25",
  },
};

export interface AppSettings {
  onlineBookingEnabled: boolean;
  defaultDailyQuota: number;
}

export interface AvailabilityDay {
  date: string;
  quota: number;
  booked: number;
  remaining: number;
  isClosed: boolean;
  dateClosed: boolean;
  isAvailable: boolean;
  isToday: boolean;
  overrideQuota: number | null;
}

export interface AvailabilityResult {
  onlineBookingEnabled: boolean;
  defaultDailyQuota: number;
  timezone: string;
  days: AvailabilityDay[];
}

export interface BookingConfirmation {
  bookingCode: string;
  queueNumber: number;
  bookingDate: string;
  customerName: string;
  status: ReservationStatus;
  createdAt: string;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
}

export interface PublicReservationStatus {
  bookingCode: string;
  bookingDate: string;
  customerName: string;
  customerPhoneMasked: string;
  queueNumber: number;
  status: ReservationStatus;
  position: number | null;
  checkedInAt: string | null;
  calledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

export interface ApiFailure {
  ok: false;
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
