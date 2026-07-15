import { cache } from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildSitemapEntries, getAllStaticPublicRoutes } from '@/lib/seo/public-routes';

export { buildSitemapEntries, getAllStaticPublicRoutes, STATIC_PUBLIC_ROUTES } from '@/lib/seo/public-routes';

export const getIndexedPagePaths = cache(async (): Promise<string[]> => {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from('page_seo')
      .select('path, index_enabled')
      .eq('index_enabled', true);
    return (data ?? []).map((row) => row.path);
  } catch {
    return [];
  }
});

export const getSitemapPaths = cache(async (): Promise<string[]> => {
  const staticRoutes = getAllStaticPublicRoutes();
  const indexedExtra = await getIndexedPagePaths();
  return [...new Set([...staticRoutes, ...indexedExtra])];
});

export async function getDynamicSitemapEntries() {
  const extra = await getIndexedPagePaths();
  return buildSitemapEntries(extra);
}
