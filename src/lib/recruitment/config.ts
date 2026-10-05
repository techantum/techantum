import type { CandidateStatus, ScoreThresholds } from './types';

export const CANDIDATE_STATUS_LABELS: Record<string, string> = {
  NEW: 'New',
  AI_ASSESSED: 'AI Assessed',
  SCREENING_REQUIRED: 'Screening Required',
  SCREENING_COMPLETED: 'Screening Completed',
  SHORTLISTED: 'Shortlisted',
  INTERVIEW_SCHEDULED: 'Interview Scheduled',
  INTERVIEWED: 'Interviewed',
  SELECTED: 'Selected',
  HOLD: 'Hold',
  REJECTED: 'Rejected',
};

export const ROLE_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
};

export const DEFAULT_THRESHOLDS: ScoreThresholds = {
  excellent: 85,
  strong: 75,
  moderate: 65,
  partial: 50,
};

export const DECISION_STATUSES: CandidateStatus[] = [
  'SHORTLISTED',
  'HOLD',
  'REJECTED',
  'INTERVIEW_SCHEDULED',
];

export const PROFILE_DECISION_ACTIONS = [
  { status: 'SHORTLISTED' as const, label: 'Shortlist', tone: 'emerald' },
  { status: 'INTERVIEW_SCHEDULED' as const, label: 'Interview', tone: 'sky' },
  { status: 'HOLD' as const, label: 'Hold', tone: 'amber' },
  { status: 'REJECTED' as const, label: 'Reject', tone: 'rose' },
];

export const CANDIDATE_PIPELINE_TABS: { id: string; label: string; statuses: string[] }[] = [
  { id: 'all', label: 'All', statuses: [] },
  { id: 'new', label: 'New', statuses: ['NEW'] },
  { id: 'assessed', label: 'AI Assessed', statuses: ['AI_ASSESSED', 'SCREENING_REQUIRED', 'SCREENING_COMPLETED'] },
  { id: 'shortlisted', label: 'Shortlisted', statuses: ['SHORTLISTED'] },
  { id: 'interviewed', label: 'Interviewed', statuses: ['INTERVIEW_SCHEDULED', 'INTERVIEWED'] },
  { id: 'selected', label: 'Selected', statuses: ['SELECTED'] },
  { id: 'hold', label: 'Hold', statuses: ['HOLD'] },
  { id: 'rejected', label: 'Rejected', statuses: ['REJECTED'] },
];

export function candidateMatchesTab(status: string, tabId: string) {
  if (tabId === 'all') return true;
  const tab = CANDIDATE_PIPELINE_TABS.find((item) => item.id === tabId);
  return tab ? tab.statuses.includes(status) : status === tabId;
}

export function candidateInitials(name: string | null | undefined) {
  if (!name?.trim()) return 'C';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function overallFitLabel(percent: number | null) {
  if (percent == null) return 'Not assessed';
  if (percent >= 80) return 'Excellent Fit';
  if (percent >= 70) return 'Strong Fit';
  if (percent >= 55) return 'Good Fit';
  if (percent >= 40) return 'Partial Fit';
  return 'Low Fit';
}

export function overallFitCaption(percent: number | null) {
  if (percent == null) return 'Run AI assessment to score this candidate.';
  if (percent >= 80) return 'Excellent match with strong evidence across the role.';
  if (percent >= 70) return 'Strong fit with limited gaps to validate.';
  if (percent >= 55) return 'Suitable for the role with some gaps.';
  if (percent >= 40) return 'Partial fit. Review gaps before progressing.';
  return 'Low fit based on resume evidence.';
}

export function candidateStatusBadgeVariant(status: string): 'default' | 'indigo' | 'amber' | 'green' | 'rose' | 'sky' | 'violet' {
  switch (status) {
    case 'SELECTED':
      return 'green';
    case 'SHORTLISTED':
    case 'INTERVIEW_SCHEDULED':
    case 'INTERVIEWED':
      return 'indigo';
    case 'HOLD':
    case 'SCREENING_REQUIRED':
      return 'amber';
    case 'REJECTED':
      return 'rose';
    case 'AI_ASSESSED':
    case 'SCREENING_COMPLETED':
      return 'violet';
    default:
      return 'default';
  }
}

export function classifyFit(percent: number, thresholds: ScoreThresholds) {
  if (percent >= thresholds.excellent) return 'Excellent Fit';
  if (percent >= thresholds.strong) return 'Strong Fit';
  if (percent >= thresholds.moderate) return 'Moderate Fit';
  if (percent >= thresholds.partial) return 'Partial Fit';
  return 'Low Fit';
}

export function recommendAction(percent: number, thresholds: ScoreThresholds) {
  if (percent >= thresholds.excellent) return 'Priority Interview';
  if (percent >= thresholds.strong) return 'Schedule Interview';
  if (percent >= thresholds.moderate) return 'Conduct Screening Call';
  if (percent >= thresholds.partial) return 'Review Manually';
  return 'Usually Do Not Proceed';
}
