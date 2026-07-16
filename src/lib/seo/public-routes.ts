import { allDivisionSlugs, allPlanPaths } from '@/lib/service-packages-data';

export const STATIC_PUBLIC_ROUTES = [
  '/',
  '/services',
  '/portfolio',
  '/about',
  '/contact',
  '/thank-you',
  '/blog',
  '/testimonials',
  '/privacy-policy',
  '/terms-of-service',
] as const;

export function getServiceRoutes(): string[] {
  const divisions = allDivisionSlugs.map((slug) => `/services/${slug}`);
  const plans = allPlanPaths.map(({ division, plan }) => `/services/${division}/${plan}`);
  return [...divisions, ...plans];
}

export function getAllStaticPublicRoutes(): string[] {
  return [...STATIC_PUBLIC_ROUTES, ...getServiceRoutes()];
}

export interface SitemapEntry {
  path: string;
  changeFrequency: 'daily' | 'weekly' | 'monthly';
  priority: number;
}

export function buildSitemapEntries(extraPaths: string[] = []): SitemapEntry[] {
  const serviceRoutes = new Set(getServiceRoutes());
  const allPaths = new Set([...getAllStaticPublicRoutes(), ...extraPaths]);

  return [...allPaths].map((path) => {
    const route = path === '/' ? '' : path;
    return {
      path: route,
      changeFrequency:
        route === ''
          ? 'daily'
          : route === '/blog'
            ? 'weekly'
            : serviceRoutes.has(path) || path.startsWith('/services')
              ? 'weekly'
              : 'monthly',
      priority:
        route === ''
          ? 1.0
          : route === '/services'
            ? 0.9
            : path.split('/').filter(Boolean).length > 2
              ? 0.85
              : 0.8,
    };
  });
}
