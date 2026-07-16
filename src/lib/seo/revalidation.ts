import { revalidatePath } from 'next/cache';
import { getAllStaticPublicRoutes } from '@/lib/seo/public-routes';
import { CMS_SITE_PAGES } from '@/lib/cms/site-pages';

/**
 * ISR revalidation interval (seconds) for public marketing pages.
 * Use the literal `300` in `export const revalidate` — Next.js requires a static value.
 */
export const MARKETING_REVALIDATE = 300;

/** Map a CMS entry_key prefix (e.g. homepage.hero) → public route(s) to revalidate. */
function routesForCmsKey(entryKey: string): string[] {
  const page = CMS_SITE_PAGES.find((p) =>
    p.sections.some((s) => s.entryKey === entryKey)
  );
  if (page?.route && page.route !== '/404-preview') {
    return [page.route];
  }

  const group = entryKey.split('.')[0];
  const byGroup: Record<string, string[]> = {
    homepage: ['/'],
    services: ['/services'],
    portfolio: ['/portfolio'],
    testimonials: ['/testimonials'],
    about: ['/about'],
    contact: ['/contact'],
    blog: ['/blog'],
  };
  return byGroup[group] ?? [];
}

/** Bust ISR caches for specific public paths (and shared layout). */
export function revalidatePublicPaths(paths: string[]) {
  const unique = [...new Set(paths.filter(Boolean))];
  for (const path of unique) {
    revalidatePath(path);
  }
  // Layout (header/footer branding & SEO) is shared across marketing pages.
  revalidatePath('/', 'layout');
  revalidatePath('/sitemap.xml');
  revalidatePath('/robots.txt');
}

/** After a CMS content save — revalidate only the affected page(s). */
export function revalidateAfterCmsUpdate(entryKey: string) {
  revalidatePublicPaths(routesForCmsKey(entryKey));
}

/** After branding / global SEO changes — refresh the whole marketing site. */
export function revalidateAllMarketingPages() {
  revalidatePublicPaths(getAllStaticPublicRoutes());
}
