import { db } from "@/lib/db";
import { ApiError, conflict, notFound } from "@/lib/http";
import {
  getActiveReservationCount,
  getAppSettings,
  getDailyOverride,
} from "@/lib/data/settings";
import {
  BOOKING_HORIZON_DAYS,
  addDays,
  formatDateID,
  isDateInBookingWindow,
  isPastDate,
  nowIso,
  todayDateString,
} from "@/lib/dates";
import {
  generateBookingCode,
  maskPhone,
} from "@/lib/booking-code";
import {
  STATUS_META,
  type BookingConfirmation,
  type ReservationStatus,
} from "@/lib/types";

const ACTIVE_STATUS_SQL = "('CONFIRMED', 'WAITING', 'CALLED', 'IN_SERVICE')";
const PRE_SERVICE_STATUS_SQL = "('CONFIRMED', 'WAITING', 'CALLED')";

export interface ReservationRow {
  id: string;
  bookingCode: string;
  queueNumber: number;
  bookingDate: string;
  customerName: string;
  customerPhone: string;
  status: ReservationStatus;
  checkedInAt: string | null;
  calledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const RESERVATION_SELECT = `
  SELECT
    r.id,
    r.booking_code AS bookingCode,
    r.queue_number AS queueNumber,
    r.booking_date AS bookingDate,
    r.customer_name AS customerName,
    r.customer_phone AS customerPhone,
    r.status,
    r.checked_in_at AS checkedInAt,
    r.called_at AS calledAt,
    r.started_at AS startedAt,
    r.completed_at AS completedAt,
    r.cancelled_at AS cancelledAt,
    r.created_at AS createdAt,
    r.updated_at AS updatedAt
  FROM reservations r
`;

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.toLowerCase().includes("unique constraint failed")
  );
}

async function explainBookingRejection(date: string): Promise<never> {
  const settings = await getAppSettings();

  if (!settings.onlineBookingEnabled) {
    throw new ApiError(
      409,
      "BOOKING_DISABLED",
      "Reservasi online sedang dinonaktifkan. Silakan hubungi barbershop.",
    );
  }

  const override = await getDailyOverride(date);
  if (override?.isClosed) {
    throw new ApiError(
      409,
      "DATE_CLOSED",
      "Reservasi untuk tanggal ini sedang ditutup.",
    );
  }

  const booked = await getActiveReservationCount(date);
  const quota = override?.maxQuota ?? settings.defaultDailyQuota;
  if (booked >= quota) {
    throw new ApiError(
      409,
      "QUOTA_FULL",
      `Kuota reservasi untuk ${formatDateID(date)} sudah penuh.`,
    );
  }

  throw new ApiError(
    409,
    "BOOKING_REJECTED",
    "Reservasi tidak dapat dibuat saat ini. Silakan coba lagi.",
  );
}

export async function createBooking(input: {
  customerName: string;
  customerPhone: string;
  bookingDate: string;
}): Promise<BookingConfirmation> {
  const today = todayDateString();

  if (isPastDate(input.bookingDate, today)) {
    throw new ApiError(
      400,
      "DATE_IN_PAST",
      "Tanggal reservasi tidak boleh di masa lalu.",
    );
  }

  if (
    !isDateInBookingWindow(input.bookingDate, today) ||
    input.bookingDate > addDays(today, BOOKING_HORIZON_DAYS - 1)
  ) {
    throw new ApiError(
      400,
      "DATE_OUT_OF_RANGE",
      `Reservasi hanya dapat dibuat untuk ${BOOKING_HORIZON_DAYS} hari ke depan.`,
    );
  }

  const now = nowIso();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const id = crypto.randomUUID();
    const code = generateBookingCode();

    let changed = 0;
    try {
      const result = await db.run(
        `
          INSERT INTO reservations (
            id, booking_code, queue_number, booking_date,
            customer_name, customer_phone, status, created_at, updated_at
          )
          SELECT
            ?, ?,
            COALESCE((SELECT MAX(queue_number) FROM reservations WHERE booking_date = ?), 0) + 1,
            ?, ?, ?, 'CONFIRMED', ?, ?
          WHERE EXISTS (
            SELECT 1 FROM app_settings
            WHERE key = 'online_booking_enabled' AND value = 'true'
          )
          AND COALESCE(
            (SELECT is_closed FROM daily_settings WHERE booking_date = ?), 0
          ) = 0
          AND (
            SELECT COUNT(*) FROM reservations
            WHERE booking_date = ? AND status IN ${ACTIVE_STATUS_SQL}
          ) < COALESCE(
            (SELECT max_quota FROM daily_settings WHERE booking_date = ?),
            CAST((SELECT value FROM app_settings WHERE key = 'default_daily_quota') AS INTEGER)
          )
        `,
        id,
        code,
        input.bookingDate,
        input.bookingDate,
        input.customerName,
        input.customerPhone,
        now,
        now,
        input.bookingDate,
        input.bookingDate,
        input.bookingDate,
      );
      changed = result.changes;
    } catch (error) {
      if (isUniqueConstraintError(error)) continue;
      throw error;
    }

    if (changed === 1) {
      const row = await getReservationByCode(code);
      if (!row) {
        throw new ApiError(
          500,
          "BOOKING_LOOKUP_FAILED",
          "Reservasi tersimpan tetapi tidak dapat dibaca kembali.",
        );
      }
      return {
        bookingCode: row.bookingCode,
        queueNumber: row.queueNumber,
        bookingDate: row.bookingDate,
        customerName: row.customerName,
        status: row.status,
        createdAt: row.createdAt,
      };
    }

    await explainBookingRejection(input.bookingDate);
  }

  throw conflict(
    "Reservasi tidak dapat dibuat karena antrean sedang sibuk. Silakan coba lagi.",
    "BOOKING_CONFLICT",
  );
}

