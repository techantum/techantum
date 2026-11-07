export const ESTIMATE_STATUSES = ['draft', 'estimated', 'approved', 'converted', 'archived'] as const;
export type EstimateStatus = (typeof ESTIMATE_STATUSES)[number];

export const COMPLEXITIES = ['simple', 'medium', 'complex', 'enterprise'] as const;
export type Complexity = (typeof COMPLEXITIES)[number];

export const OPS_CATEGORIES = [
  'office_rent',
  'electricity',
  'internet',
  'software',
  'cloud_hosting',
  'admin',
  'hr',
  'utilities',
  'marketing',
  'other',
] as const;
export type OpsCategory = (typeof OPS_CATEGORIES)[number];

export const DEFAULT_ROLES = [
  { role_key: 'project_lead', role_label: 'Project Lead' },
  { role_key: 'sr_developer', role_label: 'Sr Developer' },
  { role_key: 'developer', role_label: 'Developer' },
  { role_key: 'jr_developer', role_label: 'Jr Developer' },
  { role_key: 'qa', role_label: 'QA' },
  { role_key: 'ui_ux', role_label: 'UI/UX' },
  { role_key: 'devops', role_label: 'DevOps' },
  { role_key: 'account_manager', role_label: 'Account Manager' },
  { role_key: 'other', role_label: 'Other' },
] as const;

export type CostCenterSettings = {
  id: number;
  screen_hours: string;
  api_hours: string;
  module_base_hours: string;
  qa_percentage: string;
  pm_percentage: string;
  buffer_percentage: string;
  complexity_simple_factor: string;
  complexity_medium_factor: string;
  complexity_complex_factor: string;
  complexity_enterprise_factor: string;
  working_days_per_month: string;
  productive_hours_per_day: string;
  overhead_formula: string;
  currency: string;
  updated_at?: string;
};

export type RoleRate = {
  id: string;
  role_key: string;
  role_label: string;
  hourly_cost: string;
  active: boolean;
  sort_order: number;
};

export type OperationalCost = {
  id: string;
  cost_name: string;
  monthly_amount: string;
  category: OpsCategory | string;
  active: boolean;
  notes?: string | null;
  sort_order: number;
};

export type EstimateResource = {
  id?: string;
  role_key: string;
  role_label: string;
  employee_id?: string | null;
  employee_name?: string | null;
  designation?: string | null;
  hourly_cost: number | string;
  cost_overridden?: boolean;
  planned_hours: number | string;
  allocation_pct: number | string;
  total_resource_cost?: number | string;
  sort_order?: number;
  notes?: string | null;
};

export type Estimate = {
  id: string;
  estimate_code: string;
  estimate_name: string;
  client_id?: string | null;
  client_name?: string | null;
  project_id?: string | null;
  project_name?: string | null;
  project_code?: string | null;
  project_type?: string | null;
  scope_summary?: string | null;
  modules_count: number;
  screens_count: number;
  apis_count: number;
  complexity: Complexity | string;
  system_estimated_hours: string;
  adjusted_hours?: string | null;
  final_approved_hours: string;
  hours_override: boolean;
  resource_cost: string;
  operational_cost_per_hour: string;
  project_operational_cost: string;
  additional_cost: string;
  total_internal_cost: string;
  proposed_client_price?: string | null;
  expected_profit?: string | null;
  profit_margin_pct?: string | null;
  status: EstimateStatus | string;
  notes?: string | null;
  version: number;
  created_at?: string;
  updated_at?: string;
  approved_at?: string | null;
  resources?: EstimateResource[];
};

export const OPS_CATEGORY_LABELS: Record<string, string> = {
  office_rent: 'Office Rent',
  electricity: 'Electricity',
  internet: 'Internet',
  software: 'Software',
  cloud_hosting: 'Cloud / Hosting',
  admin: 'Admin Cost',
  hr: 'HR Cost',
  utilities: 'Utilities',
  marketing: 'Marketing Overhead',
  other: 'Other',
};

export const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  estimated: 'Estimated',
  approved: 'Approved',
  converted: 'Converted to Project',
  archived: 'Archived',
};
