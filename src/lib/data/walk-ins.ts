import { db } from "@/lib/db";
import { conflict, notFound } from "@/lib/http";
import { nowIso, todayDateString } from "@/lib/dates";
import { STATUS_META, type WalkInStatus } from "@/lib/types";

const PRE_SERVICE_STATUS_SQL = "('WAITING', 'CALLED')";

export interface WalkInRow {
  id: string;
  walkInDate: string;
  queueNumber: number;
  customerName: string;
  customerPhone: string | null;
  status: WalkInStatus;
  calledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const WALK_IN_SELECT = `
  SELECT
    w.id,
    w.walk_in_date AS walkInDate,
    w.queue_number AS queueNumber,
    w.customer_name AS customerName,
    w.customer_phone AS customerPhone,
    w.status,
    w.called_at AS calledAt,
    w.started_at AS startedAt,
    w.completed_at AS completedAt,
    w.cancelled_at AS cancelledAt,
    w.created_at AS createdAt,
    w.updated_at AS updatedAt
  FROM walk_ins w
`;

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.toLowerCase().includes("unique constraint failed")
  );
}

export async function createWalkIn(input: {
  customerName: string;
  customerPhone: string | null;
}): Promise<WalkInRow> {
  const today = todayDateString();
  const now = nowIso();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const id = crypto.randomUUID();
    try {
      await db.run(
        `
          INSERT INTO walk_ins (
            id, walk_in_date, queue_number, customer_name, customer_phone,
            status, created_at, updated_at
          )
          SELECT
            ?, ?,
            COALESCE((SELECT MAX(queue_number) FROM walk_ins WHERE walk_in_date = ?), 0) + 1,
            ?, ?, 'WAITING', ?, ?
        `,
        id,
        today,
        today,
        input.customerName,
        input.customerPhone,
        now,
        now,
      );
      const row = await getWalkInById(id);
      if (!row) throw new Error("Walk-in gagal dibaca setelah dibuat.");
      return row;
    } catch (error) {
      if (isUniqueConstraintError(error)) continue;
      throw error;
    }
  }

  throw conflict(
    "Antrean walk-in sedang sibuk. Silakan coba lagi.",
    "WALKIN_CONFLICT",
  );
}

export async function getWalkInById(id: string): Promise<WalkInRow | null> {
  return db.get<WalkInRow>(`${WALK_IN_SELECT} WHERE w.id = ? LIMIT 1`, id);
}

export async function listWalkInsByDate(date: string): Promise<WalkInRow[]> {
  return db.all<WalkInRow>(
    `${WALK_IN_SELECT} WHERE w.walk_in_date = ? ORDER BY w.queue_number ASC`,
    date,
  );
}

export async function getWalkInStatusCounts(
  date: string,
): Promise<Record<WalkInStatus, number>> {
  const rows = await db.all<{ status: WalkInStatus; count: number }>(
    "SELECT status, COUNT(*) AS count FROM walk_ins WHERE walk_in_date = ? GROUP BY status",
    date,
  );

  const counts: Record<WalkInStatus, number> = {
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

export async function adminTransitionWalkIn(
  id: string,
  action: "start" | "complete" | "cancel" | "no_show",
): Promise<WalkInRow> {
  const walkIn = await getWalkInById(id);
  if (!walkIn) throw notFound("Antrean walk-in tidak ditemukan.");

  if (walkIn.walkInDate !== todayDateString()) {
    throw conflict(
      "Walk-in hanya dapat diproses pada tanggal yang sama.",
      "INVALID_DATE",
    );
  }

  const now = nowIso();

  if (action === "start") {
    if (walkIn.status !== "CALLED") {
      throw conflict(
        "Hanya walk-in yang sudah dipanggil yang dapat mulai dilayani.",
        "INVALID_TRANSITION",
      );
    }
    const result = await db.run(
      `
        UPDATE walk_ins
        SET status = 'IN_SERVICE', started_at = ?, updated_at = ?
        WHERE id = ? AND status = 'CALLED'
      `,
      now,
      now,
      id,
    );
    if (result.changes !== 1) {
      throw conflict("Status antrean sudah berubah. Muat ulang halaman.");
    }
  }

  if (action === "complete") {
    if (walkIn.status !== "IN_SERVICE") {
      throw conflict(
        "Hanya layanan walk-in yang sedang berjalan yang dapat diselesaikan.",
        "INVALID_TRANSITION",
      );
    }
    const result = await db.run(
      `
        UPDATE walk_ins
        SET status = 'COMPLETED', completed_at = ?, updated_at = ?
        WHERE id = ? AND status = 'IN_SERVICE'
      `,
      now,
      now,
      id,
    );
    if (result.changes !== 1) {
      throw conflict("Status antrean sudah berubah. Muat ulang halaman.");
    }
  }

  if (action === "cancel" || action === "no_show") {
    if (!["WAITING", "CALLED"].includes(walkIn.status)) {
      throw conflict(
        `Antrean berstatus ${STATUS_META[walkIn.status].label} tidak dapat diubah.`,
        "INVALID_TRANSITION",
      );
    }
    const result =
      action === "cancel"
        ? await db.run(
            `
              UPDATE walk_ins
              SET status = 'CANCELLED', cancelled_at = ?, updated_at = ?
              WHERE id = ? AND status IN ${PRE_SERVICE_STATUS_SQL}
            `,
            now,
            now,
            id,
          )
        : await db.run(
            `
              UPDATE walk_ins
              SET status = 'NO_SHOW', updated_at = ?
              WHERE id = ? AND status IN ${PRE_SERVICE_STATUS_SQL}
            `,
            now,
            id,
          );
    if (result.changes !== 1) {
      throw conflict("Status antrean sudah berubah. Muat ulang halaman.");
    }
  }

  const updated = await getWalkInById(id);
  if (!updated) throw notFound("Antrean walk-in tidak ditemukan.");
  return updated;
}
