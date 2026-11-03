"use client";

import { useCallback, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Hash,
  RefreshCw,
  Search,
  Ticket,
  User,
  WifiOff,
} from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { apiRequest, ApiClientError } from "@/lib/client/api";
import { usePolling } from "@/lib/client/use-polling";
import { formatDateID } from "@/lib/dates";
import { isValidBookingCode } from "@/lib/booking-code";
import {
  ACTIVE_RESERVATION_STATUSES,
  type PublicReservationStatus,
  type ReservationStatus,
} from "@/lib/types";

const LIVE_STATUSES = new Set<ReservationStatus>(ACTIVE_RESERVATION_STATUSES);

export function StatusChecker({
  initialCode,
  initialReservation,
  initialError,
}: {
  initialCode: string;
  initialReservation: PublicReservationStatus | null;
  initialError: string | null;
}) {
  const [code, setCode] = useState(initialCode);
  const [reservation, setReservation] =
    useState<PublicReservationStatus | null>(initialReservation);
  const [showForm, setShowForm] = useState(!initialReservation);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const lookup = useCallback(
    async (rawCode: string, options: { silent?: boolean } = {}) => {
      const normalized = rawCode.trim().toUpperCase();

      if (!options.silent) {
        setLoading(true);
        setError(null);
        setConnectionError(null);
      }

      if (!isValidBookingCode(normalized)) {
        setReservation(null);
        setShowForm(true);
        setError("Format kode booking tidak valid. Contoh: CQ-ABCDEFGH.");
        if (!options.silent) setLoading(false);
        return;
      }

      try {
        const data = await apiRequest<{ reservation: PublicReservationStatus }>(
          `/api/public/reservations/status?code=${encodeURIComponent(normalized)}`,
        );
        setReservation(data.reservation);
        setShowForm(false);
        setError(null);
        setConnectionError(null);
        if (!options.silent) {
          setCode(normalized);
          window.history.replaceState(
            null,
            "",
            `/booking/status?code=${encodeURIComponent(normalized)}`,
          );
        }
      } catch (requestError) {
        const message =
          requestError instanceof ApiClientError
            ? requestError.message
            : "Status reservasi tidak dapat dimuat.";
        const notFound =
          requestError instanceof ApiClientError && requestError.status === 404;

        if (options.silent && !notFound) {
          setConnectionError(message);
        } else {
          setReservation(null);
          setShowForm(true);
          setError(message);
        }
      } finally {
        if (!options.silent) setLoading(false);
      }
    },
    [],
  );

  const refresh = useCallback(() => {
    if (!reservation) return;
    void lookup(reservation.bookingCode, { silent: true });
  }, [lookup, reservation]);

  usePolling(refresh, {
    enabled: Boolean(reservation && LIVE_STATUSES.has(reservation.status)),
    intervalMs: 20_000,
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await lookup(code);
  }

  function openForm() {
    setReservation(null);
    setShowForm(true);
    setError(null);
    setConnectionError(null);
    setCode("");
    window.history.replaceState(null, "", "/booking/status");
  }

  if (!showForm && reservation) {
    return (
      <ReservationResult
        reservation={reservation}
        connectionError={connectionError}
        onRefresh={refresh}
        onOpenForm={openForm}
      />
    );
  }

  return (
    <div className="animate-fade-in-up mx-auto max-w-md space-y-4">
      <Card accent>
        <CardBody className="space-y-4 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="bg-gradient-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-control shadow-glow-accent">
              <Ticket aria-hidden="true" className="h-5 w-5 text-white" strokeWidth={2.2} />
            </span>
            <div>
              <h2 className="text-[15px] font-bold tracking-tight text-ink">
                Cek status antrean
              </h2>
              <p className="text-xs text-ink-muted">
                Masukkan kode booking Anda.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <Field label="Kode booking" htmlFor="booking-code">
              <Input
                id="booking-code"
                value={code}
                onChange={(event) => {
                  setCode(event.target.value.toUpperCase());
                  setError(null);
                }}
                placeholder="CQ-XXXXXXXX"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                maxLength={11}
                className="text-center font-mono text-base font-semibold tracking-wider"
              />
            </Field>
            <Button type="submit" className="w-full" disabled={loading} size="lg">
              {loading ? (
                "Memeriksa..."
              ) : (
                <>
                  <Search aria-hidden="true" className="h-4 w-4" strokeWidth={2.4} />
                  Lihat Status
                </>
              )}
            </Button>
          </form>
        </CardBody>
      </Card>
      {error ? (
        <Alert tone="error" title="Tidak ditemukan">
          {error}
        </Alert>
      ) : null}
    </div>
  );
}

function ReservationResult({
  reservation,
  connectionError,
  onRefresh,
  onOpenForm,
}: {
  reservation: PublicReservationStatus;
  connectionError: string | null;
  onRefresh: () => void;
  onOpenForm: () => void;
}) {
  const isLive = LIVE_STATUSES.has(reservation.status);

  return (
    <div className="animate-fade-in-up mx-auto max-w-md" aria-live="polite">
      <Card>
        {/* Header status dengan ikon antrean */}
        <div className="bg-gradient-accent relative overflow-hidden px-6 py-5">
          <div
            aria-hidden="true"
            className="absolute -top-14 -right-10 h-36 w-36 rounded-full bg-white/15 blur-2xl"
          />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.16em] text-white/80 uppercase">
                <Hash aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.6} />
                Nomor antrean
              </p>
              <p className="mt-1.5 text-6xl font-bold leading-none tracking-tighter text-white tabular-nums">
                #{reservation.queueNumber}
              </p>
            </div>
            <span className="mt-1">
              <StatusBadge
                status={reservation.status}
                className="bg-white/95 text-ink ring-0"
              />
            </span>
          </div>
        </div>

        <CardBody className="space-y-5 p-6 sm:p-7">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-card border border-line bg-surface-muted/60 p-3.5">
              <dt className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-ink-muted uppercase">
                <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.4} />
                Posisi saat ini
              </dt>
              <dd className="mt-1.5 text-2xl font-bold text-ink tabular-nums">
                {reservation.position ? `#${reservation.position}` : "-"}
              </dd>
            </div>
            <div className="rounded-card border border-line bg-surface-muted/60 p-3.5">
              <dt className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-ink-muted uppercase">
                <CalendarDays aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.4} />
                Tanggal
              </dt>
              <dd className="mt-1.5 text-[15px] font-bold text-ink">
                {formatDateID(reservation.bookingDate)}
              </dd>
            </div>
          </dl>

          <div className="rounded-card border border-line bg-surface-muted/50 p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-ink-muted uppercase">
              <User aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.4} />
              Pelanggan
            </p>
            <p className="mt-1 text-[15px] font-semibold text-ink">
              {reservation.customerName}
            </p>
            <p className="mt-0.5 text-xs text-ink-muted">
              {reservation.customerPhoneMasked}
            </p>
          </div>

          <p className="border-t border-line pt-4 text-sm leading-relaxed text-ink-muted">
            {statusMessage(reservation.status)}
          </p>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4 text-xs">
            {connectionError ? (
              <span className="flex items-center gap-1.5 font-medium text-warning">
                <WifiOff aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.2} />
                Koneksi terputus. Data terakhir ditampilkan.
              </span>
            ) : isLive ? (
              <span className="inline-flex items-center gap-2 font-semibold text-success">
                <span
                  aria-hidden="true"
                  className="animate-pulse-dot h-2 w-2 rounded-full bg-success"
                />
                Live · diperbarui otomatis
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 font-medium text-ink-muted">
                Status final
              </span>
            )}

            <div className="flex items-center gap-3">
              {connectionError ? (
                <button
                  type="button"
                  onClick={onRefresh}
                  className="inline-flex items-center gap-1 font-semibold text-warning underline underline-offset-2"
                >
                  <RefreshCw aria-hidden="true" className="h-3 w-3" strokeWidth={2.6} />
                  Coba lagi
                </button>
              ) : null}
              <button
                type="button"
                onClick={onOpenForm}
                className="inline-flex items-center gap-1 font-semibold text-accent-strong underline-offset-4 transition-colors hover:text-ink hover:underline"
              >
                <Search aria-hidden="true" className="h-3 w-3" strokeWidth={2.6} />
                Cek kode lain
              </button>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function statusMessage(status: ReservationStatus): string {
  switch (status) {
    case "CONFIRMED":
      return "Reservasi tercatat. Silakan datang sesuai tanggal pemesanan.";
    case "WAITING":
      return "Anda sudah check-in dan menunggu dipanggil.";
    case "CALLED":
      return "Nomor Anda sedang dipanggil, silakan menuju meja layanan.";
    case "IN_SERVICE":
      return "Sedang dilayani. Mohon tunggu sebentar.";
    case "COMPLETED":
      return "Layanan selesai. Terima kasih sudah berkunjung!";
    case "CANCELLED":
      return "Reservasi dibatalkan.";
    case "NO_SHOW":
      return "Reservasi ditandai tidak hadir.";
    default:
      return "Status reservasi tidak dikenal.";
  }
}
