import { MetadataRoute } from 'next';
import { getSeo } from '@/lib/cms';
import { resolveSiteUrl } from '@/lib/cms/url';
import { buildSitemapEntries, getSitemapPaths } from '@/lib/seo/routes';
import { getAllStaticPublicRoutes } from '@/lib/seo/public-routes';
import { createAdminClient } from '@/lib/supabase/admin';

export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const [seo, paths] = await Promise.all([getSeo(), getSitemapPaths()]);
    if (seo.sitemap_enabled === false) return [];
    const baseUrl = resolveSiteUrl(seo.site_url).replace(/\/$/, '');
    const entries = buildSitemapEntries(paths);
    const dates = await lastModifiedByPath(paths);

    const seen = new Set<string>();
    return entries.flatMap((entry) => {
      const url = `${baseUrl}${entry.path === '' ? '' : entry.path}`;
      if (seen.has(url)) return [];
      seen.add(url);
      const path = entry.path === '' ? '/' : entry.path;
      return [{
        url,
        lastModified: dates.get(path) || new Date(),
        changeFrequency: entry.changeFrequency,
        priority: entry.priority,
      }];
    });
  } catch {
    const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://techantum.com').replace(/\/$/, '');
    return getAllStaticPublicRoutes()
      .filter((path) => !['/login', '/signup', '/thank-you'].includes(path))
      .map((path) => ({
        url: `${baseUrl}${path === '/' ? '' : path}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: path === '/' ? 1 : 0.8,
      }));
  }
}

async function lastModifiedByPath(paths: string[]) {
  const dates = new Map<string, Date>();
  try {
    const { data } = await createAdminClient().from('page_seo').select('path, updated_at').in('path', paths);
    for (const row of (data || []) as Array<{ path: string; updated_at?: string | null }>) {
      if (row.updated_at) dates.set(row.path, new Date(row.updated_at));
    }
  } catch {
    /* optional */
  }
  return dates;
}
