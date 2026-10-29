import { cache } from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSeo, getServiceCatalog } from '@/lib/cms';
import { buildSitemapEntries, getAllStaticPublicRoutes } from '@/lib/seo/public-routes';

export { buildSitemapEntries, getAllStaticPublicRoutes, STATIC_PUBLIC_ROUTES } from '@/lib/seo/public-routes';

const HARDCODED_NOINDEX_PATHS = new Set(['/thank-you', '/login', '/signup']);

export const getNoindexPagePaths = cache(async (): Promise<Set<string>> => {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from('page_seo')
      .select('path, index_enabled')
      .eq('index_enabled', false);
    return new Set((data ?? []).map((row) => row.path));
  } catch {
    return new Set();
  }
});

/** Public routes that should appear in sitemap.xml (respects global + per-page noindex). */
export const getSitemapPaths = cache(async (): Promise<string[]> => {
  const [seo, noindexPaths] = await Promise.all([getSeo(), getNoindexPagePaths()]);
  if (seo.index_site === false) return [];

  const extras: string[] = [];
  try {
    const catalog = await getServiceCatalog();
    for (const division of catalog) extras.push(`/services/${division.slug}`);
  } catch {
    /* catalog extras are optional */
  }
  try {
    const supabase = createAdminClient();
    const { data } = await supabase.from('cms_pages').select('route, is_enabled');
    for (const row of data || []) {
      const route = String(row.route || '');
      if (row.is_enabled === false) continue;
      if (!route.startsWith('/') || route.startsWith('/admin') || route.startsWith('/api')) continue;
      extras.push(route.replace(/\/$/, '') || '/');
    }
  } catch {
    /* cms_pages may be missing */
  }

  return [...new Set([...getAllStaticPublicRoutes(), ...extras])].filter((path) => {
    if (noindexPaths.has(path) || HARDCODED_NOINDEX_PATHS.has(path)) return false;
    const parts = path.split('/').filter(Boolean);
    if (parts[0] === 'services' && parts.length > 2) return false;
    return true;
  });
});

export const getIndexedPagePaths = cache(async (): Promise<string[]> => {
  return getSitemapPaths();
});

export async function getDynamicSitemapEntries() {
  const paths = await getSitemapPaths();
  return buildSitemapEntries(paths);
}
