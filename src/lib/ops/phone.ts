export function normalizeWhatsAppNumber(input: string | null | undefined): string | null {
  if (!input?.trim()) return null;
  const digits = input.replace(/[^\d]/g, '');
  if (!digits) return null;
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  if (digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  return null;
}

export function whatsappApiTo(number: string): string {
  return number.replace(/[^\d]/g, '');
}

export function isValidWhatsAppNumber(input: string | null | undefined): boolean {
  const normalized = normalizeWhatsAppNumber(input);
  if (!normalized) return false;
  const digits = whatsappApiTo(normalized);
  return digits.length >= 10 && digits.length <= 15;
}

export function isValidEmail(input: string | null | undefined): boolean {
  if (!input?.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.trim());
}

export function isValidPhone(input: string | null | undefined): boolean {
  if (!input?.trim()) return true;
  const digits = input.replace(/[^\d]/g, '');
  return digits.length >= 10 && digits.length <= 15;
}
