import type { Metadata } from "next";
import { Alert } from "@/components/ui/alert";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader, StatCard } from "@/components/ui/layout";
import { SettingsForm } from "@/components/admin/settings-form";
import { DateOverrideRow } from "@/components/admin/date-override-row";
import { getAvailability } from "@/lib/data/settings";
import { formatDateID } from "@/lib/dates";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pengaturan",
};

export default async function AdminSettingsPage() {
  const availability = await getAvailability();
  const today = availability.days[0];
  const totalOverride = availability.days.filter(
    (day) => day.overrideQuota !== null,
  ).length;
  const totalClosed = availability.days.filter((day) => day.dateClosed).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Pengaturan operasional"
        description="Atur status reservasi online, kuota default, kuota khusus per tanggal, dan penutupan tanggal."
      />

      {!availability.onlineBookingEnabled ? (
        <Alert tone="warning" title="Reservasi online sedang nonaktif">
          Pelanggan baru tidak dapat membuat reservasi. Reservasi aktif yang sudah
          ada tetap berlaku dan tetap tampil pada antrean.
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Status booking online"
          value={availability.onlineBookingEnabled ? "Aktif" : "Nonaktif"}
          tone={availability.onlineBookingEnabled ? "success" : "danger"}
          hint="Berlaku untuk semua tanggal"
        />
        <StatCard
          label="Kuota default"
          value={availability.defaultDailyQuota}
          hint="Reservasi aktif per hari"
        />
        <StatCard
          label="Hari ini"
          value={`${today.booked} / ${today.quota}`}
          hint={`${today.remaining} slot tersisa · ${formatDateID(today.date)}`}
          tone={today.remaining === 0 ? "warn" : "default"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr] lg:items-start">
        <Card>
          <CardHeader title="Pengaturan global" />
          <CardBody>
            <SettingsForm
              settings={{
                onlineBookingEnabled: availability.onlineBookingEnabled,
                defaultDailyQuota: availability.defaultDailyQuota,
              }}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Aturan penting" />
          <CardBody className="space-y-4 text-sm leading-relaxed text-ink-muted">
            <div className="flex items-start gap-2.5">
              <span className={cn(
                "shrink-0 inline-flex items-center justify-center rounded-control px-2 py-1 text-[10px] font-semibold tracking-[0.08em] uppercase",
                "bg-accent-soft text-accent-strong border border-accent/20"
              )}>
                Kuota
              </span>
              <p>
                Hanya status <strong>terkonfirmasi, menunggu, dipanggil,</strong>{" "}
                dan <strong>dilayani</strong> yang memakai kuota. Selesai, batal,
                dan tidak hadir tidak memakai kuota.
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className={cn(
                "shrink-0 inline-flex items-center justify-center rounded-control px-2 py-1 text-[10px] font-semibold tracking-[0.08em] uppercase",
                "bg-accent-soft text-accent-strong border border-accent/20"
              )}>
                Tanggal
              </span>
              <p>
                Kuota khusus menggantikan kuota default pada tanggal tersebut.
                Mengosongkan kuota khusus dan tidak menutup tanggal akan
                mengembalikan ke kuota default.
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className={cn(
                "shrink-0 inline-flex items-center justify-center rounded-control px-2 py-1 text-[10px] font-semibold tracking-[0.08em] uppercase",
                "bg-accent-soft text-accent-strong border border-accent/20"
              )}>
                Penutupan
              </span>
              <p>
                Menutup tanggal atau menurunkan kuota tidak membatalkan reservasi
                lama. Booking baru ditolak sampai jumlah aktif kembali di bawah
                kuota.
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className={cn(
                "shrink-0 inline-flex items-center justify-center rounded-control px-2 py-1 text-[10px] font-semibold tracking-[0.08em] uppercase",
                "bg-accent-soft text-accent-strong border border-accent/20"
              )}>
                Walk-in
              </span>
              <p>
                Walk-in memakai antrean terpisah dan tidak mengurangi kuota
                reservasi online.
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className={cn(
                "shrink-0 inline-flex items-center justify-center rounded-control px-2 py-1 text-[10px] font-semibold tracking-[0.08em] uppercase",
                "bg-accent-soft text-accent-strong border border-accent/20"
              )}>
                Horizon
              </span>
              <p>
                Pelanggan hanya dapat memilih tanggal dalam 30 hari ke depan.
                Tanggal di luar horizon tidak dapat dipesan dari halaman publik.
              </p>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Kuota dan penutupan per tanggal"
          description={`${availability.days.length} hari ke depan · ${totalOverride} kuota khusus · ${totalClosed} tanggal ditutup`}
          actions={
            <span className={cn(
              "inline-flex items-center justify-center rounded-control px-2 py-1 text-[10px] font-semibold tracking-[0.08em] uppercase",
              "bg-accent-soft text-accent-strong border border-accent/20"
            )}>
              Zona Asia/Jakarta
            </span>
          }
        />
        <CardBody className="p-0">
          <ul className="divide-y divide-line">
            {availability.days.map((day) => (
              <DateOverrideRow
                key={day.date}
                day={day}
                defaultQuota={availability.defaultDailyQuota}
              />
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
