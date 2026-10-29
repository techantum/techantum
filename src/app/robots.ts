import { MetadataRoute } from 'next';
import { getSeo } from '@/lib/cms';
import { resolveSiteUrl } from '@/lib/cms/url';

export const revalidate = 300;

export default async function robots(): Promise<MetadataRoute.Robots> {
  const seo = await getSeo();
  const baseUrl = resolveSiteUrl(seo.site_url).replace(/\/$/, '');
  const allowIndexing = seo.index_site !== false;
  const extra = parseRobotDirectives(seo.robots_extra);

  return {
    rules: allowIndexing
      ? [
          {
            userAgent: '*',
            allow: extra.allow.length ? ['/', ...extra.allow] : '/',
            disallow: ['/api/', '/admin/', '/login', '/signup', '/thank-you', ...extra.disallow],
          },
          { userAgent: 'Googlebot', allow: '/', crawlDelay: 0 },
        ]
      : [{ userAgent: '*', disallow: '/' }],
    ...(seo.sitemap_enabled === false ? {} : { sitemap: `${baseUrl}/sitemap.xml` }),
    host: baseUrl.replace(/^https?:\/\//, ''),
  };
}

function parseRobotDirectives(text?: string) {
  const allow: string[] = [];
  const disallow: string[] = [];
  for (const raw of (text || '').split('\n')) {
    const line = raw.replace(/#.*$/, '').trim();
    const disallowMatch = line.match(/^disallow:\s*(\S+)/i);
    const allowMatch = line.match(/^allow:\s*(\S+)/i);
    if (disallowMatch) disallow.push(disallowMatch[1]);
    if (allowMatch) allow.push(allowMatch[1]);
  }
  return { allow, disallow };
}
