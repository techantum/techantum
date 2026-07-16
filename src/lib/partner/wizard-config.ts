import type { PartnerQuestion, QuestionType } from './catalog';

export const WIZARD_STEPS = [
  { step: 1, label: 'Business Details', key: 'business' },
  { step: 2, label: 'Project Details', key: 'project' },
  { step: 3, label: 'Modules & Features', key: 'modules' },
  { step: 4, label: 'Functional Requirements', key: 'functional' },
  { step: 5, label: 'Review & Summary', key: 'review' },
] as const;

/** Service slugs — focused on requirement-gathering engagement types */
export const SERVICE_SLUGS = {
  LANDING_PAGE: 'landing-page',
  WEBSITE_REVAMP: 'website-revamp',
  APP_CHANGES: 'app-changes',
} as const;

/** Legacy slug aliases for backward compatibility */
export const LEGACY_SERVICE_SLUG_MAP: Record<string, string> = {
  website: SERVICE_SLUGS.LANDING_PAGE,
  'web-application': SERVICE_SLUGS.WEBSITE_REVAMP,
  'mobile-application': SERVICE_SLUGS.APP_CHANGES,
};

export function normalizeServiceType(slug: string): string {
  return LEGACY_SERVICE_SLUG_MAP[slug] ?? slug;
}

/** All service_type values to try when resolving a question template (handles pre/post migration DB) */
export function getServiceTypeLookupCandidates(slug: string): string[] {
  const normalized = normalizeServiceType(slug);
  const legacySlugs = Object.entries(LEGACY_SERVICE_SLUG_MAP)
    .filter(([, value]) => value === normalized)
    .map(([key]) => key);

  return [...new Set([slug, normalized, ...legacySlugs])];
}

export const SERVICE_LABELS: Record<string, { name: string; description: string; icon: string }> = {
  [SERVICE_SLUGS.LANDING_PAGE]: {
    name: 'Marketing Landing Pages',
    description: 'Campaign-focused landing pages to capture leads and drive conversions.',
    icon: 'RocketLaunchIcon',
  },
  [SERVICE_SLUGS.WEBSITE_REVAMP]: {
    name: 'Website Revamp',
    description: 'Redesign and modernize an existing website while improving UX and performance.',
    icon: 'GlobeAltIcon',
  },
  [SERVICE_SLUGS.APP_CHANGES]: {
    name: 'Existing Application Changes',
    description: 'Enhancements, fixes, and new features for an existing web or mobile application.',
    icon: 'WrenchScrewdriverIcon',
  },
};

export interface ModuleOption {
  key: string;
  label: string;
  description: string;
  icon: string;
  services: string[];
}

export const MODULE_OPTIONS: ModuleOption[] = [
  { key: 'Forms', label: 'Lead Forms', description: 'Contact, enquiry, and lead capture forms', icon: 'ClipboardDocumentListIcon', services: ['landing-page', 'website-revamp'] },
  { key: 'CMS', label: 'CMS', description: 'Client-editable pages and content', icon: 'DocumentTextIcon', services: ['landing-page', 'website-revamp'] },
  { key: 'Blog', label: 'Blog', description: 'Articles and content marketing', icon: 'NewspaperIcon', services: ['website-revamp'] },
  { key: 'Analytics', label: 'Analytics', description: 'Conversion tracking and dashboards', icon: 'ChartBarIcon', services: ['landing-page', 'website-revamp', 'app-changes'] },
  { key: 'CRM', label: 'CRM Integration', description: 'Sync leads and contacts to CRM', icon: 'UserGroupIcon', services: ['landing-page', 'website-revamp'] },
  { key: 'Chat', label: 'Live Chat', description: 'WhatsApp, chat widget, or messaging', icon: 'ChatBubbleLeftRightIcon', services: ['landing-page', 'website-revamp'] },
  { key: 'Payments', label: 'Payments', description: 'Payment gateway for bookings or sales', icon: 'CreditCardIcon', services: ['landing-page', 'website-revamp', 'app-changes'] },
  { key: 'Booking', label: 'Booking', description: 'Appointments and scheduling', icon: 'CalendarDaysIcon', services: ['landing-page', 'website-revamp'] },
  { key: 'API Integration', label: 'API Integration', description: 'Connect to third-party systems', icon: 'LinkIcon', services: ['website-revamp', 'app-changes'] },
  { key: 'Admin Panel', label: 'Admin Panel', description: 'Backend administration and controls', icon: 'Cog6ToothIcon', services: ['website-revamp', 'app-changes'] },
];

