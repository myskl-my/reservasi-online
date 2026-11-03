const CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const CODE_PATTERN = /^CQ-[A-Z2-7]{8}$/;

export function generateBookingCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  let code = "CQ-";
  for (const byte of bytes) {
    code += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  }
  return code;
}

export function isValidBookingCode(value: string): boolean {
  return CODE_PATTERN.test(value.trim().toUpperCase());
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const visible = digits.slice(-4);
  const prefix = phone.startsWith("+62")
    ? "+62"
    : phone.startsWith("+")
      ? "+"
      : "";
  return `${prefix}••••${visible}`;
}