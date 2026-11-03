"use client";

import { useEffect, useRef } from "react";

export function usePolling(
  callback: () => unknown,
  options: { enabled?: boolean; intervalMs?: number } = {},
) {
  const savedCallback = useRef(callback);
  const { enabled = true, intervalMs = 30_000 } = options;

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    let stopped = false;

    async function run() {
      if (stopped) return;
      try {
        await savedCallback.current();
      } catch {
        // The callback owns its error state.
      }
    }

    const timer = window.setInterval(() => {
      void run();
    }, intervalMs);

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void run();
      }
    }

    function handleOnline() {
      void run();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", handleOnline);

    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleOnline);
    };
  }, [enabled, intervalMs]);
}
