import type { SiteSeo } from '@/lib/cms/types';

export interface MarketingTagIds {
  gtmId: string;
  ga4Id: string;
  facebookPixelId: string;
  linkedinPartnerId: string;
}

/** Sanitized tag IDs safe to inject into script templates. */
export function getMarketingTagIds(seo: SiteSeo): MarketingTagIds {
  return {
    gtmId: sanitizeTagId(seo.gtm_id),
    ga4Id: sanitizeTagId(seo.ga4_id),
    facebookPixelId: sanitizeTagId(seo.facebook_pixel_id),
    linkedinPartnerId: sanitizeTagId(seo.linkedin_partner_id),
  };
}

export function hasActiveMarketingTracking(seo: SiteSeo): boolean {
  const { gtmId, ga4Id } = getMarketingTagIds(seo);
  return Boolean(gtmId || ga4Id);
}

export function getSocialSameAsUrls(seo: SiteSeo): string[] {
  return [
    seo.facebook_url,
    seo.instagram_url,
    seo.linkedin_url,
    seo.youtube_url,
    seo.twitter_url,
  ].filter((url): url is string => Boolean(url?.trim()));
}

export function sanitizeTagId(value?: string | null): string {
  if (!value?.trim()) return '';
  const cleaned = value.trim();
  if (!/^[A-Za-z0-9_-]+$/.test(cleaned)) return '';
  return cleaned;
}

/** Normalize admin input — trims whitespace and extracts IDs from pasted snippets. */
export function normalizeMarketingTagId(
  value?: string | null,
  kind: 'any' | 'gtm' | 'ga4' | 'numeric' = 'any',
): string {
  if (!value?.trim()) return '';
  const trimmed = value.trim();
  if (/^[A-Za-z0-9_-]+$/.test(trimmed)) return trimmed;

  if (kind === 'gtm' || kind === 'any') {
    const gtmMatch = trimmed.match(/GTM-[A-Z0-9]+/i);
    if (gtmMatch) return gtmMatch[0].toUpperCase();
  }

  if (kind === 'ga4' || kind === 'any') {
    const gaMatch = trimmed.match(/G-[A-Z0-9]+/i);
    if (gaMatch) return gaMatch[0].toUpperCase();
  }

  if (kind === 'numeric' || kind === 'any') {
    const numericMatch = trimmed.match(/\b(\d{5,20})\b/);
    if (numericMatch) return numericMatch[1];
  }

  return '';
}
