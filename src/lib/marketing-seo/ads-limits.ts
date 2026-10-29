export const ADS_LIMITS = {
  headline: 30,
  description: 90,
  callout: 25,
  sitelinkTitle: 25,
  sitelinkDescription: 35,
  snippet: 25,
  rsaHeadlinesMin: 3,
  rsaHeadlinesMax: 15,
  rsaDescriptionsMin: 2,
  rsaDescriptionsMax: 4,
} as const;

/** Google Ads counts most Latin characters as 1; wide/double-width characters as 2. */
export function adsCharacterCount(text: string) {
  let count = 0;
  for (const char of Array.from(text || '')) {
    const code = char.codePointAt(0) || 0;
    count += code > 255 ? 2 : 1;
  }
  return count;
}

export function adsLimitFor(type: string) {
  if (type === 'headline' || type === 'sitelink') return ADS_LIMITS.headline;
  if (type === 'description') return ADS_LIMITS.description;
  if (type === 'callout' || type === 'snippet') return ADS_LIMITS.callout;
  return 90;
}

export function adsTextValid(type: string, text: string) {
  const value = String(text || '').trim();
  if (!value) return { ok: false, count: 0, limit: adsLimitFor(type), message: 'Text is required.' };
  const count = adsCharacterCount(value);
  const limit = adsLimitFor(type);
  if (count > limit) return { ok: false, count, limit, message: `${count}/${limit} characters. Shorten this ${type}.` };
  return { ok: true, count, limit, message: `${count}/${limit}` };
}

export function validateCampaignDraft(draft: { name?: unknown; landing_page?: unknown; headline_ids?: unknown; description_ids?: unknown }) {
  const warnings: string[] = [];
  const headlines = Array.isArray(draft.headline_ids) ? draft.headline_ids : [];
  const descriptions = Array.isArray(draft.description_ids) ? draft.description_ids : [];
  if (headlines.length < ADS_LIMITS.rsaHeadlinesMin) warnings.push(`Add at least ${ADS_LIMITS.rsaHeadlinesMin} headlines.`);
  if (headlines.length > ADS_LIMITS.rsaHeadlinesMax) warnings.push(`Use at most ${ADS_LIMITS.rsaHeadlinesMax} headlines.`);
  if (descriptions.length < ADS_LIMITS.rsaDescriptionsMin) warnings.push(`Add at least ${ADS_LIMITS.rsaDescriptionsMin} descriptions.`);
  if (descriptions.length > ADS_LIMITS.rsaDescriptionsMax) warnings.push(`Use at most ${ADS_LIMITS.rsaDescriptionsMax} descriptions.`);
  if (!draft.landing_page) warnings.push('Set a landing page.');
  if (!draft.name) warnings.push('Set a campaign name.');
  return warnings;
}
