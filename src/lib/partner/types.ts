export type PartnerType = 'sales' | 'marketing' | 'business_development';
export type PartnerTier = 'bronze' | 'silver' | 'gold' | 'platinum';
export type PartnerStatus = 'pending' | 'active' | 'suspended' | 'archived';
export type PartnerUserRole = 'partner_admin' | 'partner_user';
export type PartnerUserStatus = 'pending' | 'active' | 'suspended';

export type RequirementStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'need_clarification'
  | 'proposal_sent'
  | 'approved'
  | 'rejected'
  | 'won'
  | 'lost'
  | 'archived';

export interface Partner {
  id: string;
  partner_code: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  partner_type: PartnerType;
  tier: PartnerTier;
  status: PartnerStatus;
  country: string | null;
  notes: string | null;
  joined_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PartnerUser {
  id: string;
  partner_id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: PartnerUserRole;
  status: PartnerUserStatus;
  last_login_at: string | null;
  last_otp_verified_at: string | null;
  created_at: string;
}

export interface PartnerWithUser extends Partner {
  partner_user?: PartnerUser;
}

export const PARTNER_TYPE_LABELS: Record<PartnerType, string> = {
  sales: 'Sales Partner',
  marketing: 'Marketing Partner',
  business_development: 'Business Development',
};

export const PARTNER_TIER_LABELS: Record<PartnerTier, string> = {
  bronze: 'Bronze Partner',
  silver: 'Silver Partner',
  gold: 'Gold Partner',
  platinum: 'Platinum Partner',
};

export const PARTNER_STATUS_LABELS: Record<PartnerStatus, string> = {
  pending: 'Pending Invite',
  active: 'Active',
  suspended: 'Suspended',
  archived: 'Archived',
};

export const REQUIREMENT_STATUS_LABELS: Record<RequirementStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under Review',
  need_clarification: 'Need Clarification',
  proposal_sent: 'Proposal Sent',
  approved: 'Approved',
  rejected: 'Rejected',
  won: 'Won',
  lost: 'Lost',
  archived: 'Archived',
};

export interface CreatePartnerInput {
  company_name: string;
  contact_name: string;
  email: string;
  phone?: string;
  partner_type: PartnerType;
  tier?: PartnerTier;
  country?: string;
  notes?: string;
}

export interface PartnerDashboardStats {
  total: number;
  draft: number;
  submitted: number;
  under_review: number;
  approved: number;
  converted: number;
}

export interface RequirementRecord {
  id: string;
  reference_id: string;
  partner_id: string;
  partner_user_id: string;
  status: RequirementStatus;
  project_name: string | null;
  service_category_id: string | null;
  package_id: string | null;
  industry: string | null;
  country: string | null;
  budget_range: string | null;
  timeline: string | null;
  priority: string | null;
  business_data: Record<string, unknown>;
  project_data: Record<string, unknown>;
  modules_data: string[];
  features_data: unknown[];
  partner_notes: string | null;
  internal_notes: string | null;
  proposal_summary: string | null;
  proposal_amount: string | null;
  proposal_timeline: string | null;
  proposal_sent_at: string | null;
  ai_summary: Record<string, unknown> | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  partners?: { company_name: string; contact_name: string; email: string; partner_code: string };
  partner_packages?: { name: string; slug?: string } | null;
  partner_service_categories?: { name: string; slug?: string } | null;
}
