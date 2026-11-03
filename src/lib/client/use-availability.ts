"use client";

import { useCallback, useState } from "react";
import { apiRequest } from "@/lib/client/api";
import { usePolling } from "@/lib/client/use-polling";
import type { AvailabilityResult } from "@/lib/types";

export type AvailabilityConnection = "idle" | "online" | "offline";

export function useAvailabilityPolling(
  initialAvailability: AvailabilityResult,
  intervalMs = 30_000,
) {
  const [availability, setAvailability] =
    useState<AvailabilityResult>(initialAvailability);
  const [connection, setConnection] =
    useState<AvailabilityConnection>("idle");

  const refresh = useCallback(async () => {
    try {
      const data = await apiRequest<AvailabilityResult>(
        "/api/public/availability",
      );
      setAvailability(data);
      setConnection("online");
      return data;
    } catch {
      setConnection("offline");
      return null;
    }
  }, []);

  usePolling(refresh, { intervalMs });

  return { availability, connection, refresh };
}
