import { defaultCmsEntries } from './default-content';
import { contentSchemas } from './content-schemas';
import { serviceDivisions, getDivisionPath } from '@/lib/service-packages-data';
import { serviceSectionKeys } from './service-catalog';

export interface AdminSiteSection {
  entryKey: string;
  label: string;
  blurb: string;
  hasMedia?: boolean;
}

export interface AdminSitePage {
  id: string;
  label: string;
  route: string;
  description: string;
  icon: string;
  sections: AdminSiteSection[];
  editable: boolean;
  isSystem?: boolean;
  managedIn?: 'code';
  children?: AdminSitePage[];
}

function sectionHasMedia(entryKey: string): boolean {
  const schema = contentSchemas[entryKey];
  if (!schema) return false;
  const fieldTypes = (schema.fields ?? []).map((f) => f.type);
  const arrayTypes = (schema.arrays ?? []).flatMap((a) => a.fields.map((f) => f.type));
  return [...fieldTypes, ...arrayTypes].some((t) => t === 'image' || t === 'video');
}

function sectionsFromKeys(keys: string[], labels?: string[]): AdminSiteSection[] {
  return keys.map((entryKey, index) => {
    const meta = defaultCmsEntries.find((e) => e.entry_key === entryKey);
    return {
      entryKey,
      label: labels?.[index] || (meta?.label ?? entryKey).replace(/^Homepage\s+/i, ''),
      blurb: '',
      hasMedia: sectionHasMedia(entryKey),
    };
  });
}

function page(
  id: string,
  label: string,
  route: string,
  icon: string,
  keys: string[],
  labels?: string[],
): AdminSitePage {
  return {
    id,
    label,
    route,
    icon,
    description: '',
    sections: sectionsFromKeys(keys, labels),
    editable: true,
    isSystem: true,
  };
}

/** Public marketing pages shown in Website Content. Nested `children` match the site header dropdown. */
export const CMS_SITE_PAGES: AdminSitePage[] = [
  page('homepage', 'Home', '/', 'HomeIcon', [
    'homepage.hero',
    'homepage.stats',
    'homepage.services',
    'industries.served',
    'homepage.testimonials',
    'homepage.faq',
    'homepage.cta',
  ], ['Hero', 'Stats', 'Services', 'Industries', 'Testimonials', 'FAQ', 'CTA']),
  page('about', 'About Us', '/about', 'DocumentTextIcon', ['about.hero', 'about.overview', 'about.page', 'about.usp']),
  {
    ...page('services', 'Services', '/services', 'Squares2X2Icon', []),
    children: [
      page('services-all', 'All Services', '/services', 'Squares2X2Icon', ['services.page'], ['Services Page']),
      ...serviceDivisions.map((service) => ({
        id: `service-${service.slug}`,
        label: service.name,
        route: getDivisionPath(service.slug),
        icon: 'CubeIcon',
        description: '',
        sections: serviceSectionKeys(service.slug).map((section) => ({
          ...section,
          blurb: '',
          hasMedia: true,
        })),
        editable: true,
        isSystem: true,
      })),
    ],
  },
  page('portfolio', 'Portfolio', '/portfolio', 'BriefcaseIcon', ['portfolio.hero', 'portfolio.data', 'portfolio.cta']),
  page('testimonials', 'Testimonials', '/testimonials', 'StarIcon', ['testimonials.hero', 'testimonials.page', 'credentials.page']),
  page('blog', 'Blog', '/blog', 'NewspaperIcon', ['blog.hero', 'blog.posts']),
  page('contact', 'Contact', '/contact', 'PhoneIcon', ['contact.hero', 'contact.page']),
];

export function flattenAdminPages(pages: AdminSitePage[]): AdminSitePage[] {
  return pages.flatMap((item) => [item, ...flattenAdminPages(item.children || [])]);
}

export function getStaticServicePages(): AdminSitePage[] {
  return flattenAdminPages(CMS_SITE_PAGES).filter((item) => item.managedIn === 'code');
}

export const STATIC_LEGAL_PAGES: AdminSitePage[] = [
  {
    id: 'privacy',
    label: 'Privacy Policy',
    route: '/privacy-policy',
    icon: 'ShieldCheckIcon',
    description: 'Legal page content.',
    sections: [],
    editable: false,
    isSystem: true,
    managedIn: 'code',
  },
  {
    id: 'terms',
    label: 'Terms of Service',
    route: '/terms-of-service',
    icon: 'ClipboardDocumentCheckIcon',
    description: 'Legal page content.',
    sections: [],
    editable: false,
    isSystem: true,
    managedIn: 'code',
  },
];

export function getAllAdminSitePages(): AdminSitePage[] {
  return [...flattenAdminPages(CMS_SITE_PAGES), ...STATIC_LEGAL_PAGES];
}

export function findAdminSection(entryKey: string) {
  for (const page of flattenAdminPages(CMS_SITE_PAGES)) {
    const section = page.sections.find((item) => item.entryKey === entryKey);
    if (section) return { page, section };
  }
  return null;
}

export function countEditablePages(): number {
  return flattenAdminPages(CMS_SITE_PAGES).length + STATIC_LEGAL_PAGES.length;
}

export function countEditableSections(): number {
  return flattenAdminPages(CMS_SITE_PAGES).reduce((sum, page) => sum + page.sections.length, 0);
}

export function serviceAdminPage(id: string, label: string, route: string, system = false): AdminSitePage {
  const slug = route.replace(/^\/services\//, '').split('/')[0] || id;
  return {
    id,
    label,
    route,
    icon: 'CubeIcon',
    description: 'service',
    sections: serviceSectionKeys(slug).map((section) => ({ ...section, blurb: '', hasMedia: true })),
    editable: true,
    isSystem: system,
  };
}

export function slugifyPageId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}
