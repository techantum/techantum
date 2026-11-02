export function normalizePhone(raw?: string | null) {
  if (!raw) return '';
  const digits = raw.replace(/\D+/g, '');
  if (!digits) return '';
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

export function normalizeEmail(raw?: string | null) {
  return (raw || '').trim().toLowerCase();
}

export function csvEscape(value: unknown) {
  const s = String(value ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
