import type { PartnerQuestion, QuestionType } from './catalog';

export const WIZARD_STEPS = [
  { step: 1, label: 'Business Details', key: 'business' },
  { step: 2, label: 'Project Details', key: 'project' },
  { step: 3, label: 'Modules & Features', key: 'modules' },
  { step: 4, label: 'Functional Requirements', key: 'functional' },
  { step: 5, label: 'Review & Summary', key: 'review' },
] as const;

export interface ModuleOption {
  key: string;
  label: string;
  description: string;
  icon: string;
}

export const MODULE_OPTIONS: ModuleOption[] = [
  { key: 'CMS', label: 'CMS', description: 'Content management for pages & media', icon: 'DocumentTextIcon' },
  { key: 'Blog', label: 'Blog', description: 'Articles, categories, and publishing', icon: 'NewspaperIcon' },
  { key: 'Career', label: 'Career', description: 'Job listings and applications', icon: 'BriefcaseIcon' },
  { key: 'Forms', label: 'Forms', description: 'Contact, lead, and enquiry forms', icon: 'ClipboardDocumentListIcon' },
  { key: 'CRM', label: 'CRM', description: 'Customer relationship management', icon: 'UserGroupIcon' },
  { key: 'Chat', label: 'Chat', description: 'Live chat or messaging', icon: 'ChatBubbleLeftRightIcon' },
  { key: 'Payments', label: 'Payments', description: 'Payment gateway integration', icon: 'CreditCardIcon' },
  { key: 'Booking', label: 'Booking', description: 'Appointments and reservations', icon: 'CalendarDaysIcon' },
  { key: 'Marketplace', label: 'Marketplace', description: 'Multi-vendor or product listings', icon: 'ShoppingBagIcon' },
  { key: 'Analytics', label: 'Analytics', description: 'Dashboards and reporting', icon: 'ChartBarIcon' },
  { key: 'Admin Panel', label: 'Admin Panel', description: 'Backend administration', icon: 'Cog6ToothIcon' },
  { key: 'API Integration', label: 'API Integration', description: 'Third-party system connections', icon: 'LinkIcon' },
];

export interface QuestionEnhancement {
  placeholder?: string;
  help_text?: string;
  group?: string;
  colSpan?: 1 | 2 | 3;
  question_type?: QuestionType;
  options?: string[];
}

const BASE_ENHANCEMENTS: Record<string, QuestionEnhancement> = {
  company_name: { placeholder: 'e.g. ABC Corporation Pvt Ltd', help_text: 'Legal or trading name of your client\'s company', colSpan: 2 },
  client_website: { placeholder: 'https://www.client-website.com', help_text: 'Existing website URL if any', colSpan: 1 },
  industry: { placeholder: 'Select industry', help_text: 'Primary industry sector of the client business', colSpan: 1 },
  country: { placeholder: 'e.g. India, USA, UAE', help_text: 'Primary country of operation', colSpan: 1 },
  business_size: { placeholder: 'Select size', help_text: 'Approximate team or company size', colSpan: 1 },
  employees: { placeholder: 'e.g. 50', help_text: 'Total number of employees', colSpan: 1 },
  pain_points: { placeholder: 'Describe current challenges, inefficiencies, or gaps…', help_text: 'What problems is the client trying to solve?', colSpan: 3 },
  goals: { placeholder: 'What does success look like in 6–12 months?', help_text: 'Business outcomes and measurable goals', colSpan: 3 },
  project_name: { placeholder: 'e.g. Client Portal Redesign', help_text: 'Internal project name for tracking', colSpan: 2 },
  expected_launch: { placeholder: '', help_text: 'Target go-live or launch date', colSpan: 1 },
  budget_range: {
    placeholder: 'e.g. ₹8,00,000 or $25,000 USD',
    help_text: 'Estimated budget in any currency — amount or range',
    colSpan: 1,
    question_type: 'text',
  },
  priority: { help_text: 'How urgent is this project for the client?', colSpan: 1 },
  target_audience: { placeholder: 'e.g. B2B SMEs, end consumers, internal staff', help_text: 'Who will primarily use this solution?', colSpan: 2 },
  languages: { help_text: 'Languages required for the platform', colSpan: 1 },
};

