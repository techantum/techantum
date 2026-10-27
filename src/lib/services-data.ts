import { getDivisionPath, serviceDivisions } from './service-packages-data';

export interface ServiceCategory {
  id: string;
  name: string;
  description: string;
  href: string;
  icon: string;
  iconClass: string;
  bgClass: string;
}

export const serviceCategories: ServiceCategory[] = serviceDivisions.map((division) => ({
  id: division.slug,
  name: division.shortName,
  description: `${division.plans.length} packages — ${division.plans.map((p) => p.name).join(', ')}`,
  href: getDivisionPath(division.slug),
  icon: division.icon,
  iconClass: division.iconClass,
  bgClass: `${division.bgClass} group-hover:opacity-90`,
}));

export const defaultServicesPageContent = {
  exploreTitle: 'Explore Our Services',
  title: 'Explore Our Services',
  description: 'Discover how Techantum Solutions can help you transform ideas into powerful digital experiences.',
  cta: 'Get Started',
  ctaHref: '/contact',
  categories: serviceCategories.map((category, index) => ({
    ...category,
    offerings: String(serviceDivisions[index]?.plans.length || 0),
    published: true,
  })),
};