/** Map package comparison feature keys to wizard module keys */
export const FEATURE_KEY_TO_MODULE: Record<string, string> = {
  cms: 'CMS',
  blog: 'Blog',
  crm: 'CRM',
  forms: 'Forms',
  analytics: 'Analytics',
  chat: 'Chat',
  payments: 'Payments',
  booking: 'Booking',
  api: 'API Integration',
  admin: 'Admin Panel',
};

export function getModulesForService(serviceType: string): ModuleOption[] {
  const slug = normalizeServiceType(serviceType);
  return MODULE_OPTIONS.filter((m) => m.services.includes(slug));
}

export function getSuggestedModulesFromPackage(
  serviceType: string,
  features: { feature_key: string; value: string }[]
): string[] {
  const available = new Set(getModulesForService(serviceType).map((m) => m.key));
  const suggested: string[] = [];

  for (const feat of features) {
    const mod = FEATURE_KEY_TO_MODULE[feat.feature_key];
    if (mod && available.has(mod) && feat.value !== '—' && feat.value !== 'No') {
      suggested.push(mod);
    }
  }

  if (normalizeServiceType(serviceType) === SERVICE_SLUGS.LANDING_PAGE) {
    if (!suggested.includes('Forms')) suggested.push('Forms');
    if (!suggested.includes('Analytics')) suggested.push('Analytics');
  }

  return [...new Set(suggested)];
}

/** Minimal question keys per step — only what's needed to understand pain points and scope */
export const FOCUSED_QUESTION_KEYS: Record<string, Record<number, string[]>> = {
  'landing-page': {
    1: ['company_name', 'industry', 'pain_points', 'goals'],
    2: ['project_name', 'budget_range', 'expected_launch', 'target_audience'],
    4: [
      'campaign_goal', 'key_pages', 'design_reference', 'content_ready',
      'need_forms', 'need_analytics', 'need_crm',
    ],
  },
  'website-revamp': {
    1: ['company_name', 'client_website', 'industry', 'pain_points', 'goals'],
    2: ['project_name', 'budget_range', 'expected_launch', 'revamp_reason'],
    4: [
      'current_issues', 'keep_content', 'design_reference', 'need_seo',
      'need_cms', 'content_ready', 'hosting_preference',
    ],
  },
  'app-changes': {
    1: ['company_name', 'industry', 'pain_points', 'goals'],
    2: ['project_name', 'budget_range', 'expected_launch', 'change_priority'],
    4: [
      'existing_app_available', 'tech_stack', 'handover_docs', 'change_scope',
      'current_users', 'access_to_codebase', 'deployment_env', 'api_integrations',
    ],
  },
};

