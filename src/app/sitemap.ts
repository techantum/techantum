import { MetadataRoute } from 'next';
import { getSeo } from '@/lib/cms';
import { resolveSiteUrl } from '@/lib/cms/url';
import { buildSitemapEntries, getIndexedPagePaths } from '@/lib/seo/routes';

export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [seo, extraPaths] = await Promise.all([getSeo(), getIndexedPagePaths()]);
  const baseUrl = resolveSiteUrl(seo.site_url).replace(/\/$/, '');
  const entries = buildSitemapEntries(extraPaths);

  return entries.map((entry) => ({
    url: `${baseUrl}${entry.path === '' ? '' : entry.path}`,
    lastModified: new Date(),
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));
}
