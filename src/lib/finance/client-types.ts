export const CLIENT_TYPES = [
  { value: 'indian_business', label: 'Indian Business', region: 'india' },
  { value: 'indian_individual', label: 'Indian Individual', region: 'india' },
  { value: 'international_business', label: 'International Business', region: 'international' },
  { value: 'international_individual', label: 'International Individual', region: 'international' },
] as const;

export type ClientType = (typeof CLIENT_TYPES)[number]['value'];

export function clientTypeLabel(value?: string | null) {
  return CLIENT_TYPES.find((t) => t.value === value)?.label || value || '—';
}

export function isIndianClientType(value?: string | null) {
  return value === 'indian_business' || value === 'indian_individual';
}
