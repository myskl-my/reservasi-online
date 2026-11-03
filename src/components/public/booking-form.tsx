"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Copy,
  Hash,
  Pencil,
  Search,
  User,
  WifiOff,
} from "lucide-react";
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
      <div role="status" className="animate-fade-in-up mx-auto max-w-lg">
        <Card>
          <CardBody className="space-y-6 p-6 sm:p-8">
            <div className="text-center">
              <span className="bg-gradient-accent animate-pop mx-auto flex h-16 w-16 items-center justify-center rounded-full shadow-glow-accent">
                <CheckCircle2
                  aria-hidden="true"
                  className="h-8 w-8 text-white"
                  strokeWidth={2.2}
                />
              </span>
              <p className="mt-4 text-[11px] font-bold tracking-[0.16em] text-success uppercase">
                Selesai
              </p>
              <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-ink">
                Reservasi berhasil
              </h2>
              <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-ink-muted">
                Simpan kode ini untuk memeriksa status antrean.
              </p>
            </div>

            {/* Kartu kode booking */}
            <div className="bg-gradient-accent relative overflow-hidden rounded-card p-5 text-center shadow-glow-accent">
              <div
                aria-hidden="true"
                className="absolute -top-12 -left-10 h-32 w-32 rounded-full bg-white/15 blur-xl"
              />
              <div
                aria-hidden="true"
                className="absolute -right-10 -bottom-14 h-32 w-32 rounded-full bg-white/10 blur-xl"
              />
              <p className="relative text-[11px] font-bold tracking-[0.16em] text-white/80 uppercase">
                Kode booking
              </p>
              <p className="relative mt-2 font-mono text-3xl font-bold tracking-[0.14em] text-white sm:text-4xl">
                {confirmation.bookingCode}
              </p>
              <button
                type="button"
                onClick={() => void copyCode()}
                className="relative mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-2 text-xs font-bold text-white ring-1 ring-white/30 transition-all duration-150 hover:bg-white/25"
              >
                {copied ? (
                  <>
                    <Check aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={3} />
                    Tersalin!
                  </>
                ) : (
                  <>
                    <Copy aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.4} />
                    Salin kode
                  </>
                )}
              </button>
            </div>

            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-card border border-line bg-surface-muted/60 p-3.5">
                <dt className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-ink-muted uppercase">
                  <Hash aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.4} />
                  Nomor antrean
                </dt>
                <dd className="mt-1.5 text-2xl font-bold text-ink tabular-nums">
                  #{confirmation.queueNumber}
                </dd>
              </div>
              <div className="rounded-card border border-line bg-surface-muted/60 p-3.5">
                <dt className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-ink-muted uppercase">
                  <User aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.4} />
                  Status
                </dt>
                <dd className="mt-2">
                  <StatusBadge status={confirmation.status} />
                </dd>
              </div>
              <div className="col-span-2 rounded-card border border-line bg-surface-muted/60 p-3.5">
                <dt className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-ink-muted uppercase">
                  <CalendarDays aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.4} />
                  Tanggal reservasi
                </dt>
                <dd className="mt-1.5 text-[15px] font-semibold text-ink">
                  {formatDateID(confirmation.bookingDate)}
                </dd>
              </div>
            </dl>

            <div className="space-y-2.5">
              <Link
                href={`/booking/status?code=${encodeURIComponent(confirmation.bookingCode)}`}
                className={buttonClassName({ size: "lg", className: "w-full" })}
              >
                <Search aria-hidden="true" className="h-4 w-4" strokeWidth={2.3} />
                Lihat Status Antrean
                <ArrowRight aria-hidden="true" className="h-4 w-4" strokeWidth={2.4} />
              </Link>
              <Button variant="secondary" className="w-full" onClick={startOver}>
                Buat reservasi lain
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  const dateDone = step === "details";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Step rail progresif */}
      <ol
        aria-label="Langkah reservasi"
        className="mx-auto flex max-w-md items-center gap-3"
      >
        <StepItem
          active={step === "date"}
          done={dateDone}
          icon={<CalendarDays aria-hidden="true" className="h-4 w-4" strokeWidth={2.3} />}
          label="Tanggal"
          index={1}
        />
        <li aria-hidden="true" className="relative h-0.5 flex-1 overflow-hidden rounded-full bg-line">
          <span
            className={cnAbsolute(dateDone)}
            style={{ width: dateDone ? "100%" : "0%" }}
          />
        </li>
        <StepItem
          active={step === "details"}
          done={false}
          icon={<User aria-hidden="true" className="h-4 w-4" strokeWidth={2.3} />}
          label="Data diri"
          index={2}
        />
      </ol>

      {connection === "offline" ? (
        <Alert tone="warning" title="Koneksi terputus">
          <span className="flex items-center gap-2">
            <WifiOff aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.2} />
            Ketersediaan mungkin belum terbaru.
            <button
              type="button"
              onClick={() => void refresh()}
              className="font-semibold underline underline-offset-2"
            >
              Coba lagi
            </button>
          </span>
        </Alert>
      ) : null}

      {formError ? <Alert tone="error" title="Gagal">{formError}</Alert> : null}

      {step === "date" ? (
        <Card className="animate-fade-in-up">
          <CardBody className="space-y-5 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="bg-gradient-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-control shadow-glow-accent">
                <CalendarDays aria-hidden="true" className="h-5 w-5 text-white" strokeWidth={2.2} />
              </span>
              <div>
                <h2 className="text-lg font-bold tracking-tight text-ink">
                  Pilih tanggal kunjungan
                </h2>
                <p className="mt-0.5 text-sm text-ink-muted">
                  Slot tersedia untuk 30 hari ke depan.
                </p>
              </div>
            </div>

            <DateCalendar
              availability={availability}
              selectedDate={selectedDate}
              onSelect={selectDate}
            />

            {dateBecameUnavailable ? (
              <Alert tone="warning" title="Tanggal tidak tersedia">
                Tanggal yang dipilih baru saja tidak tersedia. Pilih tanggal lain.
              </Alert>
            ) : null}

            <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
              <Link
                href="/"
                className={buttonClassName({ variant: "ghost", size: "sm" })}
              >
                <ArrowLeft aria-hidden="true" className="h-4 w-4" strokeWidth={2.3} />
                Beranda
              </Link>
              <Button
                onClick={() => setStep("details")}
                disabled={!selectedIsBookable}
                size="lg"
              >
                Lanjut
                <ArrowRight aria-hidden="true" className="h-4 w-4" strokeWidth={2.4} />
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : (
        <Card className="animate-fade-in-up">
          <CardBody className="space-y-5 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="bg-gradient-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-control shadow-glow-accent">
                <User aria-hidden="true" className="h-5 w-5 text-white" strokeWidth={2.2} />
              </span>
              <div>
                <h2 className="text-lg font-bold tracking-tight text-ink">
                  Konfirmasi reservasi
                </h2>
                <p className="mt-0.5 text-sm text-ink-muted">
                  Isi data diri Anda untuk menyelesaikan booking.
                </p>
              </div>
            </div>

            {selectedDay ? (
              <div className="flex items-center justify-between gap-3 rounded-card border border-accent/30 bg-gradient-to-r from-accent-soft to-surface px-4 py-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-control bg-white text-accent-strong shadow-card">
                    <CalendarDays aria-hidden="true" className="h-4.5 w-4.5" strokeWidth={2.2} />
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold tracking-wide text-accent-strong uppercase">
                      Tanggal reservasi
                    </p>
                    <p className="text-[15px] font-bold text-ink">
                      {formatDateID(selectedDay.date)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep("date")}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-bold text-ink-muted transition-all duration-150 hover:border-accent/40 hover:text-accent-strong"
                >
                  <Pencil aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.4} />
                  Ubah
                </button>
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <Field
                label="Nama lengkap"
                htmlFor="customer-name"
                error={fieldErrors.customerName}
              >
                <Input
                  id="customer-name"
                  name="customerName"
                  autoComplete="name"
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  placeholder="Nama Anda"
                  maxLength={80}
                />
              </Field>

              <Field
                label="Nomor WhatsApp"
                htmlFor="customer-phone"
                hint="Contoh: 081234567890. Digunakan untuk konfirmasi antrean."
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
                <Alert tone="warning" title="Tanggal tidak tersedia">
                  Tanggal ini tidak tersedia lagi. Pilih tanggal lain sebelum
                  mengonfirmasi.
                </Alert>
              ) : null}

              <div className="flex flex-col gap-2.5 border-t border-line pt-4 sm:flex-row">
                <Button
                  type="button"
                  variant="secondary"
                  className="sm:flex-1"
                  onClick={() => setStep("date")}
                  disabled={submitting}
                >
                  <ArrowLeft aria-hidden="true" className="h-4 w-4" strokeWidth={2.3} />
                  Kembali
                </Button>
                <Button
                  type="submit"
                  className="sm:flex-[2]"
                  disabled={submitting || !selectedIsBookable}
                  size="lg"
                >
                  {submitting ? (
                    "Memproses..."
                  ) : (
                    <>
                      Konfirmasi Reservasi
                      <ArrowRight aria-hidden="true" className="h-4 w-4" strokeWidth={2.4} />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

/** Isi rail penghubung step saat tahap selesai. */
function cnAbsolute(done: boolean): string {
  return done
    ? "absolute inset-y-0 left-0 bg-gradient-accent transition-[width] duration-500 ease-out"
    : "absolute inset-y-0 left-0 bg-gradient-accent";
}

function StepItem({
  active,
  done,
  icon,
  label,
  index,
}: {
  active: boolean;
  done: boolean;
  icon: React.ReactNode;
  label: string;
  index: number;
}) {
  return (
    <li
      aria-current={active ? "step" : undefined}
      className="flex items-center gap-2.5"
    >
      <span
        className={[
          "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-200",
          active
            ? "border-transparent bg-gradient-accent text-white shadow-glow-accent"
            : done
              ? "border-transparent bg-success text-white"
              : "border-line bg-surface text-ink-muted",
        ].join(" ")}
      >
        {done ? (
          <Check aria-hidden="true" className="h-4.5 w-4.5" strokeWidth={3} />
        ) : (
          icon
        )}
        <span className="sr-only">Langkah {index}</span>
      </span>
      <span
        className={[
          "text-[13px] font-bold tracking-tight",
          active ? "text-ink" : done ? "text-ink-muted" : "text-ink-muted/70",
        ].join(" ")}
      >
        {label}
      </span>
    </li>
  );
}
