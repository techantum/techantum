export const PROJECT_TYPES = [
  'CMS Website',
  'Web Application',
  'Mobile Application',
  'UI/UX Design',
  'Digital Marketing',
  'Branding',
] as const;

export const PROJECT_PACKAGES: Record<string, string[]> = {
  'CMS Website': ['Launch Plan', 'Growth Plan', 'Enterprise Plan'],
  'Web Application': ['MVP', 'Growth', 'Enterprise'],
  'Mobile Application': ['Prototype', 'MVP', 'Scale'],
  'UI/UX Design': ['Audit', 'Product Design', 'Design System'],
  'Digital Marketing': ['Launch', 'Growth', 'Performance'],
  Branding: ['Identity', 'Brand Kit', 'Rebrand'],
};

export const PROJECT_STATUS_LABELS = {
  draft: 'Draft',
  active: 'Active',
  closed: 'Closed',
} as const;

export const REQUIREMENT_STATUS_LABELS = {
  draft: 'Draft',
  submitted: 'Submitted',
  pending: 'Pending',
  reviewed: 'Reviewed',
  approved: 'Approved',
  need_clarification: 'Need Clarification',
} as const;

export type ProjectStatus = keyof typeof PROJECT_STATUS_LABELS;
export type ClientRequirementStatus = keyof typeof REQUIREMENT_STATUS_LABELS;

export interface RequirementQuestion {
  id: string;
  section_id: string;
  question_key: string;
  label: string;
  help_text: string | null;
  field_type: string;
  options: string[] | null;
  validation: Record<string, unknown>;
  sort_order: number;
  is_required: boolean;
}

export interface RequirementSection {
  id: string;
  template_id: string;
  title: string;
  slug: string;
  description: string | null;
  sort_order: number;
  is_repeatable: boolean;
  config: Record<string, unknown>;
  requirement_questions?: RequirementQuestion[];
}

export interface RequirementTemplate {
  id: string;
  name: string;
  slug: string;
  project_type: string;
  package_name: string | null;
  description: string | null;
  welcome_message: string | null;
  is_active: boolean;
  requirement_sections?: RequirementSection[];
}

export interface ClientProject {
  id: string;
  project_code: string;
  project_name: string;
  client_name: string;
  company_name: string;
  primary_contact_person: string | null;
  email: string;
  mobile_number: string | null;
  project_type: string;
  package_name: string | null;
  status: ProjectStatus;
  template_id: string | null;
  public_token: string;
  token_generated_at: string;
  expiry_date: string | null;
  allow_multiple_submissions: boolean;
  allow_save_draft: boolean;
  share_url: string | null;
  created_at: string;
  updated_at: string;
  requirement_templates?: Pick<RequirementTemplate, 'name' | 'slug'> | null;
}

export interface ProjectRequirement {
  id: string;
  project_id: string;
  template_id: string | null;
  status: ClientRequirementStatus;
  submission_number: number;
  current_section_slug: string | null;
  completion_percent: number;
  last_saved_at: string | null;
  submitted_at: string | null;
  confirmed_accuracy: boolean;
  clarification_sections: string[];
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RequirementAttachment {
  id: string;
  requirement_id: string | null;
  project_id: string | null;
  section_slug: string | null;
  field_key: string | null;
  original_name: string;
  file_name: string;
  file_type: string | null;
  file_size: number;
  storage_path: string;
  public_url: string;
  uploaded_by: string;
  created_at: string;
}

export interface PublicRequirementPayload {
  project: ClientProject;
  requirement: ProjectRequirement;
  template: RequirementTemplate;
  answers: Record<string, Record<string, unknown>>;
  attachments: RequirementAttachment[];
  comments: RequirementComment[];
}

export interface RequirementComment {
  id: string;
  requirement_id: string;
  section_slug: string | null;
  author_type: 'admin' | 'client' | 'system';
  comment: string;
  resolved_at: string | null;
  created_at: string;
}
