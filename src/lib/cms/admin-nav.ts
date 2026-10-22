import { filterNavGroups } from '@/lib/admin/roles';

export interface AdminNavItem {
  /** Permission group id. A branch with this id is hidden for roles that cannot see that group. */
  id?: string;
  href?: string;
  label: string;
  icon: string;
  exact?: boolean;
  /** Extra routes that should keep this item highlighted, such as a page action. */
  activePaths?: string[];
  children?: AdminNavItem[];
}

/** Main categories. Each child is a subcategory, and those children are sub-sub items. */
export const ADMIN_NAV: AdminNavItem[] = [
  {
    label: 'Dashboard',
    icon: 'HomeIcon',
    children: [
      { href: '/admin', label: 'Overview', icon: 'ChartBarSquareIcon', exact: true },
    ],
  },
  {
    label: 'Analytics',
    icon: 'ChartBarIcon',
    children: [
      { href: '/admin/analytics', label: 'Website Analytics', icon: 'ChartBarIcon' },
      { href: '/admin/gbp-analytics', label: 'Google Business Analytics', icon: 'MapPinIcon' },
    ],
  },
  {
    label: 'Sales & Marketing',
    icon: 'MegaphoneIcon',
    children: [
      {
        id: 'meta-ads',
        label: 'Meta Ads',
        icon: 'PresentationChartLineIcon',
        children: [
          { href: '/admin/meta-ads', label: 'Overview', icon: 'ChartBarSquareIcon', exact: true },
          { href: '/admin/meta-ads', label: 'Ad Analytics', icon: 'ChartBarIcon', exact: true },
          { href: '/admin/meta-ads/campaigns', label: 'Campaigns', icon: 'MegaphoneIcon' },
          { href: '/admin/meta-ads/logs', label: 'API Logs', icon: 'CommandLineIcon' },
        ],
      },
      {
        id: 'youtube-research',
        label: 'YouTube Research',
        icon: 'PlayCircleIcon',
        children: [
          {
            href: '/admin/youtube-research',
            label: 'Research Projects',
            icon: 'RectangleStackIcon',
            exact: true,
            activePaths: [
              '/admin/youtube-research/projects',
              '/admin/youtube-research/overview',
              '/admin/youtube-research/channels',
              '/admin/youtube-research/import',
              '/admin/youtube-research/videos',
              '/admin/youtube-research/analysis',
              '/admin/youtube-research/compare',
              '/admin/youtube-research/channel-compare',
              '/admin/youtube-research/reports',
              '/admin/youtube-research/performance',
            ],
          },
          { href: '/admin/youtube-research/settings', label: 'Settings', icon: 'Cog6ToothIcon' },
        ],
      },
      {
        id: 'sales',
        label: 'Lead Discovery',
        icon: 'MapPinIcon',
        children: [
          { href: '/admin/lead-discovery', label: 'Places Search', icon: 'MagnifyingGlassCircleIcon' },
        ],
      },
      {
        id: 'seo',
        label: 'SEO & Discovery',
        icon: 'GlobeAltIcon',
        children: [
          { href: '/admin/seo', label: 'Global SEO', icon: 'MagnifyingGlassIcon' },
          { href: '/admin/page-seo', label: 'Page Indexing', icon: 'DocumentCheckIcon' },
          { href: '/admin/redirects', label: 'Redirects', icon: 'ArrowPathIcon' },
        ],
      },
    ],
  },
  {
    label: 'Customer Engagement',
    icon: 'ChatBubbleLeftRightIcon',
    children: [
      {
        id: 'whatsapp-provider',
        label: 'WhatsApp Business',
        icon: 'DevicePhoneMobileIcon',
        children: [
          { href: '/admin/wa-provider', label: 'Overview', icon: 'ChartBarSquareIcon', exact: true },
          { href: '/admin/wa-provider/clients', label: 'Clients', icon: 'BuildingOffice2Icon', activePaths: ['/admin/wa-provider/onboard'] },
          { href: '/admin/wa-provider/wabas', label: 'WhatsApp Accounts', icon: 'IdentificationIcon' },
          { href: '/admin/wa-provider/phones', label: 'Phone Numbers', icon: 'PhoneIcon' },
          { href: '/admin/wa-provider/templates', label: 'Templates', icon: 'DocumentDuplicateIcon' },
          { href: '/admin/wa-provider/messages', label: 'Messages', icon: 'ChatBubbleBottomCenterTextIcon' },
          { href: '/admin/wa-provider/inbox', label: 'Inbox', icon: 'InboxIcon' },
          { href: '/admin/wa-provider/campaigns', label: 'Campaigns', icon: 'MegaphoneIcon' },
          { href: '/admin/wa-provider/contacts', label: 'Contacts', icon: 'UsersIcon' },
          { href: '/admin/wa-provider/automations', label: 'Automations', icon: 'BoltIcon' },
          { href: '/admin/wa-provider/flows', label: 'WhatsApp Flows', icon: 'SquaresPlusIcon' },
          { href: '/admin/wa-provider/analytics', label: 'Analytics', icon: 'ChartBarIcon' },
          { href: '/admin/wa-provider/quality', label: 'Quality & Health', icon: 'ShieldCheckIcon' },
          { href: '/admin/wa-provider/alerts', label: 'Alerts', icon: 'BellAlertIcon' },
          { href: '/admin/wa-provider/webhooks', label: 'Webhooks', icon: 'SignalIcon' },
          { href: '/admin/wa-provider/api-logs', label: 'API Logs', icon: 'CommandLineIcon' },
          { href: '/admin/wa-provider/billing', label: 'Billing', icon: 'CreditCardIcon' },
          { href: '/admin/wa-provider/support', label: 'Support', icon: 'LifebuoyIcon' },
          { href: '/admin/wa-provider/audit', label: 'Audit Logs', icon: 'ClipboardDocumentCheckIcon' },
          { href: '/admin/wa-provider/settings', label: 'Settings', icon: 'Cog6ToothIcon' },
        ],
      },
      {
        id: 'whatsapp-ai',
        label: 'WhatsApp AI',
        icon: 'BoltIcon',
        children: [
          { href: '/admin/whatsapp/inbox', label: 'Inbox', icon: 'InboxIcon' },
          { href: '/admin/whatsapp/chats', label: 'Chats', icon: 'TableCellsIcon' },
          { href: '/admin/whatsapp/appointments', label: 'Appointments', icon: 'CalendarDaysIcon' },
          { href: '/admin/whatsapp/knowledge', label: 'Knowledge Base', icon: 'BookOpenIcon' },
          { href: '/admin/whatsapp/settings', label: 'AI Settings', icon: 'Cog6ToothIcon' },
          { href: '/admin/ai/providers', label: 'AI Gateway', icon: 'ShieldCheckIcon' },
        ],
      },
    ],
  },
  {
    label: 'Projects & Delivery',
    icon: 'ClipboardDocumentCheckIcon',
    children: [
      {
        id: 'project-management',
        label: 'Project Management',
        icon: 'FolderIcon',
        children: [
          { href: '/admin/pm', label: 'Overview', icon: 'ChartBarSquareIcon', exact: true },
          { href: '/admin/pm/projects', label: 'Projects', icon: 'FolderIcon' },
          { href: '/admin/pm/daily', label: 'Daily Updates', icon: 'CalendarDaysIcon' },
          { href: '/admin/pm/onboarding', label: 'Onboarding', icon: 'ClipboardDocumentCheckIcon' },
          { href: '/admin/pm/team', label: 'Team Allocation', icon: 'UsersIcon' },
          { href: '/admin/pm/tickets', label: 'Tickets', icon: 'TicketIcon' },
          { href: '/admin/pm/requirements', label: 'Requirements', icon: 'ClipboardDocumentListIcon' },
          {
            label: 'Process & ISMS',
            icon: 'ShieldCheckIcon',
            children: [
              { href: '/admin/pm/process', label: 'Overview', icon: 'ChartBarSquareIcon', exact: true },
              {
                label: 'Assets & Resources',
                icon: 'CircleStackIcon',
                children: [
                  { href: '/admin/pm/registers/assets', label: 'Assets', icon: 'CircleStackIcon' },
                  { href: '/admin/pm/registers/software', label: 'Software', icon: 'SquaresPlusIcon' },
                  { href: '/admin/pm/registers/suppliers', label: 'Suppliers', icon: 'BuildingStorefrontIcon' },
                ],
              },
              {
                label: 'Access & Infrastructure',
                icon: 'ServerStackIcon',
                children: [
                  { href: '/admin/pm/registers/access', label: 'Access', icon: 'IdentificationIcon' },
                  { href: '/admin/pm/registers/servers', label: 'Servers & Cloud', icon: 'ServerStackIcon' },
                  { href: '/admin/pm/registers/backups', label: 'Backups', icon: 'CircleStackIcon' },
                ],
              },
              {
                label: 'Security',
                icon: 'ShieldCheckIcon',
                children: [
                  { href: '/admin/pm/registers/incidents', label: 'Incidents', icon: 'ExclamationTriangleIcon' },
                  { href: '/admin/pm/registers/vulnerabilities', label: 'Vulnerabilities', icon: 'ShieldCheckIcon' },
                ],
              },
              {
                label: 'People & Compliance',
                icon: 'UsersIcon',
                children: [
                  { href: '/admin/pm/registers/training', label: 'Training', icon: 'BookOpenIcon' },
                  { href: '/admin/pm/registers/joiner-leaver', label: 'Joiner / Leaver', icon: 'UserPlusIcon' },
                ],
              },
              {
                label: 'Risks & Changes',
                icon: 'ArrowsRightLeftIcon',
                children: [
                  { href: '/admin/pm/registers/changes', label: 'Changes', icon: 'ArrowsRightLeftIcon' },
                  { href: '/admin/pm/registers/risks', label: 'Risks', icon: 'ShieldCheckIcon' },
                  { href: '/admin/pm/registers/actions', label: 'Corrective Actions', icon: 'ClipboardDocumentCheckIcon' },
                ],
              },
              {
                label: 'Controls',
                icon: 'QueueListIcon',
                children: [
                  { href: '/admin/pm/registers/controls', label: 'Control Checklist', icon: 'QueueListIcon' },
                ],
              },
            ],
          },
          { href: '/admin/pm/reports', label: 'Reports', icon: 'DocumentChartBarIcon' },
          { href: '/admin/pm/documents', label: 'Documents & Evidence', icon: 'FolderIcon' },
          { href: '/admin/pm/settings', label: 'Settings', icon: 'Cog6ToothIcon' },
        ],
      },
    ],
  },
  {
    label: 'Business Operations',
    icon: 'BanknotesIcon',
    children: [
      {
        id: 'finance',
        label: 'Finance',
        icon: 'BanknotesIcon',
        children: [
          { href: '/admin/finance', label: 'Overview', icon: 'ChartBarSquareIcon', exact: true },
          { href: '/admin/finance/clients', label: 'Clients', icon: 'UserGroupIcon' },
          { href: '/admin/finance/invoices', label: 'Invoices', icon: 'DocumentTextIcon' },
          { href: '/admin/finance/vendors', label: 'Vendors', icon: 'BuildingStorefrontIcon' },
          { href: '/admin/finance/receipts', label: 'Receipts', icon: 'ReceiptRefundIcon' },
          { href: '/admin/finance/transactions', label: 'Transactions', icon: 'ArrowsRightLeftIcon' },
          { href: '/admin/finance/documents', label: 'Documents', icon: 'FolderIcon' },
          { href: '/admin/finance/reports', label: 'Reports', icon: 'DocumentChartBarIcon' },
          { href: '/admin/finance/ca-export', label: 'CA Export', icon: 'ArchiveBoxArrowDownIcon' },
          { href: '/admin/finance/settings', label: 'Settings', icon: 'Cog6ToothIcon' },
        ],
      },
    ],
  },
  {
    label: 'People',
    icon: 'IdentificationIcon',
    children: [
      {
        id: 'hr',
        label: 'HR',
        icon: 'IdentificationIcon',
        children: [
          { href: '/admin/hr', label: 'Overview', icon: 'ChartBarSquareIcon', exact: true },
          { href: '/admin/hr/employees', label: 'Employees', icon: 'UsersIcon' },
          { href: '/admin/hr/attendance', label: 'Attendance', icon: 'CalendarDaysIcon' },
          { href: '/admin/hr/leave', label: 'Leave', icon: 'ClipboardDocumentCheckIcon' },
          { href: '/admin/hr/payroll', label: 'Payroll', icon: 'BanknotesIcon' },
          { href: '/admin/hr/payslips', label: 'Payslips', icon: 'DocumentDuplicateIcon' },
          { href: '/admin/hr/holidays', label: 'Holidays', icon: 'GiftIcon' },
          {
            label: 'Recruitment',
            icon: 'UserPlusIcon',
            children: [
              { href: '/admin/recruitment', label: 'Candidates / Applications', icon: 'UsersIcon', exact: true },
              { href: '/admin/recruitment/roles', label: 'Job Roles', icon: 'BriefcaseIcon' },
            ],
          },
          { href: '/admin/hr/annual', label: 'Payroll Summary', icon: 'DocumentChartBarIcon' },
          {
            label: 'HR Settings',
            icon: 'Cog6ToothIcon',
            children: [
              { href: '/admin/hr/settings', label: 'Payroll Settings', icon: 'Cog6ToothIcon' },
            ],
          },
        ],
      },
    ],
  },
  {
    label: 'Content & Brand',
    icon: 'DocumentTextIcon',
    children: [
      {
        id: 'content',
        label: 'Site Content',
        icon: 'PencilSquareIcon',
        children: [
          { href: '/admin/content', label: 'Website Content', icon: 'PencilSquareIcon' },
          { href: '/admin/branding', label: 'Branding', icon: 'PaintBrushIcon' },
          { href: '/admin/submissions', label: 'Leads', icon: 'InboxIcon' },
        ],
      },
    ],
  },
  {
    label: 'Partners',
    icon: 'UserGroupIcon',
    children: [
      {
        id: 'partners',
        label: 'Partner Portal',
        icon: 'UserGroupIcon',
        children: [
          { href: '/admin/partners', label: 'Partners', icon: 'UsersIcon' },
          { href: '/admin/partner-catalog', label: 'Service Catalog', icon: 'Squares2X2Icon' },
          { href: '/admin/partner-requirements', label: 'Requirements', icon: 'ClipboardDocumentListIcon' },
        ],
      },
    ],
  },
  {
    label: 'Administration',
    icon: 'Cog6ToothIcon',
    children: [
      {
        id: 'master',
        label: 'Master Data',
        icon: 'CircleStackIcon',
        children: [
          { href: '/admin/master-data', label: 'Lookup Values', icon: 'QueueListIcon' },
        ],
      },
      {
        id: 'account',
        label: 'My Account',
        icon: 'UserCircleIcon',
        children: [
          { href: '/admin/profile', label: 'Profile', icon: 'IdentificationIcon' },
        ],
      },
    ],
  },
];

