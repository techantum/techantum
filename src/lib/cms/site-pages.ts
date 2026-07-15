import { defaultCmsEntries } from './default-content';
import { contentSchemas } from './content-schemas';
import {
  allDivisionSlugs,
  allPlanPaths,
  getDivision,
  getPlan,
} from '@/lib/service-packages-data';

export interface AdminSiteSection {
  entryKey: string;
  label: string;
  hasMedia?: boolean;
}

export interface AdminSitePage {
  id: string;
  label: string;
  route: string;
  description: string;
  sections: AdminSiteSection[];
  editable: boolean;
  /** Shown when content is managed outside CMS */
  managedIn?: 'code';
}

function sectionHasMedia(entryKey: string): boolean {
  const schema = contentSchemas[entryKey];
  if (!schema) return false;
  const fieldTypes = (schema.fields ?? []).map((f) => f.type);
  const arrayTypes = (schema.arrays ?? []).flatMap((a) => a.fields.map((f) => f.type));
  return [...fieldTypes, ...arrayTypes].some((t) => t === 'image' || t === 'video');
}

function sectionsFromKeys(keys: string[]): AdminSiteSection[] {
  return keys.map((entryKey) => {
    const meta = defaultCmsEntries.find((e) => e.entry_key === entryKey);
    return {
      entryKey,
      label: meta?.label ?? entryKey,
      hasMedia: sectionHasMedia(entryKey),
    };
  });
}

/** CMS-editable pages aligned with the public site structure. */
export const CMS_SITE_PAGES: AdminSitePage[] = [
  {
    id: 'homepage',
    label: 'Homepage',
    route: '/',
    description: 'Hero, stats, services, tech stack, testimonials, FAQ, and CTA.',
    sections: sectionsFromKeys([
      'homepage.hero',
      'homepage.stats',
      'homepage.services',
      'homepage.tech_stack',
      'homepage.testimonials',
      'homepage.faq',
      'homepage.cta',
    ]),
    editable: true,
  },
  {
    id: 'services',
    label: 'Services',
    route: '/services',
    description: 'Main services landing page hero and overview.',
    sections: sectionsFromKeys(['services.hero', 'services.page']),
    editable: true,
  },
  {
    id: 'portfolio',
    label: 'Portfolio',
    route: '/portfolio',
    description: 'Industries, featured projects, and portfolio CTA.',
    sections: sectionsFromKeys(['portfolio.hero', 'portfolio.data', 'portfolio.cta']),
    editable: true,
  },
  {
    id: 'testimonials',
    label: 'Testimonials',
    route: '/testimonials',
    description: 'Full testimonials page content and hero.',
    sections: sectionsFromKeys(['testimonials.hero', 'testimonials.page']),
    editable: true,
  },
  {
    id: 'about',
    label: 'About',
    route: '/about',
    description: 'Mission, timeline, values, regions, and certifications.',
    sections: sectionsFromKeys(['about.hero', 'about.page']),
    editable: true,
  },
  {
    id: 'contact',
    label: 'Contact',
    route: '/contact',
    description: 'Contact hero, form labels, sidebar info, and business hours.',
    sections: sectionsFromKeys(['contact.hero', 'contact.page']),
    editable: true,
  },
  {
    id: 'blog',
    label: 'Blog',
    route: '/blog',
    description: 'Blog hero and article listings.',
    sections: sectionsFromKeys(['blog.hero', 'blog.posts']),
    editable: true,
  },
  {
    id: 'site',
    label: '404 Page',
    route: '/404-preview',
    description: 'Not-found page copy and actions.',
    sections: sectionsFromKeys(['site.not_found']),
    editable: true,
  },
];

/** Service division and plan pages — content lives in code for now. */
export function getStaticServicePages(): AdminSitePage[] {
  const divisions: AdminSitePage[] = allDivisionSlugs.map((slug) => {
    const division = getDivision(slug)!;
    return {
      id: `division-${slug}`,
      label: division.name,
      route: `/services/${slug}`,
      description: division.description,
      sections: [],
      editable: false,
      managedIn: 'code',
    };
  });

  const plans: AdminSitePage[] = allPlanPaths.map(({ division, plan }) => {
    const div = getDivision(division)!;
    const p = getPlan(division, plan)!;
    return {
      id: `plan-${division}-${plan}`,
      label: `${p.name} — ${div.shortName}`,
      route: `/services/${division}/${plan}`,
      description: p.description,
      sections: [],
      editable: false,
      managedIn: 'code',
    };
  });

  return [...divisions, ...plans];
}

export const STATIC_LEGAL_PAGES: AdminSitePage[] = [
  {
    id: 'privacy',
    label: 'Privacy Policy',
    route: '/privacy-policy',
    description: 'Legal page — edit in code or add CMS keys later.',
    sections: [],
    editable: false,
    managedIn: 'code',
  },
  {
    id: 'terms',
    label: 'Terms of Service',
    route: '/terms-of-service',
    description: 'Legal page — edit in code or add CMS keys later.',
    sections: [],
    editable: false,
    managedIn: 'code',
  },
];

export function getAllAdminSitePages(): AdminSitePage[] {
  return [...CMS_SITE_PAGES, ...getStaticServicePages(), ...STATIC_LEGAL_PAGES];
}

export function countEditablePages(): number {
  return CMS_SITE_PAGES.length + getStaticServicePages().length + STATIC_LEGAL_PAGES.length;
}

export function countEditableSections(): number {
  return CMS_SITE_PAGES.reduce((sum, page) => sum + page.sections.length, 0);
}