export function filterFocusedQuestions(
  questions: PartnerQuestion[],
  serviceType: string
): PartnerQuestion[] {
  const slug = normalizeServiceType(serviceType);
  const keysByStep = FOCUSED_QUESTION_KEYS[slug];
  if (!keysByStep) return questions;

  const allowed = new Set<number>();
  const keySet = new Set<string>();
  for (const [step, keys] of Object.entries(keysByStep)) {
    const stepNum = Number(step);
    allowed.add(stepNum);
    for (const k of keys) keySet.add(k);
  }

  return questions.filter((q) => {
    if (q.wizard_step === 3) return false;
    if (!allowed.has(q.wizard_step)) return false;
    return keySet.has(q.question_key);
  });
}

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
  client_website: { placeholder: 'https://www.client-website.com', help_text: 'Current website URL — required for revamp projects', colSpan: 1 },
  industry: { placeholder: 'Select industry', help_text: 'Primary industry sector', colSpan: 1 },
  pain_points: { placeholder: 'What problems is the client facing today?', help_text: 'Current challenges, inefficiencies, or gaps driving this project', colSpan: 3 },
  goals: { placeholder: 'What does success look like in 3–6 months?', help_text: 'Business outcomes and measurable goals', colSpan: 3 },
  project_name: { placeholder: 'e.g. Q3 Campaign Landing Page', help_text: 'Short name for tracking this requirement', colSpan: 2 },
  expected_launch: { help_text: 'Target go-live date', colSpan: 1 },
  budget_range: {
    placeholder: 'e.g. ₹3,00,000 or $8,000 USD',
    help_text: 'Client budget — amount or range in any currency',
    colSpan: 1,
    question_type: 'text',
  },
  target_audience: { placeholder: 'e.g. B2B decision makers, local consumers', help_text: 'Who should this solution speak to?', colSpan: 2 },
  revamp_reason: { placeholder: 'e.g. outdated design, poor mobile experience, low conversions', help_text: 'Why does the client want to revamp their website now?', colSpan: 3, question_type: 'textarea' },
  change_priority: { help_text: 'How urgent are these application changes?', colSpan: 1 },
};

const LANDING_FUNCTIONAL: Record<string, QuestionEnhancement> = {
  campaign_goal: { group: 'Campaign', placeholder: 'e.g. Generate 200 qualified leads per month', help_text: 'Primary campaign or business objective', colSpan: 3, question_type: 'textarea' },
  key_pages: { group: 'Scope', placeholder: 'e.g. Home, Product, Pricing, Contact', help_text: 'Main sections or pages needed', colSpan: 2 },
  design_reference: { group: 'Design', placeholder: 'URLs or style preferences', help_text: 'Reference sites or brand direction', colSpan: 2, question_type: 'textarea' },
  content_ready: { group: 'Content', help_text: 'Is copy, images, and brand assets ready?' },
  need_forms: { group: 'Features', help_text: 'Lead capture or enquiry forms needed?' },
  need_analytics: { group: 'Features', help_text: 'Conversion tracking (GA, pixels, etc.)?' },
  need_crm: { group: 'Integrations', help_text: 'Should leads sync to a CRM?' },
};

const REVAMP_FUNCTIONAL: Record<string, QuestionEnhancement> = {
  current_issues: { group: 'Current State', placeholder: 'e.g. slow load, poor mobile UX, outdated branding', help_text: 'What is wrong with the current website?', colSpan: 3, question_type: 'textarea' },
  keep_content: { group: 'Content', help_text: 'Should existing content and URLs be preserved?' },
  design_reference: { group: 'Design', placeholder: 'URLs or mood boards', help_text: 'Design direction for the revamp', colSpan: 2, question_type: 'textarea' },
  need_seo: { group: 'SEO', help_text: 'SEO improvements needed during revamp?' },
  need_cms: { group: 'CMS', help_text: 'Does the client need to manage content themselves?' },
  content_ready: { group: 'Content', help_text: 'Is updated content ready or needs creation?' },
  hosting_preference: { group: 'Hosting', help_text: 'Where should the revamped site be hosted?' },
};