export async function getReservationByCode(
  code: string,
): Promise<ReservationRow | null> {
  return db.get<ReservationRow>(
    `${RESERVATION_SELECT} WHERE r.booking_code = ? LIMIT 1`,
    code.toUpperCase(),
  );
}

export async function getReservationById(id: string): Promise<ReservationRow | null> {
  return db.get<ReservationRow>(`${RESERVATION_SELECT} WHERE r.id = ? LIMIT 1`, id);
}

export async function getPublicReservationStatus(code: string): Promise<{
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
} | null> {
  const row = await getReservationByCode(code);
  if (!row) return null;

  let position: number | null = null;
  if (row.status === "CONFIRMED" || row.status === "WAITING") {
    const ahead = await db.get<{ count: number }>(
      `
        SELECT COUNT(*) AS count FROM reservations
        WHERE booking_date = ?
          AND status IN ${ACTIVE_STATUS_SQL}
          AND queue_number < ?
      `,
      row.bookingDate,
      row.queueNumber,
    );
    position = Number(ahead?.count ?? 0) + 1;
  }

  return {
    bookingCode: row.bookingCode,
    bookingDate: row.bookingDate,
    customerName: row.customerName,
    customerPhoneMasked: maskPhone(row.customerPhone),
    queueNumber: row.queueNumber,
    status: row.status,
    position,
    checkedInAt: row.checkedInAt,
    calledAt: row.calledAt,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
  };
}

export async function listReservationsForAdmin(filters: {
  date: string;
  status?: ReservationStatus | null;
  query?: string | null;
}): Promise<ReservationRow[]> {
  const conditions = ["r.booking_date = ?"];
  const params: (string | number)[] = [filters.date];

  if (filters.status) {
    conditions.push("r.status = ?");
    params.push(filters.status);
  }

  if (filters.query) {
    const like = `%${filters.query}%`;
    conditions.push(
      "(r.customer_name LIKE ? OR r.customer_phone LIKE ? OR r.booking_code LIKE ?)",
    );
    params.push(like, like, like);
  }

  return db.all<ReservationRow>(
    `${RESERVATION_SELECT} WHERE ${conditions.join(" AND ")} ORDER BY r.queue_number ASC LIMIT 200`,
    ...params,
  );
}

export async function getReservationStatusCounts(
  date: string,
): Promise<Record<ReservationStatus, number>> {
  const rows = await db.all<{ status: ReservationStatus; count: number }>(
    "SELECT status, COUNT(*) AS count FROM reservations WHERE booking_date = ? GROUP BY status",
    date,
  );

  const counts: Record<ReservationStatus, number> = {
    CONFIRMED: 0,
    WAITING: 0,
    CALLED: 0,
    IN_SERVICE: 0,
    COMPLETED: 0,
    CANCELLED: 0,
    NO_SHOW: 0,
  };
  for (const row of rows) {
    counts[row.status] = Number(row.count);
  }
  return counts;
}

