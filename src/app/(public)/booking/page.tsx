import type { Metadata } from "next";
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
      <h1 className="sr-only">Reservasi</h1>
      <BookingForm initialAvailability={availability} />
    </div>
  );
}
