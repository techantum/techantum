import type { ServiceDivision, ServicePlan } from '@/lib/service-packages-data';
import { serviceDivisions } from '@/lib/service-packages-data';

export const SERVICE_OVERVIEW_DEFAULT =
  'We focus on business outcomes — not just technology. Every package is designed to deliver measurable results for your industry.';

export function serviceHeroKey(slug: string) {
  return `service.${slug}.hero`;
}

export function serviceOverviewKey(slug: string) {
  return `service.${slug}.overview`;
}

export function servicePackagesKey(slug: string) {
  return `service.${slug}.packages`;
}

export function serviceSectionKeys(slug: string) {
  return [
    { entryKey: serviceHeroKey(slug), label: 'Hero' },
    { entryKey: serviceOverviewKey(slug), label: 'Overview' },
    { entryKey: servicePackagesKey(slug), label: 'Packages' },
  ];
}

export function isServiceContentKey(key: string) {
  return /^service\.[^.]+\.(hero|overview|packages)$/.test(key);
}

export function slugFromServiceKey(key: string) {
  const match = key.match(/^service\.([^.]+)\./);
  return match?.[1] || '';
}

function asStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === 'string') {
    return value
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function asPlans(value: unknown, fallback: ServicePlan[]): ServicePlan[] {
  if (!Array.isArray(value) || value.length === 0) return fallback;
  return value.map((raw, index) => {
    const row = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const base = fallback[index] || fallback[0];
    const includes = asStringList(row.includes).length ? asStringList(row.includes) : base?.includes;
    return {
      slug: String(row.slug || base?.slug || `plan-${index + 1}`),
      name: String(row.name || base?.name || `Plan ${index + 1}`),
      tagline: String(row.tagline || base?.tagline || ''),
      bestFor: String(row.bestFor || base?.bestFor || ''),
      description: String(row.description || base?.description || ''),
      scope: row.scope != null ? String(row.scope) : base?.scope,
      includes,
      highlighted: Boolean(row.highlighted ?? base?.highlighted),
      image: String(row.image || base?.image || ''),
      imageAlt: String(row.imageAlt || base?.imageAlt || ''),
    };
  });
}

export function heroFromDivision(division: ServiceDivision) {
  return {
    eyebrow: division.eyebrow,
    title: division.title,
    description: division.description,
  };
}

export function overviewFromDivision(division: ServiceDivision) {
  return {
    name: division.name,
    shortName: division.shortName,
    marketingMessage: division.marketingMessage,
    overview: division.overview || SERVICE_OVERVIEW_DEFAULT,
    icon: division.icon,
    iconClass: division.iconClass,
    bgClass: division.bgClass,
    image: division.image,
    imageAlt: division.imageAlt,
    benefits: division.benefits,
    targetAudience: division.targetAudience,
  };
}

export function packagesFromDivision(division: ServiceDivision) {
  return {
    packagesEyebrow: division.packagesEyebrow || 'Service Packages',
    packagesTitle: division.packagesTitle || 'Launch → Growth → Enterprise',
    packagesDescription:
      division.packagesDescription ||
      'Choose the package that matches your business maturity. Each plan includes a clear scope and path to upgrade as you grow.',
    plans: division.plans.map((plan) => ({
      ...plan,
      includes: plan.includes || plan.features || plan.solutions || [],
    })),
  };
}

export function blankServiceDivision(slug: string, name: string): ServiceDivision {
  return {
    slug,
    name,
    shortName: name,
    eyebrow: name,
    title: name,
    description: '',
    marketingMessage: name,
    overview: SERVICE_OVERVIEW_DEFAULT,
    targetAudience: [],
    benefits: [],
    icon: 'CubeIcon',
    iconClass: 'text-primary',
    bgClass: 'bg-primary/10',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f',
    imageAlt: name,
    packagesEyebrow: 'Service Packages',
    packagesTitle: 'Packages',
    packagesDescription: 'Choose the package that matches your needs.',
    plans: [],
  };
}

export function mergeServiceDivision(
  base: ServiceDivision,
  content: Record<string, Record<string, unknown>>,
): ServiceDivision {
  const hero = content[serviceHeroKey(base.slug)] || {};
  const overview = content[serviceOverviewKey(base.slug)] || {};
  const packages = content[servicePackagesKey(base.slug)] || {};

  return {
    ...base,
    eyebrow: String(hero.eyebrow || base.eyebrow),
    title: String(hero.title || base.title),
    description: String(hero.description || base.description),
    name: String(overview.name || base.name),
    shortName: String(overview.shortName || base.shortName),
    marketingMessage: String(overview.marketingMessage || base.marketingMessage),
    overview: String(overview.overview || base.overview || SERVICE_OVERVIEW_DEFAULT),
    icon: String(overview.icon || base.icon),
    iconClass: String(overview.iconClass || base.iconClass),
    bgClass: String(overview.bgClass || base.bgClass),
    image: String(overview.image || base.image),
    imageAlt: String(overview.imageAlt || base.imageAlt),
    benefits: asStringList(overview.benefits).length ? asStringList(overview.benefits) : base.benefits,
    targetAudience: asStringList(overview.targetAudience).length
      ? asStringList(overview.targetAudience)
      : base.targetAudience,
    packagesEyebrow: String(packages.packagesEyebrow || base.packagesEyebrow || 'Service Packages'),
    packagesTitle: String(packages.packagesTitle || base.packagesTitle || 'Launch → Growth → Enterprise'),
    packagesDescription: String(packages.packagesDescription || base.packagesDescription || ''),
    plans: asPlans(packages.plans, base.plans),
  };
}

export function builtInServiceDefaults() {
  return serviceDivisions;
}

export function extraSlugsFromContent(content: Record<string, Record<string, unknown>>) {
  const slugs = new Set<string>();
  for (const key of Object.keys(content)) {
    const slug = slugFromServiceKey(key);
    if (slug && !serviceDivisions.some((item) => item.slug === slug)) slugs.add(slug);
  }
  return [...slugs];
}
