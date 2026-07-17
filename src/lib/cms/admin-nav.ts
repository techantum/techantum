export interface AdminNavItem {
  href: string;
  label: string;
  icon: string;
  exact?: boolean;
}

export interface AdminNavGroup {
  id: string;
  label: string;
  icon: string;
  defaultOpen?: boolean;
  items: AdminNavItem[];
}

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'HomeIcon',
    defaultOpen: true,
    items: [
      { href: '/admin', label: 'Overview', icon: 'ChartBarSquareIcon', exact: true },
      { href: '/admin/analytics', label: 'Website Analytics', icon: 'ChartBarIcon' },
    ],
  },
  {
    id: 'partners',
    label: 'Partner Portal',
    icon: 'UserGroupIcon',
    defaultOpen: true,
    items: [
      { href: '/admin/partners', label: 'Partners', icon: 'UsersIcon' },
      { href: '/admin/partner-catalog', label: 'Service Catalog', icon: 'Squares2X2Icon' },
      { href: '/admin/partner-requirements', label: 'Requirements', icon: 'ClipboardDocumentListIcon' },
    ],
  },
  {
    id: 'content',
    label: 'Site Content',
    icon: 'DocumentTextIcon',
    defaultOpen: true,
    items: [
      { href: '/admin/content', label: 'Pages & Sections', icon: 'PencilSquareIcon' },
      { href: '/admin/branding', label: 'Branding', icon: 'PaintBrushIcon' },
      { href: '/admin/submissions', label: 'Leads', icon: 'InboxIcon' },
      { href: '/admin/marketing', label: 'Marketing Hub', icon: 'MegaphoneIcon' },
    ],
  },
  {
    id: 'seo',
    label: 'SEO & Discovery',
    icon: 'GlobeAltIcon',
    items: [
      { href: '/admin/seo', label: 'Global SEO', icon: 'MagnifyingGlassIcon' },
      { href: '/admin/page-seo', label: 'Page Indexing', icon: 'DocumentCheckIcon' },
      { href: '/admin/redirects', label: 'Redirects', icon: 'ArrowPathIcon' },
    ],
  },
];

/** Flat list for backward compatibility */
export const ADMIN_MAIN_NAV = ADMIN_NAV_GROUPS.flatMap((g) => g.items);

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
