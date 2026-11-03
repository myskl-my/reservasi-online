import type { Metadata } from "next";
import { StatusBadge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, TableWrap } from "@/components/ui/form";
import { EmptyState, PageHeader, StatCard } from "@/components/ui/layout";
import { AdminCallNextPanel } from "@/components/admin/admin-call-next-panel";
import { CreateWalkInForm } from "@/components/admin/create-walk-in-form";
import { AdminWalkInActions } from "@/components/admin/walk-in-actions";
import {
  getWalkInStatusCounts,
  listWalkInsByDate,
} from "@/lib/data/walk-ins";
import {
  formatDateID,
  formatTimeID,
  isValidDateString,
  todayDateString,
} from "@/lib/dates";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Antrean Walk-in",
};

export default async function AdminWalkInsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const today = todayDateString();
  const date =
    typeof params.date === "string" && isValidDateString(params.date)
      ? params.date
      : today;

  const [walkIns, counts] = await Promise.all([
    listWalkInsByDate(date),
    getWalkInStatusCounts(date),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Antrean walk-in"
        description="Tambahkan, panggil, layani, dan selesaikan pelanggan walk-in. Walk-in tidak memakai kuota reservasi online."
        actions={
          <a
            href="/admin/walk-ins"
            className={buttonClassName({ variant: "secondary", size: "sm" })}
          >
            Hari ini
          </a>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total walk-in" value={walkIns.length} hint={formatDateID(date)} />
        <StatCard label="Menunggu" value={counts.WAITING} tone={counts.WAITING > 0 ? "warn" : "default"} />
        <StatCard label="Dilayani" value={counts.IN_SERVICE} />
        <StatCard label="Selesai" value={counts.COMPLETED} tone="success" />
      </div>

      {date === today ? (
        <Card>
          <CardHeader
            title="Panggil walk-in berikutnya"
            description="Panggil pelanggan walk-in yang paling lama menunggu."
          />
          <CardBody>
            <AdminCallNextPanel
              waitingOnline={0}
              waitingWalkIns={counts.WAITING}
              kinds={["WALK_IN"]}
            />
          </CardBody>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_340px] lg:items-start">
        <Card>
          <CardHeader
            title={`Antrean ${formatDateID(date)}`}
            description="Nomor walk-in memakai awalan W- dan terpisah dari nomor reservasi."
            actions={
              <form method="get" className="flex flex-wrap items-center gap-2">
                <Input
                  type="date"
                  name="date"
                  defaultValue={date}
                  aria-label="Filter tanggal walk-in"
                  className="w-40"
                />
                <button
                  type="submit"
                  className={buttonClassName({ variant: "secondary", size: "sm" })}
                >
                  Lihat
                </button>
              </form>
            }
          />
          <CardBody className="p-0">
            {walkIns.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  title="Belum ada walk-in"
                  description="Tambahkan pelanggan walk-in melalui formulir di samping."
                />
              </div>
            ) : (
              <TableWrap>
                <thead className="bg-surface-muted text-left text-[11px] font-semibold tracking-wide text-ink-muted uppercase">
                  <tr>
                    <th className="px-4 py-2.5">No</th>
                    <th className="px-4 py-2.5">Pelanggan</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Dibuat</th>
                    <th className="px-4 py-2.5">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {walkIns.map((walkIn) => (
                    <tr
                      key={walkIn.id}
                      className="align-top transition-colors hover:bg-surface-muted/40"
                    >
                      <td className="px-4 py-3 text-sm font-semibold">
                        W-{walkIn.queueNumber}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium">{walkIn.customerName}</p>
                        <p className="text-xs text-ink-muted">
                          {walkIn.customerPhone ?? "-"}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={walkIn.status} />
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-muted">
                        {formatTimeID(walkIn.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <AdminWalkInActions
                          id={walkIn.id}
                          status={walkIn.status}
                          date={walkIn.walkInDate}
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

        <Card>
          <CardHeader title="Tambah walk-in" description="Untuk pelanggan hari ini." />
          <CardBody>
            <CreateWalkInForm />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
