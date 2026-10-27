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
import type { ServiceDivision } from '@/lib/service-packages-data';
import { serviceDivisions } from '@/lib/service-packages-data';
import {
  blankServiceDivision,
  extraSlugsFromContent,
  mergeServiceDivision,
  serviceHeroKey,
} from './service-catalog';

const CMS_TTL_MS = 60_000;

type CmsBundle = {
  branding: SiteBranding;
  seo: SiteSeo;
  content: Record<string, Record<string, unknown>>;
  enabled: Record<string, boolean>;
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
    supabase.from('cms_content').select('entry_key, content, is_enabled'),
  ]);

  const content: Record<string, Record<string, unknown>> = {};
  const enabled: Record<string, boolean> = {};
  contentRes.data?.forEach((row) => {
    content[row.entry_key] = row.content as Record<string, unknown>;
    enabled[row.entry_key] = row.is_enabled !== false;
  });

  if (contentRes.error && /is_enabled/i.test(contentRes.error.message)) {
    const fallback = await supabase.from('cms_content').select('entry_key, content');
    fallback.data?.forEach((row) => {
      content[row.entry_key] = row.content as Record<string, unknown>;
      enabled[row.entry_key] = true;
    });
  }

  return {
    branding: brandingRes.data ? normalizeSiteBranding(brandingRes.data as Partial<SiteBranding>) : defaultBranding,
    seo: normalizeSiteSeo(seoRes.data as Partial<SiteSeo> | null),
    content,
    enabled,
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

export const isCmsSectionEnabled = cache(async (key: string): Promise<boolean> => {
  try {
    const map = (await loadCmsBundle()).enabled;
    if (!(key in map)) return true;
    return map[key] !== false;
  } catch {
    return true;
  }
});

export async function getCmsSection(key: string) {
  const [content, enabled] = await Promise.all([getCmsContent(key), isCmsSectionEnabled(key)]);
  return { content, enabled };
}

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

export const getServiceCatalog = cache(async (): Promise<ServiceDivision[]> => {
  try {
    const bundle = await loadCmsBundle();
    const merged: Record<string, Record<string, unknown>> = {};
    for (const key of new Set([...Object.keys(getDefaultContentMap()), ...Object.keys(bundle.content)])) {
      if (!key.startsWith('service.')) continue;
      merged[key] = mergeCmsContent(key, bundle.content[key]);
    }

    const catalog = serviceDivisions.map((division) => mergeServiceDivision(division, merged));
    const extraSlugs = new Set(extraSlugsFromContent(bundle.content));

    try {
      const supabase = createAdminClient();
      const pages = await supabase.from('cms_pages').select('id,label,route,description,is_enabled');
      for (const row of pages.data || []) {
        if (row.is_enabled === false) continue;
        const route = String(row.route || '');
        if (!route.startsWith('/services/') && row.description !== 'service') continue;
        const slug = route.startsWith('/services/') ? route.replace('/services/', '').split('/')[0] : row.id;
        if (!slug || catalog.some((item) => item.slug === slug)) continue;
        extraSlugs.add(slug);
        if (!merged[serviceHeroKey(slug)]) {
          merged[serviceHeroKey(slug)] = mergeCmsContent(serviceHeroKey(slug), { title: row.label, eyebrow: row.label });
        }
      }
    } catch {
      /* cms_pages may be missing */
    }

    for (const slug of extraSlugs) {
      if (catalog.some((item) => item.slug === slug)) continue;
      const name = String(merged[serviceHeroKey(slug)]?.title || slug.replace(/-/g, ' '));
      catalog.push(mergeServiceDivision(blankServiceDivision(slug, name), merged));
    }

    return catalog.filter((item) => bundle.enabled[serviceHeroKey(item.slug)] !== false);
  } catch {
    return serviceDivisions;
  }
});

export { defaultBranding, defaultSeo, defaultCmsEntries, getDefaultContent };
