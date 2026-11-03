import type { Metadata } from "next";
import { CalendarCheck } from "lucide-react";
import { BookingForm } from "@/components/public/booking-form";
import { getAvailability } from "@/lib/data/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reservasi",
  description: "Pilih tanggal dan buat reservasi barbershop tanpa akun.",
};

export default async function BookingPage() {
  const availability = await getAvailability();

  return (
    <div id="tanggal" className="mx-auto w-full max-w-3xl">
      <div className="animate-fade-in-up mb-7 text-center">
        <span className="bg-gradient-accent inline-flex h-14 w-14 items-center justify-center rounded-2xl shadow-glow-accent">
          <CalendarCheck
            aria-hidden="true"
            className="h-7 w-7 text-white"
            strokeWidth={2.1}
          />
        </span>
        <p className="mt-4 text-[11px] font-bold tracking-[0.2em] text-accent-strong uppercase">
          Reservasi online
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tighter text-ink sm:text-4xl">
          Pilih tanggal kunjungan Anda
        </h1>
        <p className="mx-auto mt-2.5 max-w-md text-sm leading-relaxed text-ink-muted">
          Isi nama & nomor WhatsApp, dan jangan lupa simpan kode booking
          Anda.
        </p>
      </div>

      <div className="animate-fade-in-up" style={{ animationDelay: "80ms" }}>
        <BookingForm initialAvailability={availability} />
      </div>
    </div>
  );
}
