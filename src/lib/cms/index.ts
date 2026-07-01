import { cache } from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  defaultBranding,
  defaultCmsEntries,
  defaultSeo,
  getDefaultContent,
  getDefaultContentMap,
  mergeCmsContent,
} from './default-content';
import type { CmsSnapshot, SiteBranding, SiteSeo } from './types';

export const getBranding = cache(async (): Promise<SiteBranding> => {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase.from('site_branding').select('*').eq('id', 1).maybeSingle();
    if (data) return { ...defaultBranding, ...data } as SiteBranding;
  } catch {
    /* fall through to defaults */
  }
  return defaultBranding;
});

export const getSeo = cache(async (): Promise<SiteSeo> => {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase.from('site_seo').select('*').eq('id', 1).maybeSingle();
    if (data) return data as SiteSeo;
  } catch {
    /* fall through to defaults */
  }
  return defaultSeo;
});

export const getCmsContent = cache(async (key: string): Promise<Record<string, unknown>> => {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from('cms_content')
      .select('content')
      .eq('entry_key', key)
      .maybeSingle();
    if (data?.content) {
      return mergeCmsContent(key, data.content as Record<string, unknown>);
    }
  } catch {
    /* fall through to defaults */
  }
  return getDefaultContent(key);
});

export const getCmsSnapshot = cache(async (): Promise<CmsSnapshot> => {
  try {
    const supabase = createAdminClient();
    const [brandingRes, seoRes, contentRes] = await Promise.all([
      supabase.from('site_branding').select('*').eq('id', 1).maybeSingle(),
      supabase.from('site_seo').select('*').eq('id', 1).maybeSingle(),
      supabase.from('cms_content').select('entry_key, content'),
    ]);

    const content: Record<string, Record<string, unknown>> = getDefaultContentMap();
    contentRes.data?.forEach((row) => {
      content[row.entry_key] = row.content as Record<string, unknown>;
    });

    return {
      branding: (brandingRes.data as SiteBranding) || defaultBranding,
      seo: (seoRes.data as SiteSeo) || defaultSeo,
      content,
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

  return { seeded: true, entries: defaultCmsEntries.length };
}

export { defaultBranding, defaultSeo, defaultCmsEntries, getDefaultContent };
