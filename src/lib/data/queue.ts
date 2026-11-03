import { db } from "@/lib/db";
import {
  getReservationById,
  type ReservationRow,
} from "@/lib/data/reservations";
import { getWalkInById, type WalkInRow } from "@/lib/data/walk-ins";
import { nowIso, todayDateString } from "@/lib/dates";
import { conflict, notFound } from "@/lib/http";

export type AdminCallResult =
  | { kind: "ONLINE"; reservation: ReservationRow }
  | { kind: "WALK_IN"; walkIn: WalkInRow };

export async function callNextForAdmin(
  kind: "ONLINE" | "WALK_IN",
): Promise<AdminCallResult> {
  const today = todayDateString();
  const now = nowIso();

  if (kind === "ONLINE") {
    const next = await db.get<{ id: string }>(
      `
        SELECT id FROM reservations
        WHERE booking_date = ? AND status = 'WAITING'
        ORDER BY queue_number ASC, created_at ASC
        LIMIT 1
      `,
      today,
    );
    if (!next) {
      throw conflict(
        "Belum ada pelanggan reservasi yang menunggu untuk dipanggil.",
        "QUEUE_EMPTY",
      );
    }

    const result = await db.run(
      `
        UPDATE reservations
        SET status = 'CALLED', called_at = ?, updated_at = ?
        WHERE id = ? AND booking_date = ? AND status = 'WAITING'
      `,
      now,
      now,
      next.id,
      today,
    );
    if (result.changes !== 1) {
      throw conflict(
        "Antrean berubah saat diproses. Silakan coba lagi.",
        "QUEUE_CONFLICT",
      );
    }

    const reservation = await getReservationById(next.id);
    if (!reservation) throw notFound("Reservasi tidak ditemukan.");
    return { kind: "ONLINE", reservation };
  }

  const next = await db.get<{ id: string }>(
    `
      SELECT id FROM walk_ins
      WHERE walk_in_date = ? AND status = 'WAITING'
      ORDER BY queue_number ASC, created_at ASC
      LIMIT 1
    `,
    today,
  );
  if (!next) {
    throw conflict(
      "Belum ada pelanggan walk-in yang menunggu.",
      "QUEUE_EMPTY",
    );
  }

  const result = await db.run(
    `
      UPDATE walk_ins
      SET status = 'CALLED', called_at = ?, updated_at = ?
      WHERE id = ? AND walk_in_date = ? AND status = 'WAITING'
    `,
    now,
    now,
    next.id,
    today,
  );
  if (result.changes !== 1) {
    throw conflict(
      "Antrean berubah saat diproses. Silakan coba lagi.",
      "QUEUE_CONFLICT",
    );
  }

  const walkIn = await getWalkInById(next.id);
  if (!walkIn) throw notFound("Antrean walk-in tidak ditemukan.");
  return { kind: "WALK_IN", walkIn };
}
