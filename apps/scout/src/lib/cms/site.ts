import { revalidateTag, unstable_cache } from 'next/cache';
import { q } from '@/lib/finance/db';
import {
  CMS_SECTIONS,
  DEFAULT_BRANDING,
  DEFAULT_CONTENT,
  mergeBranding,
  mergeContent,
  type RevealeoBranding,
} from './defaults';

function asObject(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

async function loadRevealeoSite() {
  try {
    const brandingRes = await q<RevealeoBranding>(undefined, 'SELECT * FROM revealeo_site_branding WHERE id = 1');
    const contentRes = await q<{ entry_key: string; content: unknown }>(
      undefined,
      'SELECT entry_key, content FROM revealeo_cms_content ORDER BY sort_order'
    );
    const stored: Record<string, Record<string, unknown>> = {};
    for (const row of contentRes.rows) stored[row.entry_key] = asObject(row.content);
    return {
      branding: mergeBranding(brandingRes.rows[0]),
      content: mergeContent(stored),
    };
  } catch (err) {
    console.error('[revealeo-cms] load failed', err);
    return { branding: DEFAULT_BRANDING, content: DEFAULT_CONTENT };
  }
}

export async function getRevealeoSite() {
  return unstable_cache(loadRevealeoSite, ['revealeo-site'], { revalidate: 60, tags: ['cms'] })();
}

export async function saveRevealeoBranding(input: RevealeoBranding) {
  const payload = mergeBranding(input);
  await q(
    undefined,
    `INSERT INTO revealeo_site_branding (
      id, company_name, tagline, logo_url, footer_logo_url, favicon_url, og_image_url,
      email, phone, phone_href, address, facebook_url, instagram_url, linkedin_url, youtube_url, twitter_url,
      footer_description, copyright_text, updated_at
    ) VALUES (1,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,NOW())
    ON CONFLICT (id) DO UPDATE SET
      company_name = EXCLUDED.company_name,
      tagline = EXCLUDED.tagline,
      logo_url = EXCLUDED.logo_url,
      footer_logo_url = EXCLUDED.footer_logo_url,
      favicon_url = EXCLUDED.favicon_url,
      og_image_url = EXCLUDED.og_image_url,
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      phone_href = EXCLUDED.phone_href,
      address = EXCLUDED.address,
      facebook_url = EXCLUDED.facebook_url,
      instagram_url = EXCLUDED.instagram_url,
      linkedin_url = EXCLUDED.linkedin_url,
      youtube_url = EXCLUDED.youtube_url,
      twitter_url = EXCLUDED.twitter_url,
      footer_description = EXCLUDED.footer_description,
      copyright_text = EXCLUDED.copyright_text,
      updated_at = NOW()`,
    [
      payload.company_name,
      payload.tagline,
      payload.logo_url || null,
      payload.footer_logo_url || null,
      payload.favicon_url || null,
      payload.og_image_url || null,
      payload.email,
      payload.phone,
      payload.phone_href,
      payload.address,
      payload.facebook_url,
      payload.instagram_url,
      payload.linkedin_url,
      payload.youtube_url,
      payload.twitter_url,
      payload.footer_description,
      payload.copyright_text,
    ]
  );
  revalidateTag('cms');
  return payload;
}

export async function saveRevealeoSection(key: string, content: Record<string, unknown>) {
  const section = CMS_SECTIONS.find((item) => item.key === key);
  if (!section) throw new Error('Unknown section');
  const merged = { ...DEFAULT_CONTENT[key], ...content };
  const sort = CMS_SECTIONS.findIndex((item) => item.key === key);
  await q(
    undefined,
    `INSERT INTO revealeo_cms_content (entry_key, label, content, sort_order, updated_at)
     VALUES ($1,$2,$3::jsonb,$4,NOW())
     ON CONFLICT (entry_key) DO UPDATE SET content = EXCLUDED.content, label = EXCLUDED.label, updated_at = NOW()`,
    [key, section.label, JSON.stringify(merged), sort]
  );
  revalidateTag('cms');
  return merged;
}

export async function attachBrandingImage(field: string, url: string) {
  if (!(field in DEFAULT_BRANDING)) throw new Error('Unknown branding field');
  const site = await getRevealeoSite();
  return saveRevealeoBranding({ ...site.branding, [field]: url });
}

export async function attachCmsImage(key: string, field: string, url: string) {
  const site = await getRevealeoSite();
  return saveRevealeoSection(key, { ...site.content[key], [field]: url });
}
