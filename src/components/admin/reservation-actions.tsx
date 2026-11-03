"use client";

import { ActionButton } from "@/components/internal/action-button";
import type { ReservationStatus } from "@/lib/types";

const PRE_SERVICE: ReservationStatus[] = ["CONFIRMED", "WAITING", "CALLED"];

export function AdminReservationActions({
  id,
  status,
  bookingDate,
  today,
}: {
  id: string;
  status: ReservationStatus;
  bookingDate: string;
  today: string;
}) {
  const isToday = bookingDate === today;
  const canCheckIn = status === "CONFIRMED" && isToday;
  const canStart = status === "CALLED" && isToday;
  const canComplete = status === "IN_SERVICE";
  const canCancel = PRE_SERVICE.includes(status);
  const canNoShow = PRE_SERVICE.includes(status) && isToday;

  if (
    !canCheckIn &&
    !canStart &&
    !canComplete &&
    !canCancel &&
    !canNoShow
  ) {
    return <span className="text-xs text-ink-muted/70">Tidak ada aksi</span>;
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        {canCheckIn ? (
          <ActionButton
            url={`/api/admin/reservations/${id}/transition`}
            body={{ action: "check_in" }}
            label="Check-in"
            pendingLabel="..."
            variant="secondary"
          />
        ) : null}
        {canStart ? (
          <ActionButton
            url={`/api/admin/reservations/${id}/transition`}
            body={{ action: "start" }}
            label="Mulai Layanan"
            pendingLabel="Memulai..."
            variant="primary"
          />
        ) : null}
        {canComplete ? (
          <ActionButton
            url={`/api/admin/reservations/${id}/transition`}
            body={{ action: "complete" }}
            label="Selesaikan"
            pendingLabel="Menyelesaikan..."
            variant="primary"
          />
        ) : null}
        {canNoShow ? (
          <ActionButton
            url={`/api/admin/reservations/${id}/transition`}
            body={{ action: "no_show" }}
            label="Tidak hadir"
            pendingLabel="..."
            variant="danger"
            confirmMessage="Tandai reservasi ini sebagai tidak hadir?"
          />
        ) : null}
        {canCancel ? (
          <ActionButton
            url={`/api/admin/reservations/${id}/transition`}
            body={{ action: "cancel" }}
            label="Batalkan"
            pendingLabel="..."
            variant="danger"
            confirmMessage="Batalkan reservasi ini? Slot aktif akan dilepas dari kuota."
          />
        ) : null}
      </div>
      {status === "WAITING" && isToday ? (
        <p className="text-xs text-ink-muted">
          Gunakan panel panggil di atas untuk memanggil pelanggan ini.
        </p>
      ) : null}
    </div>
  );
}
