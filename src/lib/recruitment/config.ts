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