function filterTree(items: AdminNavItem[], role: string | null | undefined): AdminNavItem[] {
  return items.flatMap((item) => {
    if (item.id && filterNavGroups([{ id: item.id }], role).length === 0) return [];
    const children = item.children ? filterTree(item.children, role) : undefined;
    if (item.children && !children?.length) return [];
    return [{ ...item, children }];
  });
}

/** Sidebar tree with role-restricted branches removed. */
export function visibleAdminNav(role: string | null | undefined): AdminNavItem[] {
  return filterTree(ADMIN_NAV, role);
}

function flattenItems(items: AdminNavItem[]): AdminNavItem[] {
  return items.flatMap((item) => [item, ...flattenItems(item.children || [])]);
}

/** Flat list of clickable pages. */
export const ADMIN_MAIN_NAV = flattenItems(ADMIN_NAV).filter((item) => item.href);

/** Ordered page groups for legacy content index grouping. */
export const CMS_PAGE_GROUPS: { id: string; label: string }[] = [
  { id: 'homepage', label: 'Homepage' },
  { id: 'about', label: 'About' },
  { id: 'services', label: 'Services' },
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'industries', label: 'Industries' },
  { id: 'testimonials', label: 'Testimonials' },
  { id: 'credentials', label: 'Credentials' },
  { id: 'contact', label: 'Contact' },
  { id: 'company', label: 'Company Settings' },
  { id: 'blog', label: 'Blog' },
  { id: 'site', label: 'Site Settings' },
];

export function getPageGroupLabel(groupId: string): string {
  return CMS_PAGE_GROUPS.find((g) => g.id === groupId)?.label ?? groupId;
}
