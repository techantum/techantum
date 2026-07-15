/** Primary admin sidebar navigation */
export const ADMIN_MAIN_NAV = [
  { href: '/admin', label: 'Overview', exact: true },
  { href: '/admin/content', label: 'Site Content' },
  { href: '/admin/submissions', label: 'Leads' },
  { href: '/admin/marketing', label: 'Marketing' },
  { href: '/admin/seo', label: 'SEO' },
  { href: '/admin/page-seo', label: 'Page Indexing' },
  { href: '/admin/redirects', label: 'Redirects' },
  { href: '/admin/branding', label: 'Branding' },
] as const;

/** Ordered page groups for legacy content index grouping. */
export const CMS_PAGE_GROUPS: { id: string; label: string }[] = [
  { id: 'homepage', label: 'Homepage' },
  { id: 'services', label: 'Services' },
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'testimonials', label: 'Testimonials' },
  { id: 'about', label: 'About' },
  { id: 'contact', label: 'Contact' },
  { id: 'blog', label: 'Blog' },
  { id: 'site', label: 'Site Settings' },
];

export function getPageGroupLabel(groupId: string): string {
  return CMS_PAGE_GROUPS.find((g) => g.id === groupId)?.label ?? groupId;
}
