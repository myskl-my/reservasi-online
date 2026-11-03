"use client";

import { ActionButton } from "@/components/internal/action-button";
import type { WalkInStatus } from "@/lib/types";

export function AdminWalkInActions({
  id,
  status,
  date,
  today,
}: {
  id: string;
  status: WalkInStatus;
  date: string;
  today: string;
}) {
  const isToday = date === today;

  if (status === "IN_SERVICE" && isToday) {
    return (
      <ActionButton
        url={`/api/admin/walk-ins/${id}/transition`}
        body={{ action: "complete" }}
        label="Selesaikan"
        pendingLabel="Menyelesaikan..."
        variant="primary"
      />
    );
  }

  const canAct = (status === "WAITING" || status === "CALLED") && isToday;

  if (!canAct) {
    return <span className="text-xs text-ink-muted/70">Tidak ada aksi</span>;
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        {status === "CALLED" ? (
          <ActionButton
            url={`/api/admin/walk-ins/${id}/transition`}
            body={{ action: "start" }}
            label="Mulai Layanan"
            pendingLabel="Memulai..."
            variant="primary"
          />
        ) : null}
        <ActionButton
          url={`/api/admin/walk-ins/${id}/transition`}
          body={{ action: "no_show" }}
          label="Tidak hadir"
          pendingLabel="..."
          variant="danger"
          confirmMessage="Tandai walk-in ini sebagai tidak hadir?"
        />
        <ActionButton
          url={`/api/admin/walk-ins/${id}/transition`}
          body={{ action: "cancel" }}
          label="Batalkan"
          pendingLabel="..."
          variant="danger"
          confirmMessage="Batalkan antrean walk-in ini?"
        />
      </div>
      {status === "WAITING" ? (
        <p className="text-xs text-ink-muted">
          Gunakan panel panggil di atas untuk memanggil walk-in.
        </p>
      ) : null}
    </div>
  );
}
