"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { apiRequest, ApiClientError } from "@/lib/client/api";

export function CreateWalkInForm() {
  const router = useRouter();
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [createdQueue, setCreatedQueue] = useState<number | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setFieldErrors({});
    setCreatedQueue(null);

    try {
      const data = await apiRequest<{
        walkIn: { queueNumber: number; customerName: string };
      }>("/api/admin/walk-ins", {
        method: "POST",
        body: {
          customerName,
          customerPhone: customerPhone.trim() || undefined,
        },
      });
      setCreatedQueue(data.walkIn.queueNumber);
      setCustomerName("");
      setCustomerPhone("");
      router.refresh();
    } catch (requestError) {
      if (requestError instanceof ApiClientError) {
        setError(requestError.message);
        setFieldErrors(requestError.fields);
      } else {
        setError("Walk-in gagal ditambahkan.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error ? <Alert tone="error">{error}</Alert> : null}
      {createdQueue !== null ? (
        <Alert tone="success">
          Walk-in ditambahkan dengan nomor antrean <strong>W-{createdQueue}</strong>.
        </Alert>
      ) : null}

      <Field
        label="Nama pelanggan"
        htmlFor="walkin-name"
        error={fieldErrors.customerName}
      >
        <Input
          id="walkin-name"
          value={customerName}
          onChange={(event) => setCustomerName(event.target.value)}
          maxLength={80}
          required
        />
      </Field>

      <Field
        label="Nomor WhatsApp (opsional)"
        htmlFor="walkin-phone"
        error={fieldErrors.customerPhone}
      >
        <Input
          id="walkin-phone"
          inputMode="tel"
          value={customerPhone}
          onChange={(event) => setCustomerPhone(event.target.value)}
          maxLength={25}
          placeholder="08xxxxxxxxxx"
        />
      </Field>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Menambahkan..." : "Tambah Walk-in Hari Ini"}
      </Button>
      <p className="text-xs text-ink-muted">
        Walk-in memakai antrean terpisah dan tidak mengurangi kuota reservasi
        online.
      </p>
    </form>
  );
}
