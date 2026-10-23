import { cache } from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  defaultBranding,
  defaultCmsEntries,
  defaultSeo,
  getDefaultContent,
  getDefaultContentMap,
  mergeCmsContent,
  normalizeSiteBranding,
  normalizeSiteSeo,
} from './default-content';
import type { CmsSnapshot, SiteBranding, SiteSeo } from './types';

const CMS_TTL_MS = 60_000;

type CmsBundle = {
  branding: SiteBranding;
  seo: SiteSeo;
  content: Record<string, Record<string, unknown>>;
};

const globalForCms = globalThis as typeof globalThis & {
  techantumCmsBundle?: { expires: number; value: CmsBundle };
};

export function invalidateCmsRuntimeCache() {
  globalForCms.techantumCmsBundle = undefined;
}

async function fetchCmsBundle(): Promise<CmsBundle> {
  const supabase = createAdminClient();
  const [brandingRes, seoRes, contentRes] = await Promise.all([
    supabase.from('site_branding').select('*').eq('id', 1).maybeSingle(),
    supabase.from('site_seo').select('*').eq('id', 1).maybeSingle(),
    supabase.from('cms_content').select('entry_key, content'),
  ]);

  const content: Record<string, Record<string, unknown>> = {};
  contentRes.data?.forEach((row) => {
    content[row.entry_key] = row.content as Record<string, unknown>;
  });

  return {
    branding: brandingRes.data ? normalizeSiteBranding(brandingRes.data as Partial<SiteBranding>) : defaultBranding,
    seo: normalizeSiteSeo(seoRes.data as Partial<SiteSeo> | null),
    content,
  };
}

async function loadCmsBundle(): Promise<CmsBundle> {
  const now = Date.now();
  const cached = globalForCms.techantumCmsBundle;
  if (cached && cached.expires > now) return cached.value;
  const value = await fetchCmsBundle();
  globalForCms.techantumCmsBundle = { expires: now + CMS_TTL_MS, value };
  return value;
}

export const getBranding = cache(async (): Promise<SiteBranding> => {
  try {
    return (await loadCmsBundle()).branding;
  } catch {
    return defaultBranding;
  }
});

export const getSeo = cache(async (): Promise<SiteSeo> => {
  try {
    return (await loadCmsBundle()).seo;
  } catch {
    return defaultSeo;
  }
});

export const getCmsContent = cache(async (key: string): Promise<Record<string, unknown>> => {
  try {
    const raw = (await loadCmsBundle()).content[key];
    if (raw) return mergeCmsContent(key, raw);
  } catch {
    /* fall through to defaults */
  }
  return getDefaultContent(key);
});

export const getCmsSnapshot = cache(async (): Promise<CmsSnapshot> => {
  try {
    const bundle = await loadCmsBundle();
    return {
      branding: bundle.branding,
      seo: bundle.seo,
      content: { ...getDefaultContentMap(), ...bundle.content },
    };
  } catch {
    return {
      branding: defaultBranding,
      seo: defaultSeo,
      content: getDefaultContentMap(),
    };
  }
});

export async function seedMissingCmsEntries() {
  const supabase = createAdminClient();

  const { data: brandingRow } = await supabase.from('site_branding').select('id').eq('id', 1).maybeSingle();
  if (!brandingRow) {
    await supabase.from('site_branding').insert({ id: 1, ...defaultBranding });
  }

  const { data: seoRow } = await supabase.from('site_seo').select('id').eq('id', 1).maybeSingle();
  if (!seoRow) {
    await supabase.from('site_seo').insert({ id: 1, ...defaultSeo });
  }

  const { data: existing } = await supabase.from('cms_content').select('entry_key');
  const existingKeys = new Set((existing ?? []).map((row) => row.entry_key));

  const missing = defaultCmsEntries.filter((entry) => !existingKeys.has(entry.entry_key));
  for (const entry of missing) {
    await supabase.from('cms_content').upsert({
      entry_key: entry.entry_key,
      entry_group: entry.entry_group,
      label: entry.label,
      content: entry.content,
    });
  }

  invalidateCmsRuntimeCache();
  return { seeded: missing.length, total: defaultCmsEntries.length };
}

export async function seedCmsDatabase() {
  const supabase = createAdminClient();

  await supabase.from('site_branding').upsert({ id: 1, ...defaultBranding });
  await supabase.from('site_seo').upsert({ id: 1, ...defaultSeo });

  for (const entry of defaultCmsEntries) {
    await supabase.from('cms_content').upsert({
      entry_key: entry.entry_key,
      entry_group: entry.entry_group,
      label: entry.label,
      content: entry.content,
    });
  }

  invalidateCmsRuntimeCache();
  return { seeded: true, entries: defaultCmsEntries.length };
}

export { defaultBranding, defaultSeo, defaultCmsEntries, getDefaultContent };
