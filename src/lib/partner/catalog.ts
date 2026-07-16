export type QuestionType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'dropdown'
  | 'radio'
  | 'checkbox'
  | 'multi_select';

export interface ServiceCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
}

export interface PartnerPackage {
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
  partner_package_features?: PackageFeature[];
}

export interface PackageFeature {
  id: string;
  package_id: string;
  feature_key: string;
  feature_label: string;
  value: string;
  display_order: number;
}

export interface QuestionTemplate {
  id: string;
  slug: string;
  name: string;
  service_type: string;
  description: string | null;
  is_active: boolean;
}

export interface QuestionCondition {
  id: string;
  question_id: string;
  depends_on_question_key: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'in';
  expected_value: string;
}

export interface PartnerQuestion {
  id: string;
  template_id: string;
  question_key: string;
  label: string;
  question_type: QuestionType;
  options: string[];
  placeholder: string | null;
  help_text: string | null;
  default_value: string | null;
  is_required: boolean;
  display_order: number;
  wizard_step: number;
  partner_question_conditions?: QuestionCondition[];
}

export interface CategoryWithPackages extends ServiceCategory {
  partner_packages: PartnerPackage[];
}

export interface GeneratedDocument {
  id: string;
  requirement_id: string;
  doc_type: string;
  format: string;
  content: string | null;
  file_url: string | null;
  version: number;
  created_at: string;
}

export const WIZARD_STEPS = [
  { step: 1, label: 'Business Details', key: 'business' },
  { step: 2, label: 'Project Details', key: 'project' },
  { step: 3, label: 'Modules', key: 'modules' },
  { step: 4, label: 'Functional Questions', key: 'functional' },
] as const;

export const MODULE_OPTIONS = [
  'CMS', 'Blog', 'Career', 'Forms', 'CRM', 'Chat', 'Payments', 'Booking',
  'Marketplace', 'Vendor Portal', 'Inventory', 'Analytics', 'Admin Panel', 'API Integration',
];

export const INDUSTRIES = [
  'Technology', 'Healthcare', 'Education', 'Real Estate', 'Manufacturing',
  'Retail', 'Finance', 'Logistics', 'Hospitality', 'Other',
];

export const BUDGET_RANGES = [
  'Under ₹5L', '₹5L - ₹15L', '₹15L - ₹25L', '₹25L - ₹50L', '₹50L+', 'To be discussed',
];
