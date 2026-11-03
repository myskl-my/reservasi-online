"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/client/api";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    setPending(true);
    try {
      await apiRequest<unknown>("/api/auth/logout", {
        method: "POST",
        body: {},
      });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleLogout} disabled={pending}>
      {pending ? "Keluar..." : "Keluar"}
    </Button>
  );
}
