"use client";

import Link from "next/link";
import { useState } from "react";
import { DateCalendar } from "@/components/public/date-calendar";
import { Alert } from "@/components/ui/alert";
import { StatusBadge } from "@/components/ui/badge";
import { Button, buttonClassName } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { apiRequest, ApiClientError } from "@/lib/client/api";
import { useAvailabilityPolling } from "@/lib/client/use-availability";
import { formatDateID } from "@/lib/dates";
import type { AvailabilityResult, BookingConfirmation } from "@/lib/types";

const DATE_ERROR_CODES = new Set([
  "BOOKING_DISABLED",
  "DATE_CLOSED",
  "DATE_IN_PAST",
  "DATE_OUT_OF_RANGE",
  "QUOTA_FULL",
]);

type Step = "date" | "details";

export function BookingForm({
  initialAvailability,
}: {
  initialAvailability: AvailabilityResult;
}) {
  const { availability, connection, refresh } =
    useAvailabilityPolling(initialAvailability);
  const [step, setStep] = useState<Step>("date");
  const [selectedDate, setSelectedDate] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [confirmation, setConfirmation] =
    useState<BookingConfirmation | null>(null);
  const [copied, setCopied] = useState(false);

  const selectedDay = availability.days.find(
    (day) => day.date === selectedDate,
  );
  const selectedIsBookable = Boolean(selectedDay?.isAvailable);
  const dateBecameUnavailable = Boolean(selectedDate && !selectedIsBookable);

  function selectDate(date: string) {
    setSelectedDate(date);
    setFormError(null);
    setFieldErrors({});
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    if (!selectedDay?.isAvailable) {
      setFormError("Tanggal ini tidak tersedia lagi. Silakan pilih tanggal lain.");
      setStep("date");
      void refresh();
      return;
    }

    const nextFieldErrors: Record<string, string> = {};
    if (!customerName.trim()) {
      nextFieldErrors.customerName = "Nama wajib diisi.";
    }
    if (!customerPhone.trim()) {
      nextFieldErrors.customerPhone = "Nomor WhatsApp wajib diisi.";
    }
    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      const data = await apiRequest<{ booking: BookingConfirmation }>(
        "/api/public/reservations",
        {
          method: "POST",
          body: {
            customerName,
            customerPhone,
            bookingDate: selectedDate,
          },
        },
      );
      setConfirmation(data.booking);
      setCopied(false);
      void refresh();
    } catch (error) {
      if (error instanceof ApiClientError) {
        setFormError(error.message);
        setFieldErrors(error.fields);
        if (DATE_ERROR_CODES.has(error.code) || error.fields.bookingDate) {
          setStep("date");
        }
      } else {
        setFormError("Reservasi gagal dibuat. Silakan coba lagi.");
      }
      void refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function copyCode() {
    if (!confirmation) return;
    try {
      await navigator.clipboard.writeText(confirmation.bookingCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  function startOver() {
    setConfirmation(null);
    setStep("date");
    setSelectedDate("");
    setCustomerName("");
    setCustomerPhone("");
    setFormError(null);
    setFieldErrors({});
    setCopied(false);
    void refresh();
  }

  if (confirmation) {
    return (
      <div role="status" className="mx-auto max-w-lg">
        <Card>
          <CardBody className="space-y-6 p-6 sm:p-8">
            <div className="text-center">
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-success-soft text-base font-semibold text-success">
                ✓
              </span>
              <h2 className="mt-3 text-xl font-semibold tracking-tight text-ink">
                Reservasi berhasil
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
                Simpan kode ini untuk memeriksa status antrean.
              </p>
            </div>

            <div className="rounded-control border border-success/25 bg-success-soft px-4 py-5 text-center">
              <p className="text-[11px] font-semibold tracking-[0.14em] text-success uppercase">
                Kode booking
              </p>
              <p className="mt-1.5 font-mono text-3xl font-semibold tracking-wider text-ink">
                {confirmation.bookingCode}
              </p>
              <button
                type="button"
                onClick={() => void copyCode()}
                className="mt-2.5 text-xs font-semibold text-success underline decoration-success/40 underline-offset-4 transition-colors hover:text-ink"
              >
                {copied ? "Kode disalin" : "Salin kode"}
              </button>
            </div>

            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-control bg-surface-muted/60 p-3.5">
                <dt className="text-xs text-ink-muted">Nomor reservasi</dt>
                <dd className="mt-1 text-lg font-semibold text-ink tabular-nums">
                  #{confirmation.queueNumber}
                </dd>
              </div>
              <div className="rounded-control bg-surface-muted/60 p-3.5">
                <dt className="text-xs text-ink-muted">Status</dt>
                <dd className="mt-1.5">
                  <StatusBadge status={confirmation.status} />
                </dd>
              </div>
              <div className="col-span-2 rounded-control bg-surface-muted/60 p-3.5">
                <dt className="text-xs text-ink-muted">Tanggal reservasi</dt>
                <dd className="mt-1 font-medium text-ink">
                  {formatDateID(confirmation.bookingDate)}
                </dd>
              </div>
            </dl>

            <div className="space-y-2">
              <Link
                href={`/booking/status?code=${encodeURIComponent(confirmation.bookingCode)}`}
                className={buttonClassName({ className: "w-full" })}
              >
                Lihat Status Antrean
              </Link>
              <Button variant="ghost" className="w-full" onClick={startOver}>
                Buat reservasi lain
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <ol className="mx-auto flex max-w-sm items-center gap-3 text-xs font-medium">
        <li
          aria-current={step === "date" ? "step" : undefined}
          className={
            step === "date"
              ? "flex items-center gap-2 text-ink"
              : "flex items-center gap-2 text-ink-muted/70"
          }
        >
          <span
            className={
              step === "date"
                ? "flex h-6 w-6 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-white"
                : "flex h-6 w-6 items-center justify-center rounded-full bg-surface-muted text-[11px] font-semibold text-ink-muted"
            }
          >
            1
          </span>
          Tanggal
        </li>
        <li aria-hidden="true" className="h-px flex-1 bg-line" />
        <li
          aria-current={step === "details" ? "step" : undefined}
          className={
            step === "details"
              ? "flex items-center gap-2 text-ink"
              : "flex items-center gap-2 text-ink-muted/70"
          }
        >
          <span
            className={
              step === "details"
                ? "flex h-6 w-6 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-white"
                : "flex h-6 w-6 items-center justify-center rounded-full bg-surface-muted text-[11px] font-semibold text-ink-muted"
            }
          >
            2
          </span>
          Data
        </li>
      </ol>

      {connection === "offline" ? (
        <Alert tone="warning">
          Ketersediaan mungkin belum terbaru.{" "}
          <button
            type="button"
            onClick={() => void refresh()}
            className="font-semibold underline underline-offset-2"
          >
            Coba lagi
          </button>
        </Alert>
      ) : null}

      {formError ? <Alert tone="error">{formError}</Alert> : null}

      {step === "date" ? (
        <Card>
          <CardBody className="space-y-5 p-5 sm:p-6">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-ink">
                Pilih tanggal
              </h2>
              <p className="mt-0.5 text-sm text-ink-muted">30 hari ke depan.</p>
            </div>

            <DateCalendar
              availability={availability}
              selectedDate={selectedDate}
              onSelect={selectDate}
            />

            {dateBecameUnavailable ? (
              <p className="text-xs font-medium text-danger">
                Tanggal yang dipilih baru saja tidak tersedia. Pilih tanggal
                lain.
              </p>
            ) : null}

            <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
              <Link
                href="/"
                className={buttonClassName({ variant: "ghost", size: "sm" })}
              >
                Kembali
              </Link>
              <Button
                onClick={() => setStep("details")}
                disabled={!selectedIsBookable}
              >
                Lanjut
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody className="space-y-5 p-5 sm:p-6">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-ink">
                Konfirmasi reservasi
              </h2>
              <p className="mt-0.5 text-sm text-ink-muted">Isi data diri</p>
            </div>

            {selectedDay ? (
              <div className="flex items-center justify-between gap-3 rounded-control bg-surface-muted/60 px-4 py-3">
                <div>
                  <p className="text-xs text-ink-muted">Tanggal</p>
                  <p className="mt-0.5 text-sm font-medium text-ink">
                    {formatDateID(selectedDay.date)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep("date")}
                  className="text-xs font-semibold text-accent underline-offset-4 hover:text-ink hover:underline"
                >
                  Ubah
                </button>
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <Field
                label="Nama"
                htmlFor="customer-name"
                error={fieldErrors.customerName}
              >
                <Input
                  id="customer-name"
                  name="customerName"
                  autoComplete="name"
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  placeholder="Nama lengkap"
                  maxLength={80}
                />
              </Field>

              <Field
                label="Nomor WhatsApp"
                htmlFor="customer-phone"
                hint="Contoh: 081234567890."
                error={fieldErrors.customerPhone}
              >
                <Input
                  id="customer-phone"
                  name="customerPhone"
                  inputMode="tel"
                  autoComplete="tel"
                  value={customerPhone}
                  onChange={(event) => setCustomerPhone(event.target.value)}
                  placeholder="08xxxxxxxxxx"
                  maxLength={25}
                />
              </Field>

              {dateBecameUnavailable ? (
                <Alert tone="warning">
                  Tanggal ini tidak tersedia lagi. Pilih tanggal lain sebelum
                  mengonfirmasi.
                </Alert>
              ) : null}

              <div className="flex flex-col gap-2 border-t border-line pt-4 sm:flex-row">
                <Button
                  type="button"
                  variant="secondary"
                  className="sm:flex-1"
                  onClick={() => setStep("date")}
                  disabled={submitting}
                >
                  Kembali
                </Button>
                <Button
                  type="submit"
                  className="sm:flex-[2]"
                  disabled={submitting || !selectedIsBookable}
                >
                  {submitting ? "Memproses..." : "Konfirmasi Reservasi"}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
