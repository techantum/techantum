import { cache } from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSeo } from '@/lib/cms';
import { buildSitemapEntries, getAllStaticPublicRoutes } from '@/lib/seo/public-routes';

export { buildSitemapEntries, getAllStaticPublicRoutes, STATIC_PUBLIC_ROUTES } from '@/lib/seo/public-routes';

const HARDCODED_NOINDEX_PATHS = new Set(['/thank-you']);

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

  return getAllStaticPublicRoutes().filter(
    (path) => !noindexPaths.has(path) && !HARDCODED_NOINDEX_PATHS.has(path)
  );
});

export const getIndexedPagePaths = cache(async (): Promise<string[]> => {
  return getSitemapPaths();
});

export async function getDynamicSitemapEntries() {
  const paths = await getSitemapPaths();
  return buildSitemapEntries(paths);
}