const APP_CHANGES_FUNCTIONAL: Record<string, QuestionEnhancement> = {
  existing_app_available: { group: 'Current Application', help_text: 'Is the existing application accessible for review?' },
  tech_stack: { group: 'Current Application', placeholder: 'e.g. React, Node.js, PostgreSQL, AWS', help_text: 'Known technologies, frameworks, and infrastructure', colSpan: 2, question_type: 'textarea' },
  handover_docs: { group: 'Documentation', help_text: 'Are handover docs, architecture diagrams, or API docs available?' },
  change_scope: { group: 'Scope', placeholder: 'Describe the changes, features, or fixes needed', help_text: 'What exactly needs to change in the existing application?', colSpan: 3, question_type: 'textarea' },
  current_users: { group: 'Usage', placeholder: 'e.g. 500 daily active users', help_text: 'Approximate user base and usage pattern', colSpan: 1 },
  access_to_codebase: { group: 'Access', help_text: 'Will TechAntum get access to source code and environments?' },
  deployment_env: { group: 'Infrastructure', placeholder: 'e.g. AWS, Azure, on-premise', help_text: 'Where is the application currently deployed?', colSpan: 2 },
  api_integrations: { group: 'Integrations', placeholder: 'e.g. 2', help_text: 'Number of third-party systems involved', colSpan: 1 },
};

export const FUNCTIONAL_GROUPS: Record<string, string[]> = {
  'landing-page': ['Campaign', 'Scope', 'Design', 'Content', 'Features', 'Integrations'],
  'website-revamp': ['Current State', 'Content', 'Design', 'SEO', 'CMS', 'Hosting'],
  'app-changes': ['Current Application', 'Documentation', 'Scope', 'Usage', 'Access', 'Infrastructure', 'Integrations'],
};

