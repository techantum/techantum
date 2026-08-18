import type { LeadPriority } from './types';

/** No website = highest priority website prospect for Techantum sales. */
export function computeLeadPriority(input: {
  website_uri: string | null;
  rating: number | null;
}): LeadPriority {
  const hasWebsite = Boolean(input.website_uri?.trim());
  if (!hasWebsite) return 'high';
  if (input.rating != null && input.rating < 3.5) return 'medium';
  return 'normal';
}

export const PRIORITY_LABELS: Record<LeadPriority, string> = {
  high: 'High — No website',
  medium: 'Medium — Low rating',
  normal: 'Normal',
};
