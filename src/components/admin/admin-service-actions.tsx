"use client";

import { ActionButton } from "@/components/internal/action-button";
import type { ReservationStatus } from "@/lib/types";

export function AdminServiceActions({
  kind,
  id,
  status,
}: {
  kind: "ONLINE" | "WALK_IN";
  id: string;
  status: ReservationStatus;
}) {
  const url =
    kind === "ONLINE"
      ? `/api/admin/reservations/${id}/transition`
      : `/api/admin/walk-ins/${id}/transition`;

  if (status === "CALLED") {
    return (
      <div className="flex flex-wrap gap-1.5">
        <ActionButton
          url={url}
          body={{ action: "start" }}
          label="Mulai Layanan"
          pendingLabel="Memulai..."
          variant="primary"
        />
        <ActionButton
          url={url}
          body={{ action: "no_show" }}
          label="Tidak Hadir"
          pendingLabel="..."
          variant="danger"
          confirmMessage="Tandai pelanggan ini sebagai tidak hadir?"
        />
        <ActionButton
          url={url}
          body={{ action: "cancel" }}
          label="Batalkan"
          pendingLabel="..."
          variant="danger"
          confirmMessage="Batalkan antrean pelanggan ini?"
        />
      </div>
    );
  }

  if (status === "IN_SERVICE") {
    return (
      <ActionButton
        url={url}
        body={{ action: "complete" }}
        label="Selesaikan Layanan"
        pendingLabel="Menyelesaikan..."
        variant="primary"
      />
    );
  }

  return null;
}