export function getEnhancement(serviceType: string, key: string): QuestionEnhancement {
  const slug = normalizeServiceType(serviceType);
  const serviceMap =
    slug === SERVICE_SLUGS.LANDING_PAGE
      ? LANDING_FUNCTIONAL
      : slug === SERVICE_SLUGS.WEBSITE_REVAMP
        ? REVAMP_FUNCTIONAL
        : slug === SERVICE_SLUGS.APP_CHANGES
          ? APP_CHANGES_FUNCTIONAL
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

/** Focused supplementary questions merged when not in DB */
export function getSupplementaryQuestions(serviceType: string, templateId: string): PartnerQuestion[] {
  const slug = normalizeServiceType(serviceType);

  const extras: Record<string, Partial<PartnerQuestion>[]> = {
    'landing-page': [
      { question_key: 'campaign_goal', label: 'Campaign Goal', question_type: 'textarea', wizard_step: 4, is_required: true, display_order: 1 },
      { question_key: 'key_pages', label: 'Key Pages / Sections', question_type: 'text', wizard_step: 4, is_required: true, display_order: 2 },
      { question_key: 'design_reference', label: 'Design Reference', question_type: 'textarea', wizard_step: 4, is_required: false, display_order: 3 },
      { question_key: 'content_ready', label: 'Is Content Ready?', question_type: 'radio', options: ['Yes — fully ready', 'Partially ready', 'No — need support'], wizard_step: 4, is_required: true, display_order: 4 },
      { question_key: 'need_forms', label: 'Lead Capture Forms?', question_type: 'radio', options: ['Yes', 'No'], wizard_step: 4, is_required: true, display_order: 5 },
      { question_key: 'need_analytics', label: 'Conversion Tracking?', question_type: 'radio', options: ['Yes', 'No'], wizard_step: 4, is_required: true, display_order: 6 },
      { question_key: 'need_crm', label: 'CRM Integration?', question_type: 'radio', options: ['Yes', 'No', 'Optional'], wizard_step: 4, is_required: false, display_order: 7 },
    ],
    'website-revamp': [
      { question_key: 'revamp_reason', label: 'Why Revamp Now?', question_type: 'textarea', wizard_step: 2, is_required: true, display_order: 5 },
      { question_key: 'current_issues', label: 'Current Website Issues', question_type: 'textarea', wizard_step: 4, is_required: true, display_order: 1 },
      { question_key: 'keep_content', label: 'Keep Existing Content & URLs?', question_type: 'radio', options: ['Yes — migrate as-is', 'Partial update', 'Full rewrite'], wizard_step: 4, is_required: true, display_order: 2 },
      { question_key: 'design_reference', label: 'Design Reference', question_type: 'textarea', wizard_step: 4, is_required: false, display_order: 3 },
      { question_key: 'need_seo', label: 'SEO Improvements Needed?', question_type: 'radio', options: ['Basic', 'Advanced', 'No'], wizard_step: 4, is_required: true, display_order: 4 },
      { question_key: 'need_cms', label: 'CMS Required?', question_type: 'radio', options: ['Yes', 'No'], wizard_step: 4, is_required: true, display_order: 5 },
      { question_key: 'content_ready', label: 'Updated Content Ready?', question_type: 'radio', options: ['Yes', 'Partially', 'No'], wizard_step: 4, is_required: true, display_order: 6 },
      { question_key: 'hosting_preference', label: 'Hosting Preference', question_type: 'dropdown', options: ['Keep current host', 'Cloud (AWS/Azure)', 'Vercel/Netlify', 'To be discussed'], wizard_step: 4, is_required: false, display_order: 7 },
    ],
    'app-changes': [
      { question_key: 'change_priority', label: 'Change Priority', question_type: 'dropdown', options: ['Low', 'Medium', 'High', 'Critical'], wizard_step: 2, is_required: true, display_order: 5 },
      { question_key: 'existing_app_available', label: 'Existing App Available for Review?', question_type: 'radio', options: ['Yes — live app', 'Yes — staging only', 'No — limited access'], wizard_step: 4, is_required: true, display_order: 1 },
      { question_key: 'tech_stack', label: 'Current Tech Stack', question_type: 'textarea', wizard_step: 4, is_required: true, display_order: 2 },
      { question_key: 'handover_docs', label: 'Handover / Technical Docs Available?', question_type: 'radio', options: ['Yes — complete', 'Partial', 'No'], wizard_step: 4, is_required: true, display_order: 3 },
      { question_key: 'change_scope', label: 'Scope of Changes', question_type: 'textarea', wizard_step: 4, is_required: true, display_order: 4 },
      { question_key: 'current_users', label: 'Current Users / Usage', question_type: 'text', wizard_step: 4, is_required: false, display_order: 5 },
      { question_key: 'access_to_codebase', label: 'Access to Source Code?', question_type: 'radio', options: ['Yes', 'No', 'To be arranged'], wizard_step: 4, is_required: true, display_order: 6 },
      { question_key: 'deployment_env', label: 'Deployment Environment', question_type: 'text', wizard_step: 4, is_required: false, display_order: 7 },
      { question_key: 'api_integrations', label: 'Third-party Integrations', question_type: 'number', wizard_step: 4, is_required: false, display_order: 8 },
    ],
  };

  const list = extras[slug] ?? [];
  return list.map((e, i) => ({
    id: `supp-${slug}-${e.question_key}`,
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

const INDUSTRY_OPTIONS = [
  'Technology', 'Healthcare', 'Education', 'Real Estate', 'Manufacturing',
  'Retail', 'Finance', 'Logistics', 'Hospitality', 'Other',
];

/** Core step 1 & 2 questions — used when DB templates are not seeded */
const CORE_QUESTION_DEFS: Record<string, Omit<PartnerQuestion, 'id' | 'template_id' | 'wizard_step' | 'display_order'>> = {
  company_name: {
    question_key: 'company_name',
    label: 'Client Company Name',
    question_type: 'text',
    options: [],
    placeholder: 'e.g. ABC Corporation Pvt Ltd',
    help_text: 'Legal or trading name of your client\'s company',
    default_value: null,
    is_required: true,
    partner_question_conditions: [],
  },
  client_website: {
    question_key: 'client_website',
    label: 'Current Website URL',
    question_type: 'text',
    options: [],
    placeholder: 'https://www.client-website.com',
    help_text: 'Existing website — required for revamp projects',
    default_value: null,
    is_required: false,
    partner_question_conditions: [],
  },
  industry: {
    question_key: 'industry',
    label: 'Industry',
    question_type: 'dropdown',
    options: INDUSTRY_OPTIONS,
    placeholder: 'Select industry',
    help_text: 'Primary industry sector of the client business',
    default_value: null,
    is_required: true,
    partner_question_conditions: [],
  },
  pain_points: {
    question_key: 'pain_points',
    label: 'Client Pain Points',
    question_type: 'textarea',
    options: [],
    placeholder: 'What problems is the client facing today?',
    help_text: 'Current challenges, inefficiencies, or gaps driving this project',
    default_value: null,
    is_required: true,
    partner_question_conditions: [],
  },
  goals: {
    question_key: 'goals',
    label: 'Business Goals & Expected Outcomes',
    question_type: 'textarea',
    options: [],
    placeholder: 'What does success look like in 3–6 months?',
    help_text: 'Business outcomes and measurable goals',
    default_value: null,
    is_required: true,
    partner_question_conditions: [],
  },
  project_name: {
    question_key: 'project_name',
    label: 'Project Name',
    question_type: 'text',
    options: [],
    placeholder: 'e.g. Q3 Campaign Landing Page',
    help_text: 'Short name for tracking this requirement',
    default_value: null,
    is_required: true,
    partner_question_conditions: [],
  },
  budget_range: {
    question_key: 'budget_range',
    label: 'Estimated Budget',
    question_type: 'text',
    options: [],
    placeholder: 'e.g. ₹3,00,000 or $8,000 USD',
    help_text: 'Client budget — amount or range in any currency',
    default_value: null,
    is_required: true,
    partner_question_conditions: [],
  },
  expected_launch: {
    question_key: 'expected_launch',
    label: 'Expected Launch Date',
    question_type: 'date',
    options: [],
    placeholder: null,
    help_text: 'Target go-live date',
    default_value: null,
    is_required: false,
    partner_question_conditions: [],
  },
  target_audience: {
    question_key: 'target_audience',
    label: 'Target Audience',
    question_type: 'textarea',
    options: [],
    placeholder: 'e.g. B2B decision makers, local consumers',
    help_text: 'Who should this solution speak to?',
    default_value: null,
    is_required: false,
    partner_question_conditions: [],
  },
};

/**
 * Built-in wizard questions when DB templates are missing (e.g. production not yet seeded).
 * Ensures the requirement form always renders fields.
 */
export function getBuiltInWizardQuestions(serviceType: string): PartnerQuestion[] {
  const slug = normalizeServiceType(serviceType);
  const keysByStep = FOCUSED_QUESTION_KEYS[slug];
  if (!keysByStep) return [];

  const templateId = `builtin-${slug}`;
  const suppMap = new Map(
    getSupplementaryQuestions(serviceType, templateId).map((q) => [q.question_key, q])
  );

  const questions: PartnerQuestion[] = [];

  for (const [stepStr, keys] of Object.entries(keysByStep)) {
    const wizardStep = Number(stepStr);
    keys.forEach((key, index) => {
      const fromSupp = suppMap.get(key);
      const fromCore = CORE_QUESTION_DEFS[key];
      const base = fromSupp ?? fromCore;
      if (!base) return;

      questions.push({
        ...base,
        id: `builtin-${slug}-${key}`,
        template_id: templateId,
        wizard_step: wizardStep,
        display_order: index + 1,
      } as PartnerQuestion);
    });
  }

  return enhanceQuestions(questions, serviceType);
}

/** Resolve questions from DB with built-in fallback */
export function resolveWizardQuestions(
  dbQuestions: PartnerQuestion[],
  serviceType: string
): PartnerQuestion[] {
  let merged = dbQuestions;

  if (merged.length === 0) {
    merged = getBuiltInWizardQuestions(serviceType);
  } else {
    const existingKeys = new Set(merged.map((q) => q.question_key));
    const supplementary = getSupplementaryQuestions(serviceType, merged[0]?.template_id ?? 'builtin').filter(
      (q) => !existingKeys.has(q.question_key)
    );
    merged = enhanceQuestions([...merged, ...supplementary], serviceType);
  }

  const focused = filterFocusedQuestions(merged, serviceType);
  if (focused.length === 0) {
    return getBuiltInWizardQuestions(serviceType);
  }

  return focused;
}
