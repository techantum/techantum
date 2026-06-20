import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://techantum.com';

  const routes = [
    '',
    '/services',
    '/portfolio',
    '/about',
    '/contact',
    '/blog',
    '/testimonials',
    '/privacy-policy',
    '/terms-of-service',
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? 'daily' : route === '/blog' ? 'weekly' : route === '/services' ? 'weekly' : 'monthly',
    priority: route === '' ? 1.0 : route === '/services' ? 0.9 : 0.8,
  }));
}
