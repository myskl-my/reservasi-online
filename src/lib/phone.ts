export function normalizePhone(value: string): string | null {
  const cleaned = value.trim().replace(/[\s\-().]/g, "");

  if (/^08\d{7,12}$/.test(cleaned)) return `+62${cleaned.slice(1)}`;
  if (/^628\d{7,12}$/.test(cleaned)) return `+${cleaned}`;
  if (/^8\d{7,12}$/.test(cleaned)) return `+62${cleaned}`;
  if (/^\+[1-9]\d{7,14}$/.test(cleaned)) return cleaned;

  return null;
}
