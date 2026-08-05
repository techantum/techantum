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
  exploreTitle: 'Explore Our Service Divisions',
  categories: serviceCategories,
};
