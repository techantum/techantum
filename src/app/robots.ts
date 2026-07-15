import { MetadataRoute } from 'next';
import { getSeo } from '@/lib/cms';
import { resolveSiteUrl } from '@/lib/cms/url';

export const revalidate = 300;

export default async function robots(): Promise<MetadataRoute.Robots> {
  const seo = await getSeo();
  const baseUrl = resolveSiteUrl(seo.site_url).replace(/\/$/, '');
  const allowIndexing = seo.index_site !== false;

  return {
    rules: allowIndexing
      ? [
          { userAgent: '*', allow: '/', disallow: ['/api/', '/admin/'] },
          { userAgent: 'Googlebot', allow: '/', crawlDelay: 0 },
        ]
      : [{ userAgent: '*', disallow: '/' }],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl.replace(/^https?:\/\//, ''),
  };
}
