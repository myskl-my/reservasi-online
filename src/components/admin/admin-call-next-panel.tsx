"use client";

import { ActionButton } from "@/components/internal/action-button";

export function AdminCallNextPanel({
  waitingOnline,
  waitingWalkIns = 0,
  kinds = ["ONLINE", "WALK_IN"],
}: {
  waitingOnline: number;
  waitingWalkIns?: number;
  kinds?: Array<"ONLINE" | "WALK_IN">;
}) {
  const hasQueue = waitingOnline > 0 || waitingWalkIns > 0;

  return (
    <div className="space-y-3">
      <div className="grid gap-2.5 sm:grid-cols-2">
        {kinds.includes("ONLINE") ? (
          <ActionButton
            url="/api/admin/queue/call"
            body={{ kind: "ONLINE" }}
            label={
              waitingOnline > 0
                ? `Panggil Online (${waitingOnline})`
                : "Panggil Online"
            }
            pendingLabel="Memanggil..."
            variant="primary"
            size="md"
            disabled={waitingOnline === 0}
            className="w-full"
          />
        ) : null}
        {kinds.includes("WALK_IN") ? (
          <ActionButton
            url="/api/admin/queue/call"
            body={{ kind: "WALK_IN" }}
            label={
              waitingWalkIns > 0
                ? `Panggil Walk-in (${waitingWalkIns})`
                : "Panggil Walk-in"
            }
            pendingLabel="Memanggil..."
            variant="secondary"
            size="md"
            disabled={waitingWalkIns === 0}
            className="w-full"
          />
        ) : null}
      </div>

      {!hasQueue ? (
        <p className="text-xs leading-relaxed text-ink-muted">
          Belum ada antrean yang dapat dipanggil saat ini.
        </p>
      ) : null}
    </div>
  );
}
