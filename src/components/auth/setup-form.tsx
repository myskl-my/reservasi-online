"use client";

import Link from "next/link";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClassName } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { apiRequest, ApiClientError } from "@/lib/client/api";

export function SetupForm() {
  const [setupToken, setSetupToken] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    if (pin !== confirmPin) {
      setFieldErrors({ confirmPin: "Konfirmasi PIN tidak sama." });
      return;
    }

    setLoading(true);
    try {
      await apiRequest<{ created: boolean }>("/api/setup", {
        method: "POST",
        body: { setupToken, name, email, pin },
      });
      setSuccess(true);
    } catch (requestError) {
      if (requestError instanceof ApiClientError) {
        setError(requestError.message);
        setFieldErrors(requestError.fields);
      } else {
        setError("Setup admin gagal. Silakan coba lagi.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <Card>
        <CardBody className="space-y-5 p-6 text-center sm:p-7">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-success-soft text-base font-semibold text-success">
            ✓
          </span>
          <Alert tone="success" title="Admin berhasil dibuat">
            Gunakan PIN yang baru saja Anda isi untuk masuk ke dashboard.
          </Alert>
          <Link href="/login" className={buttonClassName({ className: "w-full" })}>
            Masuk ke Dashboard
          </Link>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardBody className="space-y-5 p-6 sm:p-7">
        {error ? <Alert tone="error">{error}</Alert> : null}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-4">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-ink-muted uppercase">
              Verifikasi setup
            </p>
            <Field
              label="Token setup"
              htmlFor="setup-token"
              hint="Nilai ADMIN_SETUP_TOKEN dari konfigurasi server."
              error={fieldErrors.setupToken}
            >
              <Input
                id="setup-token"
                type="password"
                value={setupToken}
                onChange={(event) => setSetupToken(event.target.value)}
                autoComplete="off"
                required
              />
            </Field>
          </div>

          <div className="space-y-4 border-t border-line pt-5">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-ink-muted uppercase">
              Akun admin
            </p>
            <Field label="Nama admin" htmlFor="setup-name" error={fieldErrors.name}>
              <Input
                id="setup-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                required
              />
            </Field>

            <Field label="Email" htmlFor="setup-email" error={fieldErrors.email}>
              <Input
                id="setup-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="username"
                required
              />
            </Field>
          </div>

          <div className="space-y-4 border-t border-line pt-5">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-ink-muted uppercase">
              PIN keamanan
            </p>
            <Field
              label="PIN admin"
              htmlFor="setup-pin"
              hint="6–12 digit angka. Hanya disimpan sebagai hash Argon2id di server."
              error={fieldErrors.pin}
            >
              <Input
                id="setup-pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                value={pin}
                onChange={(event) =>
                  setPin(event.target.value.replace(/\D/g, "").slice(0, 12))
                }
                autoComplete="new-password"
                minLength={6}
                maxLength={12}
                required
              />
            </Field>

            <Field
              label="Ulangi PIN"
              htmlFor="setup-pin-confirm"
              error={fieldErrors.confirmPin}
            >
              <Input
                id="setup-pin-confirm"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                value={confirmPin}
                onChange={(event) =>
                  setConfirmPin(event.target.value.replace(/\D/g, "").slice(0, 12))
                }
                autoComplete="new-password"
                minLength={6}
                maxLength={12}
                required
              />
            </Field>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Membuat admin..." : "Buat Admin Pertama"}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
