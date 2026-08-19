import { serviceDivisions } from '@/lib/service-packages-data';

export const OPS_PROJECT_TYPES = ['Website', 'Web Application', 'Mobile Application'] as const;
export type OpsProjectType = (typeof OPS_PROJECT_TYPES)[number];

const DIVISION_BY_TYPE: Record<OpsProjectType, string> = {
  Website: 'website-development',
  'Web Application': 'web-application-development',
  'Mobile Application': 'mobile-application-development',
};

export function packagesForProjectType(projectType: string): string[] {
  const slug = DIVISION_BY_TYPE[projectType as OpsProjectType];
  const division = serviceDivisions.find((item) => item.slug === slug);
  return division?.plans.map((plan) => plan.name) ?? [];
}

export function packagesByProjectType(): Record<string, string[]> {
  return Object.fromEntries(OPS_PROJECT_TYPES.map((type) => [type, packagesForProjectType(type)]));
}

export const OPS_PROJECT_STATUSES = [
  'draft',
  'onboarding',
  'not_started',
  'in_progress',
  'on_hold',
  'under_review',
  'client_review',
  'completed',
  'cancelled',
] as const;

export type OpsProjectStatus = (typeof OPS_PROJECT_STATUSES)[number];

export const OPS_TICKET_TYPES = ['FEATURE', 'ENHANCEMENT', 'BUG'] as const;
export type OpsTicketType = (typeof OPS_TICKET_TYPES)[number];

export const OPS_TICKET_STATUSES = [
  'open',
  'assigned',
  'in_progress',
  'testing',
  'client_review',
  'on_hold',
  'completed',
  'cancelled',
] as const;

export type OpsTicketStatus = (typeof OPS_TICKET_STATUSES)[number];

export const CLOSED_STATUSES = new Set(['completed', 'cancelled']);

export const PROJECT_STATUS_LABELS: Record<OpsProjectStatus, string> = {
  draft: 'Draft',
  onboarding: 'Onboarding',
  not_started: 'Not Started',
  in_progress: 'In Progress',
  on_hold: 'On Hold',
  under_review: 'Under Review',
  client_review: 'Client Review',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const TICKET_STATUS_LABELS: Record<OpsTicketStatus, string> = {
  open: 'Open',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  testing: 'Testing',
  client_review: 'Client Review',
  on_hold: 'On Hold',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const TICKET_TYPE_LABELS: Record<OpsTicketType, string> = {
  FEATURE: 'Feature',
  ENHANCEMENT: 'Enhancement',
  BUG: 'Bug',
};

export function isClosedStatus(status: string) {
  return CLOSED_STATUSES.has(status);
}
