import { TodayMonitor } from "@/components/public/today-monitor";
import { getAvailability } from "@/lib/data/settings";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const availability = await getAvailability({ days: 7 });

  return (
    <div className="mx-auto w-full max-w-lg">
      <h1 className="sr-only">Reservasi barbershop Reservasi online</h1>
      <TodayMonitor initialAvailability={availability} />
    </div>
  );
}
