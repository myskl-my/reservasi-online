import { Scissors } from "lucide-react";
import { TodayMonitor } from "@/components/public/today-monitor";
import { getAvailability } from "@/lib/data/settings";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const availability = await getAvailability({ days: 7 });

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="animate-fade-in-up mb-7 text-center">
        <span className="bg-gradient-accent inline-flex h-14 w-14 items-center justify-center rounded-2xl shadow-glow-accent">
          <Scissors aria-hidden="true" className="h-7 w-7 text-white" strokeWidth={2.1} />
        </span>
        <p className="mt-4 text-[11px] font-bold tracking-[0.2em] text-accent-strong uppercase">
          RESERVASI
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tighter text-ink sm:text-4xl">
          Halaman untuk reservasi online Barbershop
        </h1>
      </div>

      <div className="animate-fade-in-up" style={{ animationDelay: "80ms" }}>
        <TodayMonitor initialAvailability={availability} />
      </div>
    </div>
  );
}
