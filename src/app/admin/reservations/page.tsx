import type { Metadata } from "next";
import { StatusBadge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Select, TableWrap } from "@/components/ui/form";
import { EmptyState, PageHeader, StatCard } from "@/components/ui/layout";
import { AdminCallNextPanel } from "@/components/admin/admin-call-next-panel";
import { AdminReservationActions } from "@/components/admin/reservation-actions";
import {
  getReservationStatusCounts,
  listReservationsForAdmin,
} from "@/lib/data/reservations";
import { normalizeStatusFilter } from "@/lib/data/settings";
import {
  formatDateID,
  formatDateTimeID,
  isValidDateString,
  todayDateString,
} from "@/lib/dates";
import { RESERVATION_STATUSES } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Manajemen Reservasi",
};

export default async function AdminReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; status?: string; q?: string }>;
}) {
  const params = await searchParams;
  const today = todayDateString();
  const date =
    typeof params.date === "string" && isValidDateString(params.date)
      ? params.date
      : today;
  const status = normalizeStatusFilter(
    typeof params.status === "string" ? params.status : null,
  );
  const query =
    typeof params.q === "string" ? params.q.trim().slice(0, 80) : "";

  const [reservations, counts] = await Promise.all([
    listReservationsForAdmin({ date, status, query: query || null }),
    getReservationStatusCounts(date),
  ]);

  const activeCount =
    counts.CONFIRMED + counts.WAITING + counts.CALLED + counts.IN_SERVICE;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Manajemen reservasi"
        description="Check-in, panggil, mulai, selesaikan, batalkan, atau tandai tidak hadir. Perubahan kuota tidak pernah membatalkan reservasi lama."
        actions={
          <a
            href="/admin/reservations"
            className={buttonClassName({ variant: "secondary", size: "sm" })}
          >
            Hari ini
          </a>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total reservasi" value={reservations.length} hint={formatDateID(date)} />
        <StatCard
          label="Aktif"
          value={activeCount}
          hint="Terkonfirmasi, menunggu, dipanggil, dilayani"
        />
        <StatCard
          label="Selesai"
          value={counts.COMPLETED}
          hint={`${counts.CANCELLED} batal · ${counts.NO_SHOW} tidak hadir`}
        />
        <StatCard
          label="Menunggu"
          value={counts.WAITING}
          hint={`${counts.CALLED} sedang dipanggil`}
        />
      </div>

      {date === today ? (
        <Card>
          <CardHeader
            title="Panggil reservasi berikutnya"
            description="Panggil pelanggan online yang paling lama menunggu."
          />
          <CardBody>
            <AdminCallNextPanel
              waitingOnline={counts.WAITING}
              kinds={["ONLINE"]}
            />
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader title="Filter data" />
        <CardBody>
          <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[170px_190px_1fr_auto]">
            <div>
              <label htmlFor="filter-date" className="mb-1.5 block text-xs font-medium text-ink-muted">
                Tanggal
              </label>
              <Input id="filter-date" type="date" name="date" defaultValue={date} />
            </div>
            <div>
              <label htmlFor="filter-status" className="mb-1.5 block text-xs font-medium text-ink-muted">
                Status
              </label>
              <Select id="filter-status" name="status" defaultValue={status ?? ""}>
                <option value="">Semua status</option>
                {RESERVATION_STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label htmlFor="filter-q" className="mb-1.5 block text-xs font-medium text-ink-muted">
                Cari nama / WhatsApp / kode
              </label>
              <Input
                id="filter-q"
                name="q"
                defaultValue={query}
                placeholder="Kata kunci"
                maxLength={80}
              />
            </div>
            <div className="flex items-end">
              <button type="submit" className={buttonClassName({ className: "w-full" })}>
                Terapkan
              </button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title={`Reservasi ${formatDateID(date)}`}
          description="Maksimum 200 data ditampilkan. Gunakan filter untuk mempersempit."
        />
        <CardBody className="p-0">
          {reservations.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="Tidak ada reservasi"
                description="Belum ada reservasi yang cocok dengan filter ini."
              />
            </div>
          ) : (
            <TableWrap>
              <thead className="bg-surface-muted text-left text-[11px] font-semibold tracking-wide text-ink-muted uppercase">
                <tr>
                  <th className="px-4 py-2.5">No</th>
                  <th className="px-4 py-2.5">Kode</th>
                  <th className="px-4 py-2.5">Pelanggan</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Dibuat</th>
                  <th className="px-4 py-2.5">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {reservations.map((reservation) => (
                  <tr
                    key={reservation.id}
                    className="align-top transition-colors hover:bg-surface-muted/40"
                  >
                    <td className="px-4 py-3 text-sm font-semibold">
                      #{reservation.queueNumber}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {reservation.bookingCode}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-ink">
                        {reservation.customerName}
                      </p>
                      <p className="text-xs text-ink-muted">
                        {reservation.customerPhone}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={reservation.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-muted">
                      {formatDateTimeID(reservation.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <AdminReservationActions
                        id={reservation.id}
                        status={reservation.status}
                        bookingDate={reservation.bookingDate}
                        today={today}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
