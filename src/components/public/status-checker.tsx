"use client";

import { useCallback, useState } from "react";
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
    <div className="mx-auto max-w-md space-y-4">
      <Card>
        <CardBody className="space-y-4 p-5 sm:p-6">
          <p className="text-sm leading-relaxed text-ink-muted">
            Masukkan kode booking untuk melihat status dan posisi antrean.
          </p>
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
                className="text-center font-mono text-base tracking-wider"
              />
            </Field>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Memeriksa..." : "Lihat Status"}
            </Button>
          </form>
        </CardBody>
      </Card>
      {error ? <Alert tone="error">{error}</Alert> : null}
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
    <div className="mx-auto max-w-md" aria-live="polite">
      <Card>
        <CardBody className="space-y-6 p-6 sm:p-8">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.14em] text-ink-muted uppercase">
                Nomor antrean
              </p>
              <p className="mt-1.5 text-5xl font-semibold leading-none tracking-tight text-ink tabular-nums">
                #{reservation.queueNumber}
              </p>
            </div>
            <StatusBadge status={reservation.status} />
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-control bg-surface-muted/60 p-3.5">
              <dt className="text-xs text-ink-muted">Posisi saat ini</dt>
              <dd className="mt-1 text-lg font-semibold text-ink tabular-nums">
                {reservation.position ? `#${reservation.position}` : "-"}
              </dd>
            </div>
            <div className="rounded-control bg-surface-muted/60 p-3.5">
              <dt className="text-xs text-ink-muted">Tanggal reservasi</dt>
              <dd className="mt-1 font-medium text-ink">
                {formatDateID(reservation.bookingDate)}
              </dd>
            </div>
          </dl>

          <p className="border-t border-line pt-4 text-sm leading-relaxed text-ink-muted">
            {statusMessage(reservation.status)}
          </p>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4 text-xs">
            {connectionError ? (
              <span className="text-warning">
                Koneksi terputus. Data terakhir ditampilkan.
              </span>
            ) : isLive ? (
              <span className="inline-flex items-center gap-1.5 text-ink-muted">
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 rounded-full bg-success"
                />
              </span>
            ) : (
              <span className="text-ink-muted">Status final</span>
            )}

            <div className="flex items-center gap-3">
              {connectionError ? (
                <button
                  type="button"
                  onClick={onRefresh}
                  className="font-semibold text-warning underline underline-offset-2"
                >
                  Coba lagi
                </button>
              ) : null}
              <button
                type="button"
                onClick={onOpenForm}
                className="font-medium text-ink-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
              >
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
      return "Reservasi tercatat.";
    case "WAITING":
      return "Menunggu dipanggil.";
    case "CALLED":
      return "Silakan menuju meja layanan.";
    case "IN_SERVICE":
      return "Sedang dilayani.";
    case "COMPLETED":
      return "Layanan selesai.";
    case "CANCELLED":
      return "Reservasi dibatalkan.";
    case "NO_SHOW":
      return "Reservasi ditandai tidak hadir.";
    default:
      return "Status reservasi tidak dikenal.";
  }
}
