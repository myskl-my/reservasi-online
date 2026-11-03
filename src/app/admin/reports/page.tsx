import type { Metadata } from "next";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClassName } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { EmptyState, PageHeader, StatCard } from "@/components/ui/layout";
import { getReportData } from "@/lib/data/reports";
import {
  MAX_REPORT_DAYS,
  addDays,
  daysBetweenInclusive,
  formatDateID,
  formatDateShortID,
  isValidDateString,
  todayDateString,
} from "@/lib/dates";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Laporan",
};

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const today = todayDateString();
  const defaultFrom = addDays(today, -6);

  let from =
    typeof params.from === "string" && isValidDateString(params.from)
      ? params.from
      : defaultFrom;
  let to =
    typeof params.to === "string" && isValidDateString(params.to)
      ? params.to
      : today;

  if (from > to) {
    [from, to] = [to, from];
  }

  let clamped = false;
  if (daysBetweenInclusive(from, to) > MAX_REPORT_DAYS) {
    from = addDays(to, -(MAX_REPORT_DAYS - 1));
    clamped = true;
  }

  const report = await getReportData(from, to);
  const { totals } = report;

  const completedTotal = totals.onlineCompleted + totals.walkInCompleted;
  const lostTotal =
    totals.onlineCancelled +
    totals.onlineNoShow +
    totals.walkInCancelled +
    totals.walkInNoShow;
  const totalBookings = totals.onlineTotal + totals.walkInTotal;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Laporan operasional"
        description="Rekap reservasi online dan walk-in. Maksimal 31 hari per laporan."
        actions={
          <a
            href={`/admin/reports?from=${addDays(today, -6)}&to=${today}`}
            className={buttonClassName({ variant: "secondary", size: "sm" })}
          >
            7 hari terakhir
          </a>
        }
      />

      {clamped ? (
        <Alert tone="info" title="Rentang dipersingkat">
          Laporan dibatasi maksimal {MAX_REPORT_DAYS} hari. Rentang disesuaikan
          menjadi {formatDateID(from)} – {formatDateID(to)}.
        </Alert>
      ) : null}

      <Card>
        <CardHeader title="Rentang laporan" />
        <CardBody>
          <form method="get" className="flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="report-from" className="mb-1 block text-xs font-medium text-ink-muted">
                Dari tanggal
              </label>
              <Input
                id="report-from"
                type="date"
                name="from"
                defaultValue={from}
                className="w-44"
              />
            </div>
            <div>
              <label htmlFor="report-to" className="mb-1 block text-xs font-medium text-ink-muted">
                Sampai tanggal
              </label>
              <Input
                id="report-to"
                type="date"
                name="to"
                defaultValue={to}
                className="w-44"
              />
            </div>
            <Button type="submit" variant="secondary">
              Tampilkan
            </Button>
            <p className="text-xs text-ink-muted">
              Data: {formatDateID(from)} – {formatDateID(to)}
            </p>
          </form>
        </CardBody>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total reservasi online"
          value={totals.onlineTotal}
          hint={`${totals.onlineCompleted} selesai · ${totals.onlineActive} aktif`}
        />
        <StatCard
          label="Total walk-in"
          value={totals.walkInTotal}
          hint={`${totals.walkInCompleted} selesai · ${totals.walkInActive} aktif`}
        />
        <StatCard
          label="Layanan selesai"
          value={completedTotal}
          tone="success"
          hint={`Dari ${totalBookings} total pelanggan`}
        />
        <StatCard
          label="Batal / tidak hadir"
          value={lostTotal}
          tone={lostTotal > 0 ? "warn" : "default"}
          hint={`${totals.onlineCancelled + totals.walkInCancelled} batal · ${
            totals.onlineNoShow + totals.walkInNoShow
          } tidak hadir`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Reservasi online"
            actions={
              <span className={cn(
                "inline-flex items-center justify-center rounded-control px-2 py-1 text-[10px] font-semibold tracking-[0.08em] uppercase",
                "bg-accent-soft text-accent-strong border border-accent/20"
              )}>
                Online
              </span>
            }
          />
          <CardBody className="space-y-2 text-sm">
            <Row label="Total" value={totals.onlineTotal} />
            <Row label="Selesai" value={totals.onlineCompleted} />
            <Row label="Aktif" value={totals.onlineActive} />
            <Row label="Dibatalkan" value={totals.onlineCancelled} />
            <Row label="Tidak hadir" value={totals.onlineNoShow} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Walk-in"
            actions={
              <span className={cn(
                "inline-flex items-center justify-center rounded-control px-2 py-1 text-[10px] font-semibold tracking-[0.08em] uppercase",
                "bg-accent-soft text-accent-strong border border-accent/20"
              )}>
                Walk-in
              </span>
            }
          />
          <CardBody className="space-y-2 text-sm">
            <Row label="Total" value={totals.walkInTotal} />
            <Row label="Selesai" value={totals.walkInCompleted} />
            <Row label="Aktif" value={totals.walkInActive} />
            <Row label="Dibatalkan" value={totals.walkInCancelled} />
            <Row label="Tidak hadir" value={totals.walkInNoShow} />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Rekap per tanggal"
          description="Hanya tanggal yang memiliki data reservasi atau walk-in."
        />
        <CardBody className="p-0">
          {report.days.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="Tidak ada data"
                description="Belum ada reservasi atau walk-in pada rentang tanggal ini."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-line text-sm">
                <thead className="bg-surface-muted text-left text-[11px] font-semibold tracking-wide text-ink-muted uppercase">
                  <tr>
                    <th className="px-4 py-2.5">Tanggal</th>
                    <th className="px-3 py-2.5 text-right">Online</th>
                    <th className="px-3 py-2.5 text-right">Selesai</th>
                    <th className="px-3 py-2.5 text-right">Batal</th>
                    <th className="px-3 py-2.5 text-right">No-show</th>
                    <th className="px-3 py-2.5 text-right">Walk-in</th>
                    <th className="px-3 py-2.5 text-right">W. selesai</th>
                    <th className="px-3 py-2.5 text-right">W. batal</th>
                    <th className="px-3 py-2.5 text-right">W. no-show</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {report.days.map((day) => (
                    <tr key={day.date}>
                      <td className="px-4 py-2.5 font-medium">
                        {formatDateShortID(day.date)}
                      </td>
                      <td className="px-3 py-2.5 text-right">{day.onlineTotal}</td>
                      <td className="px-3 py-2.5 text-right">{day.onlineCompleted}</td>
                      <td className="px-3 py-2.5 text-right">{day.onlineCancelled}</td>
                      <td className="px-3 py-2.5 text-right">{day.onlineNoShow}</td>
                      <td className="px-3 py-2.5 text-right">{day.walkInTotal}</td>
                      <td className="px-3 py-2.5 text-right">
                        {day.walkInCompleted}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {day.walkInCancelled}
                      </td>
                      <td className="px-3 py-2.5 text-right">{day.walkInNoShow}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-surface-muted font-semibold">
                  <tr>
                    <td className="px-4 py-2.5">Total</td>
                    <td className="px-3 py-2.5 text-right">{totals.onlineTotal}</td>
                    <td className="px-3 py-2.5 text-right">
                      {totals.onlineCompleted}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {totals.onlineCancelled}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {totals.onlineNoShow}
                    </td>
                    <td className="px-3 py-2.5 text-right">{totals.walkInTotal}</td>
                    <td className="px-3 py-2.5 text-right">
                      {totals.walkInCompleted}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {totals.walkInCancelled}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {totals.walkInNoShow}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-control bg-surface-muted/70 px-3 py-2.5">
      <span className="text-ink-muted">{label}</span>
      <span className="font-semibold text-ink tabular-nums">{value}</span>
    </div>
  );
}
