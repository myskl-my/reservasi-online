import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader, StatCard } from "@/components/ui/layout";
import { AdminCallNextPanel } from "@/components/admin/admin-call-next-panel";
import { AdminServiceActions } from "@/components/admin/admin-service-actions";
import { getDashboardData } from "@/lib/data/dashboard";
import { formatDateID, formatTimeID, todayDateString } from "@/lib/dates";
import { STATUS_META, WALK_IN_STATUSES, type ReservationStatus } from "@/lib/types";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard Admin",
};

export default async function AdminDashboardPage() {
  const today = todayDateString();
  const data = await getDashboardData(today);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operasional hari ini"
        title="Dashboard"
        description={`Ringkasan ${formatDateID(today)}. Semua waktu mengikuti zona Asia/Jakarta.`}
        actions={
          <>
            <Link
              href="/admin/reservations"
              className={buttonClassName({ variant: "secondary", size: "sm" })}
            >
              Kelola Reservasi
            </Link>
            <Link
              href="/admin/settings"
              className={buttonClassName({ variant: "secondary", size: "sm" })}
            >
              Pengaturan
            </Link>
          </>
        }
      />

      {!data.settings.onlineBookingEnabled ? (
        <Alert tone="warning" title="Reservasi online nonaktif">
          Booking baru ditolak. Reservasi yang sudah dikonfirmasi tetap berlaku.
        </Alert>
      ) : null}

      {data.dateClosed ? (
        <Alert tone="warning" title="Tanggal hari ini ditutup">
          Booking baru untuk hari ini ditolak. Reservasi lama tidak dibatalkan.
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Reservasi aktif hari ini"
          value={data.activeCount}
          hint={`${data.onlineCounts.CONFIRMED} terkonfirmasi · ${data.onlineCounts.WAITING} menunggu`}
        />
        <StatCard
          label="Kuota hari ini"
          value={`${data.activeCount} / ${data.quota}`}
          hint={
            data.overrideQuota !== null
              ? "Kuota khusus tanggal ini"
              : "Memakai kuota default"
          }
          tone={data.remaining === 0 ? "warn" : "default"}
        />
        <StatCard
          label="Sisa kuota"
          value={data.remaining}
          hint={data.remaining === 0 ? "Booking baru ditolak" : "Slot tersedia"}
          tone={data.remaining === 0 ? "danger" : "success"}
        />
        <StatCard
          label="Walk-in menunggu"
          value={data.walkInCounts.WAITING}
          hint={`${data.walkInCounts.CALLED} dipanggil · ${data.walkInCounts.IN_SERVICE} dilayani`}
        />
      </div>

      <Card>
        <CardHeader
          title="Panggil antrean berikutnya"
          description="Panggil pelanggan online atau walk-in yang paling lama menunggu."
        />
        <CardBody>
          <AdminCallNextPanel
            waitingOnline={data.onlineCounts.WAITING}
            waitingWalkIns={data.walkInCounts.WAITING}
          />
        </CardBody>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader
            title="Layanan berlangsung"
            description="Reservasi online dan walk-in yang sedang dipanggil atau dilayani."
            actions={
            <Badge tone="blue">
              {data.currentServices.length} layanan aktif
            </Badge>
          }
        />
          <CardBody className="p-0">
            {data.currentServices.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-ink-muted">
                Belum ada layanan yang sedang berjalan.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {data.currentServices.map((item) => (
                  <li
                    key={`${item.kind}-${item.id}`}
                    className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-ink-muted">
                          {item.kind === "ONLINE" ? "R" : "W"}-{item.queueNumber}
                        </span>
                        <p className="text-sm font-semibold text-ink">
                          {item.customerName}
                        </p>
                        <Badge tone={item.kind === "ONLINE" ? "blue" : "amber"}>
                          {item.kind === "ONLINE" ? "Online" : "Walk-in"}
                        </Badge>
                        <StatusBadge status={item.status as ReservationStatus} />
                      </div>
                      <p className="mt-1 text-xs text-ink-muted">
                        Mulai {formatTimeID(item.startedAt ?? item.calledAt)}
                      </p>
                    </div>
                    <AdminServiceActions
                      kind={item.kind}
                      id={item.id}
                      status={item.status}
                    />
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Status antrean online" />
            <CardBody className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              {(
                [
                  "CONFIRMED",
                  "WAITING",
                  "CALLED",
                  "IN_SERVICE",
                  "COMPLETED",
                  "CANCELLED",
                  "NO_SHOW",
                ] as ReservationStatus[]
              ).map((status) => {
                const meta = STATUS_META[status];
                return (
                  <div
                    key={status}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-control bg-surface p-3 border border-line",
                      "hover:bg-surface-muted transition-colors"
                    )}
                  >
                    <span className="text-[10px] font-semibold tracking-[0.1em] uppercase text-ink-muted">
                      {meta.label}
                    </span>
                    <span className="text-lg font-bold text-ink tabular-nums">
                      {data.onlineCounts[status]}
                    </span>
                  </div>
                );
              })}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Status walk-in" />
            <CardBody className="grid grid-cols-3 gap-2 text-sm">
              {WALK_IN_STATUSES.map((status) => {
                const meta = STATUS_META[status];
                return (
                  <div
                    key={status}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-control bg-surface p-3 border border-line",
                      "hover:bg-surface-muted transition-colors"
                    )}
                  >
                    <span className="text-[10px] font-semibold tracking-[0.1em] uppercase text-ink-muted">
                      {meta.label}
                    </span>
                    <span className="text-lg font-bold text-ink tabular-nums">
                      {data.walkInCounts[status]}
                    </span>
                  </div>
                );
              })}
            </CardBody>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader
          title="Reservasi terbaru hari ini"
          description="Delapan reservasi yang paling baru dibuat."
          actions={
            <Link
              href={`/admin/reservations?date=${today}`}
              className={buttonClassName({ variant: "secondary", size: "sm" })}
            >
              Lihat semua
            </Link>
          }
        />
        <CardBody className="p-0">
          {data.recentReservations.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-ink-muted">
              Belum ada reservasi untuk hari ini.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-line text-sm">
                <thead className="bg-surface-muted text-left text-[11px] font-semibold tracking-wide text-ink-muted uppercase">
                  <tr>
                    <th className="px-4 py-2.5">No</th>
                    <th className="px-4 py-2.5">Kode</th>
                    <th className="px-4 py-2.5">Pelanggan</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Dibuat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.recentReservations.map((reservation) => (
                    <tr key={reservation.id} className="transition-colors hover:bg-surface-muted/40">
                      <td className="px-4 py-2.5 font-semibold">
                        #{reservation.queueNumber}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs">
                        {reservation.bookingCode}
                      </td>
                      <td className="px-4 py-2.5">
                        <p className="font-medium">{reservation.customerName}</p>
                        <p className="text-xs text-ink-muted">
                          {reservation.customerPhone}
                        </p>
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={reservation.status} />
                      </td>
                      <td className="px-4 py-2.5 text-xs text-ink-muted">
                        {formatTimeID(reservation.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Keterangan status" />
        <CardBody>
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              Object.keys(STATUS_META) as ReservationStatus[]
            ).map((status) => {
              const meta = STATUS_META[status];
              return (
                <div key={status} className="flex items-start gap-2 text-xs text-ink-muted">
                  <span className={cn(
                    "inline-flex items-center justify-center shrink-0 rounded-control px-2 py-0.5 text-[10px] font-semibold tracking-[0.1em] uppercase",
                    "bg-surface-muted text-ink-muted border border-line"
                  )}>
                    {meta.label}
                  </span>
                  <span className="pt-0.5">{meta.description}</span>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
