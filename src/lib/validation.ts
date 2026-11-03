import { z } from "zod";
import { isValidDateString } from "@/lib/dates";
import { normalizePhone } from "@/lib/phone";

export { normalizePhone };

export const nameSchema = z
  .string()
  .trim()
  .min(2, "Nama minimal 2 karakter.")
  .max(80, "Nama maksimal 80 karakter.");

const phoneSchema = z
  .string()
  .trim()
  .min(8, "Nomor WhatsApp tidak valid.")
  .max(25, "Nomor WhatsApp terlalu panjang.")
  .transform((value, ctx) => {
    const normalized = normalizePhone(value);
    if (!normalized) {
      ctx.addIssue({ code: "custom", message: "Nomor WhatsApp tidak valid." });
      return "";
    }
    return normalized;
  });

const optionalPhoneSchema = z
  .string()
  .trim()
  .max(25)
  .optional()
  .transform((value, ctx) => {
    if (!value) return null;
    const normalized = normalizePhone(value);
    if (!normalized) {
      ctx.addIssue({ code: "custom", message: "Nomor WhatsApp tidak valid." });
      return null;
    }
    return normalized;
  });

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Email wajib diisi.")
  .max(200, "Email terlalu panjang.")
  .refine((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), {
    message: "Format email tidak valid.",
  });

export const pinSchema = z
  .string()
  .trim()
  .regex(/^\d{6,12}$/, "PIN harus 6–12 digit angka.");

const dateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid.")
  .refine(isValidDateString, "Tanggal tidak valid.");

export const bookingSchema = z.object({
  customerName: nameSchema,
  customerPhone: phoneSchema,
  bookingDate: dateSchema,
});

export const loginSchema = z.object({
  pin: pinSchema,
});

export const setupSchema = z.object({
  setupToken: z.string().min(1, "Token setup wajib diisi."),
  name: nameSchema,
  email: emailSchema,
  pin: pinSchema,
});

export const updateSettingsSchema = z.object({
  onlineBookingEnabled: z.boolean(),
  defaultDailyQuota: z.number().int().min(1).max(500),
});

export const dateOverrideSchema = z.object({
  date: dateSchema,
  maxQuota: z.number().int().min(1).max(500).nullable(),
  isClosed: z.boolean(),
});

export const adminReservationActionSchema = z.object({
  action: z.enum(["check_in", "start", "complete", "cancel", "no_show"]),
});

export const adminWalkInActionSchema = z.object({
  action: z.enum(["start", "complete", "cancel", "no_show"]),
});

export const callNextSchema = z.object({
  kind: z.enum(["ONLINE", "WALK_IN"]),
});

export const createWalkInSchema = z.object({
  customerName: nameSchema,
  customerPhone: optionalPhoneSchema,
});

export const bookingCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^CQ-[A-Z2-7]{8}$/, "Kode booking tidak valid. Contoh: CQ-ABCDEFGH.");