export async function adminTransitionReservation(
  id: string,
  action: "check_in" | "start" | "complete" | "cancel" | "no_show",
): Promise<ReservationRow> {
  const reservation = await getReservationById(id);
  if (!reservation) throw notFound("Reservasi tidak ditemukan.");

  const today = todayDateString();
  const now = nowIso();

  if (action === "check_in") {
    if (reservation.bookingDate !== today) {
      throw conflict(
        "Check-in hanya dapat dilakukan pada tanggal reservasi.",
        "INVALID_DATE",
      );
    }
    if (reservation.status !== "CONFIRMED") {
      throw conflict(
        `Reservasi berstatus ${STATUS_META[reservation.status].label} tidak dapat di-check-in.`,
        "INVALID_TRANSITION",
      );
    }
    const result = await db.run(
      `
        UPDATE reservations
        SET status = 'WAITING', checked_in_at = COALESCE(checked_in_at, ?), updated_at = ?
        WHERE id = ? AND status = 'CONFIRMED'
      `,
      now,
      now,
      id,
    );
    if (result.changes !== 1) {
      throw conflict("Status reservasi sudah berubah. Muat ulang halaman.");
    }
  }

  if (action === "start") {
    if (reservation.bookingDate !== today) {
      throw conflict(
        "Layanan hanya dapat dimulai pada tanggal reservasi.",
        "INVALID_DATE",
      );
    }
    if (reservation.status !== "CALLED") {
      throw conflict(
        "Hanya pelanggan yang sudah dipanggil yang dapat mulai dilayani.",
        "INVALID_TRANSITION",
      );
    }
    const result = await db.run(
      `
        UPDATE reservations
        SET status = 'IN_SERVICE', started_at = ?, updated_at = ?
        WHERE id = ? AND status = 'CALLED'
      `,
      now,
      now,
      id,
    );
    if (result.changes !== 1) {
      throw conflict("Status reservasi sudah berubah. Muat ulang halaman.");
    }
  }

  if (action === "complete") {
    if (reservation.status !== "IN_SERVICE") {
      throw conflict(
        "Hanya layanan yang sedang berjalan yang dapat diselesaikan.",
        "INVALID_TRANSITION",
      );
    }
    const result = await db.run(
      `
        UPDATE reservations
        SET status = 'COMPLETED', completed_at = ?, updated_at = ?
        WHERE id = ? AND status = 'IN_SERVICE'
      `,
      now,
      now,
      id,
    );
    if (result.changes !== 1) {
      throw conflict("Status reservasi sudah berubah. Muat ulang halaman.");
    }
  }

  if (action === "cancel") {
    if (!["CONFIRMED", "WAITING", "CALLED"].includes(reservation.status)) {
      throw conflict(
        `Reservasi berstatus ${STATUS_META[reservation.status].label} tidak dapat dibatalkan.`,
        "INVALID_TRANSITION",
      );
    }
    const result = await db.run(
      `
        UPDATE reservations
        SET status = 'CANCELLED', cancelled_at = ?, updated_at = ?
        WHERE id = ? AND status IN ${PRE_SERVICE_STATUS_SQL}
      `,
      now,
      now,
      id,
    );
    if (result.changes !== 1) {
      throw conflict("Status reservasi sudah berubah. Muat ulang halaman.");
    }
  }

  if (action === "no_show") {
    if (reservation.bookingDate !== today) {
      throw conflict(
        "Status tidak hadir hanya dapat ditandai pada tanggal reservasi.",
        "INVALID_DATE",
      );
    }
    if (!["CONFIRMED", "WAITING", "CALLED"].includes(reservation.status)) {
      throw conflict(
        `Reservasi berstatus ${STATUS_META[reservation.status].label} tidak dapat ditandai tidak hadir.`,
        "INVALID_TRANSITION",
      );
    }
    const result = await db.run(
      `
        UPDATE reservations
        SET status = 'NO_SHOW', updated_at = ?
        WHERE id = ? AND status IN ${PRE_SERVICE_STATUS_SQL}
      `,
      now,
      id,
    );
    if (result.changes !== 1) {
      throw conflict("Status reservasi sudah berubah. Muat ulang halaman.");
    }
  }

  const updated = await getReservationById(id);
  if (!updated) throw notFound("Reservasi tidak ditemukan.");
  return updated;
}

export async function getReservationsByDate(date: string): Promise<ReservationRow[]> {
  return db.all<ReservationRow>(
    `${RESERVATION_SELECT} WHERE r.booking_date = ? ORDER BY r.queue_number ASC`,
    date,
  );
}

export async function getTodayReservationsByStatus(
  date: string,
  status: ReservationStatus,
): Promise<ReservationRow[]> {
  return db.all<ReservationRow>(
    `${RESERVATION_SELECT} WHERE r.booking_date = ? AND r.status = ? ORDER BY r.queue_number ASC`,
    date,
    status,
  );
}
