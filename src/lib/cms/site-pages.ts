import { defaultCmsEntries } from './default-content';
import { contentSchemas } from './content-schemas';
import { serviceDivisions, getDivisionPath } from '@/lib/service-packages-data';

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

/** CMS-editable pages aligned with the UI/UX design questionnaire. */
export const CMS_SITE_PAGES: AdminSitePage[] = [
  {
    id: 'homepage',
    label: 'Homepage',
    route: '/',
    description: 'Hero, stats, services, industries, testimonials, FAQ, and CTA.',
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
    id: 'about',
    label: 'About (Company Overview & USP)',
    route: '/about',
    description: 'Introduction, vision, mission, values, history, USP, and certifications.',
    sections: sectionsFromKeys(['about.hero', 'about.overview', 'about.page', 'about.usp']),
    editable: true,
  },
  {
    id: 'services',
    label: 'Services',
    route: '/services',
    description: 'Services landing page and four core construction offerings.',
    sections: sectionsFromKeys(['services.hero', 'services.page']),
    editable: true,
  },
  {
    id: 'portfolio',
    label: 'Projects & Portfolio',
    route: '/portfolio',
    description: 'Completed and ongoing projects with photos and highlights.',
    sections: sectionsFromKeys(['portfolio.hero', 'portfolio.data', 'portfolio.cta']),
    editable: true,
  },
  {
    id: 'industries',
    label: 'Industries Served',
    route: '/#industries',
    description: 'Industries KEIL primarily serves.',
    sections: sectionsFromKeys(['industries.served']),
    editable: true,
  },
  {
    id: 'testimonials',
    label: 'Testimonials & Credentials',
    route: '/testimonials',
    description: 'Client testimonials, logos, awards, and case studies.',
    sections: sectionsFromKeys(['testimonials.hero', 'testimonials.page', 'credentials.page']),
    editable: true,
  },
  {
    id: 'contact',
    label: 'Contact Information',
    route: '/contact',
    description: 'Contact details, branches, maps, hours, and form settings.',
    sections: sectionsFromKeys(['contact.hero', 'contact.page']),
    editable: true,
  },
  {
    id: 'company',
    label: 'Website Goals & Marketing',
    route: '/admin/content-brief',
    description: 'Goals, SEO inputs, lead preferences, and collateral checklist.',
    sections: sectionsFromKeys([
      'company.website_goals',
      'company.seo_marketing',
      'company.lead_preferences',
      'company.marketing_assets',
    ]),
    editable: true,
  },
  {
    id: 'blog',
    label: 'Blog',
    route: '/blog',
    description: 'Blog hero and articles.',
    sections: sectionsFromKeys(['blog.hero', 'blog.posts']),
    editable: true,
  },
  {
    id: 'site',
    label: '404 Page',
    route: '/404-preview',
    description: 'Not-found page copy.',
    sections: sectionsFromKeys(['site.not_found']),
    editable: true,
  },
];

export function getStaticServicePages(): AdminSitePage[] {
  return serviceDivisions.map((service) => ({
    id: `service-${service.slug}`,
    label: service.name,
    route: getDivisionPath(service.slug),
    description: service.overview,
    sections: [],
    editable: false,
    managedIn: 'code' as const,
  }));
}

export const STATIC_LEGAL_PAGES: AdminSitePage[] = [
  {
    id: 'privacy',
    label: 'Privacy Policy',
    route: '/privacy-policy',
    description: 'Legal page content.',
    sections: [],
    editable: false,
    managedIn: 'code',
  },
  {
    id: 'terms',
    label: 'Terms of Service',
    route: '/terms-of-service',
    description: 'Legal page content.',
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
