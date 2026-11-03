"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { apiRequest, ApiClientError } from "@/lib/client/api";

export function LoginForm() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiRequest<{ name: string }>("/api/auth/login", {
        method: "POST",
        body: { pin },
      });
      router.push("/admin");
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof ApiClientError
          ? requestError.message
          : "Login gagal. Silakan coba lagi.",
      );
      setPin("");
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardBody className="space-y-5 p-6 sm:p-7">
        {error ? <Alert tone="error">{error}</Alert> : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field
            label="PIN Admin"
            htmlFor="login-pin"
            hint="6–12 digit angka."
          >
            <Input
              id="login-pin"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="current-password"
              minLength={6}
              maxLength={12}
              value={pin}
              onChange={(event) =>
                setPin(event.target.value.replace(/\D/g, "").slice(0, 12))
              }
              placeholder="••••••"
              className="text-center font-mono text-lg tracking-[0.35em]"
              required
              autoFocus
            />
          </Field>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Memeriksa PIN..." : "Masuk"}
          </Button>
        </form>

        <p className="border-t border-line pt-4 text-center text-xs leading-relaxed text-ink-muted">
          Hanya admin yang memiliki akses. Tidak ada pendaftaran publik.{" "}
          <Link
            href="/"
            className="font-medium text-ink underline underline-offset-4"
          >
            Kembali
          </Link>
        </p>
      </CardBody>
    </Card>
  );
}
