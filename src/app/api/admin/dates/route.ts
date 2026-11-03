import { requireAdminApi } from "@/lib/auth/guards";
import {
  getActiveReservationCount,
  setDailyOverride,
} from "@/lib/data/settings";
import { ApiError, assertSameOrigin, ok, readJson, runApi } from "@/lib/http";
import { todayDateString } from "@/lib/dates";
import { dateOverrideSchema } from "@/lib/validation";

export async function PUT(request: Request): Promise<Response> {
  return runApi(async () => {
    await requireAdminApi();
    assertSameOrigin(request);
    const input = await readJson(request, dateOverrideSchema);

    if (input.date < todayDateString()) {
      throw new ApiError(
        400,
        "DATE_IN_PAST",
        "Pengaturan tanggal masa lalu tidak dapat diubah.",
      );
    }

    await setDailyOverride(input);
    const activeCount = await getActiveReservationCount(input.date);

    return ok({
      saved: true,
      date: input.date,
      activeCount,
      warning:
        input.maxQuota !== null && activeCount > input.maxQuota
          ? "Kuota lebih kecil dari reservasi aktif. Booking lama tidak dibatalkan, tetapi booking baru akan ditolak."
          : null,
    });
  });
}