const WEBSITE_FUNCTIONAL: Record<string, QuestionEnhancement> = {
  num_pages: { group: 'General', placeholder: 'e.g. 10', help_text: 'Approximate number of website pages needed', colSpan: 1 },
  need_cms: { group: 'CMS & Management', help_text: 'Does the client need to edit content themselves?' },
  need_blog: { group: 'Features', help_text: 'Blog or news section for content marketing' },
  need_seo: { group: 'SEO & Analytics', help_text: 'Level of SEO setup required at launch' },
  need_analytics: { group: 'SEO & Analytics', help_text: 'Google Analytics or similar tracking' },
  need_payment: { group: 'Integrations', help_text: 'Online payment collection on the website' },
  need_login: { group: 'Security', help_text: 'User accounts and authenticated areas' },
  need_multilang: { group: 'Features', help_text: 'Multiple language versions of the site' },
  payment_gateway: { group: 'Integrations', placeholder: 'Select gateway', help_text: 'Preferred payment provider' },
  auth_methods: { group: 'Security', help_text: 'How users will sign in' },
  cms_editable_pages: { group: 'CMS & Management', placeholder: 'e.g. 15', help_text: 'Number of pages the client should manage' },
  design_reference: { group: 'Design & Content', placeholder: 'URL or description', help_text: 'Reference websites or design preferences', colSpan: 2 },
  content_ready: { group: 'Design & Content', help_text: 'Is client content (text, images) ready?' },
  hosting_preference: { group: 'Hosting', help_text: 'Preferred hosting or deployment approach' },
};

const WEBAPP_FUNCTIONAL: Record<string, QuestionEnhancement> = {
  user_roles: { group: 'General', placeholder: 'e.g. 5', help_text: 'Expected distinct user roles in the system', colSpan: 1 },
  need_admin: { group: 'General', help_text: 'Administrative dashboard for managing the platform' },
  workflow_automation: { group: 'Features', help_text: 'Automated workflows and business processes' },
  api_integrations: { group: 'Integrations', placeholder: 'e.g. 3', help_text: 'Number of third-party APIs to integrate', colSpan: 1 },
  erp_crm: { group: 'Integrations', help_text: 'Connection with existing ERP or CRM systems' },
  data_migration: { group: 'General', help_text: 'Need to migrate data from an existing system?' },
  reporting_needs: { group: 'Features', help_text: 'Reports, dashboards, or export requirements' },
  mobile_responsive: { group: 'Design & Content', help_text: 'Must work on tablets and mobile browsers' },
  auth_sso: { group: 'Security', help_text: 'Single sign-on or enterprise authentication' },
};

const MOBILE_FUNCTIONAL: Record<string, QuestionEnhancement> = {
  platforms: { group: 'General', help_text: 'Target mobile platforms' },
  offline_mode: { group: 'Features', help_text: 'App should work without internet connection' },
  push_notifications: { group: 'Features', help_text: 'Push alerts for users' },
  maps_gps: { group: 'Integrations', help_text: 'Location, maps, or GPS tracking' },
  biometric: { group: 'Security', help_text: 'Fingerprint or face login' },
  app_store: { group: 'Hosting', help_text: 'App store publishing requirements' },
  backend_api: { group: 'Integrations', help_text: 'Existing backend API or need new API?' },
};

export const FUNCTIONAL_GROUPS: Record<string, string[]> = {
  website: ['General', 'Design & Content', 'CMS & Management', 'Features', 'Integrations', 'SEO & Analytics', 'Security', 'Hosting'],
  'web-application': ['General', 'Design & Content', 'Features', 'Integrations', 'Security', 'Reporting'],
  'mobile-application': ['General', 'Features', 'Integrations', 'Security', 'Hosting'],
};

