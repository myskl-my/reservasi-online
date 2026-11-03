import type { Metadata } from "next";
import { StatusChecker } from "@/components/public/status-checker";
import { isValidBookingCode } from "@/lib/booking-code";
import { getPublicReservationStatus } from "@/lib/data/reservations";
import type { PublicReservationStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Status Antrean",
  description: "Periksa status dan posisi antrean dengan kode booking.",
};

export default async function BookingStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const params = await searchParams;
  const initialCode =
    typeof params.code === "string" ? params.code.trim().toUpperCase() : "";

  let initialReservation: PublicReservationStatus | null = null;
  let initialError: string | null = null;

  if (initialCode) {
    if (!isValidBookingCode(initialCode)) {
      initialError = "Format kode booking tidak valid. Contoh: CQ-ABCDEFGH.";
    } else {
      initialReservation = await getPublicReservationStatus(initialCode);
      if (!initialReservation) {
        initialError = "Reservasi tidak ditemukan. Periksa kembali kode booking Anda.";
      }
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-5 text-center">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-accent uppercase">
          Cek reservasi
        </p>
        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-ink">
          Status antrean
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
          Masukkan kode booking untuk melihat posisi dan status Anda.
        </p>
      </div>
      <StatusChecker
        initialCode={initialCode}
        initialReservation={initialReservation}
        initialError={initialError}
      />
    </div>
  );
}
