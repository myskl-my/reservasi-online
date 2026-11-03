import type { Metadata } from "next";
import { Search } from "lucide-react";
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
        initialError =
          "Reservasi tidak ditemukan. Periksa kembali kode booking Anda.";
      }
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="animate-fade-in-up mb-7 text-center">
        <span className="bg-gradient-accent inline-flex h-14 w-14 items-center justify-center rounded-2xl shadow-glow-accent">
          <Search aria-hidden="true" className="h-7 w-7 text-white" strokeWidth={2.1} />
        </span>
        <p className="mt-4 text-[11px] font-bold tracking-[0.2em] text-accent-strong uppercase">
          Cek reservasi
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tighter text-ink">
          Status antrean
        </h1>
        <p className="mx-auto mt-2.5 max-w-xs text-sm leading-relaxed text-ink-muted">
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
