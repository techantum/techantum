/**
 * Partner portal service catalog — sourced from the public website package data
 * (src/lib/service-packages-data.ts). No separate CMS required for package display.
 */

import {
  serviceDivisions,
  type ServiceDivision,
  type ServicePlan,
} from '@/lib/service-packages-data';

export interface PartnerCatalogPackage {
  id: string;
  category_id: string;
  slug: string;
  name: string;
  tagline: string | null;
  best_for: string | null;
  description: string | null;
  display_order: number;
  is_active: boolean;
  is_highlighted: boolean;
  scope: string | null;
  includes: string[];
  partner_package_features: {
    id: string;
    package_id: string;
    feature_key: string;
    feature_label: string;
    value: string;
    display_order: number;
  }[];
}

export interface PartnerCatalogCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  packagesHeadline: string;
  display_order: number;
  is_active: boolean;
  partner_packages: PartnerCatalogPackage[];
}

export interface PartnerComparisonMatrix {
  divisionSlug: string;
  packages: PartnerCatalogPackage[];
  rows: {
    feature_key: string;
    feature_label: string;
    values: Record<string, string>;
  }[];
}

function slugifyFeature(feature: string): string {
  return feature
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function planToPackage(
  division: ServiceDivision,
  plan: ServicePlan,
  index: number
): PartnerCatalogPackage {
  const packageId = `${division.slug}:${plan.slug}`;
  const features = plan.includes ?? plan.features ?? [];

  return {
    id: packageId,
    category_id: division.slug,
    slug: plan.slug,
    name: plan.name,
    tagline: plan.tagline,
    best_for: plan.bestFor,
    description: plan.description,
    display_order: index + 1,
    is_active: true,
    is_highlighted: Boolean(plan.highlighted),
    scope: plan.scope ?? null,
    includes: features,
    partner_package_features: features.map((label, i) => ({
      id: `${packageId}:${slugifyFeature(label)}`,
      package_id: packageId,
      feature_key: slugifyFeature(label),
      feature_label: label,
      value: '✓',
      display_order: i + 1,
    })),
  };
}

function divisionToCategory(division: ServiceDivision, order: number): PartnerCatalogCategory {
  return {
    id: division.slug,
    slug: division.slug,
    name: division.name,
    description: division.description,
    packagesHeadline: division.packagesHeadline,
    display_order: order + 1,
    is_active: true,
    partner_packages: division.plans.map((plan, i) => planToPackage(division, plan, i)),
  };
}

export function getPartnerServiceCatalog(): PartnerCatalogCategory[] {
  return serviceDivisions.map(divisionToCategory);
}

export function getPartnerComparisonMatrix(divisionSlug: string): PartnerComparisonMatrix {
  const division = serviceDivisions.find((d) => d.slug === divisionSlug);
  if (!division) {
    return { divisionSlug, packages: [], rows: [] };
  }

  const packages = division.plans.map((plan, i) => planToPackage(division, plan, i));

  const rows = division.comparisonRows.map((row) => ({
    feature_key: slugifyFeature(row.feature),
    feature_label: row.feature,
    values: row.values,
  }));

  return { divisionSlug, packages, rows };
}

export function getPartnerPackage(divisionSlug: string, planSlug: string): PartnerCatalogPackage | undefined {
  const matrix = getPartnerComparisonMatrix(divisionSlug);
  return matrix.packages.find((p) => p.slug === planSlug);
}

export function parsePartnerPackageId(packageId: string): { divisionSlug: string; planSlug: string } | null {
  const [divisionSlug, planSlug] = packageId.split(':');
  if (!divisionSlug || !planSlug) return null;
  return { divisionSlug, planSlug };
}

/** Map website division slug → questionnaire / DB service type */
export const DIVISION_TO_QUESTION_SERVICE: Record<string, string> = {
  'website-development': 'website',
  'web-application-development': 'web-application',
  'mobile-application-development': 'mobile-application',
};

export function getQuestionServiceType(divisionSlug: string, engagementType?: string | null): string {
  if (engagementType) return engagementType;
  return DIVISION_TO_QUESTION_SERVICE[divisionSlug] ?? divisionSlug;
}

/** Optional client requirement engagement types (separate from package division) */
export const ENGAGEMENT_TYPES = [
  {
    slug: 'landing-page',
    name: 'Marketing Landing Pages',
    description: 'Campaign-focused landing pages to capture leads and drive conversions.',
    icon: 'RocketLaunchIcon',
  },
  {
    slug: 'website-revamp',
    name: 'Website Revamp',
    description: 'Redesign and modernize an existing website — improve UX, performance, and conversions.',
    icon: 'GlobeAltIcon',
  },
  {
    slug: 'app-changes',
    name: 'Existing Application Changes',
    description: 'Enhancements, fixes, and new features for an existing web or mobile application.',
    icon: 'WrenchScrewdriverIcon',
  },
] as const;

export type EngagementTypeSlug = (typeof ENGAGEMENT_TYPES)[number]['slug'];

export const DIVISION_ICONS: Record<string, string> = {
  'website-development': 'GlobeAltIcon',
  'web-application-development': 'ComputerDesktopIcon',
  'mobile-application-development': 'DevicePhoneMobileIcon',
};

const COMPARISON_FEATURE_TO_MODULE: Record<string, string> = {
  'Blog Management': 'Blog',
  'CRM Integration': 'CRM',
  'Analytics Integration': 'Analytics',
  'Contact Forms': 'Forms',
};

/** Suggest wizard modules from website comparison table for selected plan */
export function getSuggestedModulesFromPlan(divisionSlug: string, planSlug: string): string[] {
  const matrix = getPartnerComparisonMatrix(divisionSlug);
  const suggested: string[] = [];

  for (const row of matrix.rows) {
    const val = row.values[planSlug];
    if (val && val !== '—' && val !== 'No') {
      const mod = COMPARISON_FEATURE_TO_MODULE[row.feature_label];
      if (mod) suggested.push(mod);
    }
  }

  if (divisionSlug === 'website-development') {
    suggested.push('CMS', 'Forms', 'Analytics');
  }
  if (divisionSlug === 'web-application-development') {
    suggested.push('Admin Panel', 'API Integration');
  }
  if (divisionSlug === 'mobile-application-development') {
    suggested.push('Analytics', 'Payments');
  }

  return [...new Set(suggested)];
}