export function getEnhancement(serviceType: string, key: string): QuestionEnhancement {
  const serviceMap =
    serviceType === 'website'
      ? WEBSITE_FUNCTIONAL
      : serviceType === 'web-application'
        ? WEBAPP_FUNCTIONAL
        : serviceType === 'mobile-application'
          ? MOBILE_FUNCTIONAL
          : {};
  return { ...BASE_ENHANCEMENTS[key], ...serviceMap[key] };
}

export function enhanceQuestions(questions: PartnerQuestion[], serviceType: string): PartnerQuestion[] {
  return questions.map((q) => {
    const enh = getEnhancement(serviceType, q.question_key);
    return {
      ...q,
      placeholder: enh.placeholder ?? q.placeholder,
      help_text: enh.help_text ?? q.help_text,
      question_type: enh.question_type ?? q.question_type,
      options: enh.options ?? q.options,
      validation_rules: {
        ...(q.validation_rules ?? {}),
        ...(enh.group ? { group: enh.group } : {}),
        ...(enh.colSpan ? { colSpan: enh.colSpan } : {}),
      },
    };
  });
}

export function getQuestionGroup(q: PartnerQuestion): string {
  return q.validation_rules?.group ?? 'General';
}

export function getQuestionColSpan(q: PartnerQuestion): number {
  return q.validation_rules?.colSpan ?? (q.question_type === 'textarea' ? 3 : 1);
}

/** Extra functional questions merged when not in DB */
export function getSupplementaryQuestions(serviceType: string, templateId: string): PartnerQuestion[] {
  const extras: Record<string, Partial<PartnerQuestion>[]> = {
    website: [
      { question_key: 'design_reference', label: 'Design Reference / Inspiration', question_type: 'textarea', wizard_step: 4, is_required: false, display_order: 20 },
      { question_key: 'content_ready', label: 'Is Content Ready?', question_type: 'radio', options: ['Yes — fully ready', 'Partially ready', 'No — need content support'], wizard_step: 4, is_required: false, display_order: 21 },
      { question_key: 'hosting_preference', label: 'Hosting Preference', question_type: 'dropdown', options: ['Cloud (AWS/Azure)', 'Vercel/Netlify', 'Client infrastructure', 'To be discussed'], wizard_step: 4, is_required: false, display_order: 22 },
    ],
    'web-application': [
      { question_key: 'data_migration', label: 'Data Migration Needed?', question_type: 'radio', options: ['Yes', 'No', 'Partial'], wizard_step: 4, is_required: false, display_order: 20 },
      { question_key: 'reporting_needs', label: 'Reporting Requirements', question_type: 'textarea', wizard_step: 4, is_required: false, display_order: 21 },
      { question_key: 'mobile_responsive', label: 'Mobile Responsive Required?', question_type: 'radio', options: ['Yes', 'No'], wizard_step: 4, is_required: false, display_order: 22 },
      { question_key: 'auth_sso', label: 'SSO / Enterprise Auth?', question_type: 'radio', options: ['Yes', 'No', 'Optional'], wizard_step: 4, is_required: false, display_order: 23 },
    ],
    'mobile-application': [
      { question_key: 'app_store', label: 'App Store Publishing', question_type: 'dropdown', options: ['Google Play only', 'Apple App Store only', 'Both stores', 'Enterprise distribution'], wizard_step: 4, is_required: false, display_order: 20 },
      { question_key: 'backend_api', label: 'Backend API Status', question_type: 'radio', options: ['Existing API available', 'Need new API built', 'Not sure yet'], wizard_step: 4, is_required: false, display_order: 21 },
    ],
  };

  const list = extras[serviceType] ?? [];
  return list.map((e, i) => ({
    id: `supp-${serviceType}-${e.question_key}`,
    template_id: templateId,
    question_key: e.question_key!,
    label: e.label!,
    question_type: e.question_type!,
    options: e.options ?? [],
    placeholder: null,
    help_text: null,
    default_value: null,
    is_required: e.is_required ?? false,
    display_order: e.display_order ?? 90 + i,
    wizard_step: e.wizard_step ?? 4,
    partner_question_conditions: [],
  })) as PartnerQuestion[];
}
