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
  name: division.name,
  description: division.marketingMessage,
  href: getDivisionPath(division.slug),
  icon: division.icon,
  iconClass: division.iconClass,
  bgClass: `${division.bgClass} group-hover:opacity-90`,
}));

export const defaultServicesPageContent = {
  exploreTitle: 'Our Construction Services',
  categories: serviceCategories,
};
