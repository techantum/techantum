export const PROJECT_CATEGORIES = ['planned_to_onboard', 'onboarded', 'ongoing', 'delivered', 'on_hold', 'cancelled'] as const;
export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number];

export const RAGS = ['green', 'amber', 'red'] as const;
export type Rag = (typeof RAGS)[number];

export const CHECKLIST_KEYS = [
  'proposal_sent',
  'proposal_accepted',
  'scope_signed',
  'contract_signed',
  'advance_received',
  'client_inputs',
  'accounts_access',
  'team_allocated',
  'environment_ready',
  'repository_created',
  'communication_channel',
  'kickoff_completed',
] as const;

export function todayInKolkata(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function parseISODate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
}

export function daysBetween(from: string, to: string): number {
  const ms = parseISODate(to).getTime() - parseISODate(from).getTime();
  return Math.round(ms / 86400000);
}

export function addDays(iso: string, days: number): string {
  const date = parseISODate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function effectiveEnd(planned?: string | null, revised?: string | null): string | null {
  return revised || planned || null;
}

export function daysToDeadline(effective: string | null, today: string): number | null {
  if (!effective) return null;
  return daysBetween(today, effective);
}

export function actualHours(hoursBeforeTracker: number, dailyHours: number[]): number {
  const before = Number(hoursBeforeTracker) || 0;
  return dailyHours.reduce((sum, hours) => sum + (Number(hours) || 0), before);
}

export function hoursVariance(actual: number, planned: number): number {
  return actual - (Number(planned) || 0);
}

export function hoursUsedPercent(actual: number, planned: number): number | null {
  if (!planned) return null;
  return Math.round((actual / planned) * 1000) / 10;
}

export function supportEndDate(signoff?: string | null, supportDays?: number | null): string | null {
  if (!signoff || supportDays == null || Number.isNaN(Number(supportDays))) return null;
  return addDays(signoff, Number(supportDays));
}

export function supportStatus(input: {
  category: string;
  signoff?: string | null;
  supportDays?: number | null;
  today: string;
}): string {
  if (input.category !== 'delivered') return '—';
  const end = supportEndDate(input.signoff, input.supportDays);
  if (!end) return 'Delivered';
  const days = daysBetween(input.today, end);
  if (days < 0) return 'Support Ended';
  if (days <= 15) return 'Support Ending Soon';
  return 'In Support';
}

export function projectHealth(input: {
  category: string;
  effectiveEnd?: string | null;
  updatedToday: boolean;
  latestRag?: string | null;
  today: string;
  support?: string;
}): string {
  if (input.category === 'on_hold') return 'On Hold';
  if (input.category === 'cancelled') return 'Cancelled';
  if (input.category === 'delivered') return input.support && input.support !== '—' ? input.support : 'Delivered';
  if (input.category === 'ongoing') {
    if (input.effectiveEnd && input.effectiveEnd < input.today) return 'Overdue';
    if (!input.updatedToday) return 'Update Pending';
    if (input.latestRag === 'red') return 'At Risk';
    if (input.latestRag === 'amber') return 'Watch';
    return 'On Track';
  }
  if (!input.updatedToday) return 'Update Pending';
  if (input.latestRag === 'red') return 'At Risk';
  if (input.latestRag === 'amber') return 'Watch';
  return 'Planned';
}

export function onboardingReadiness(values: Record<string, string | null | undefined>) {
  let yes = 0;
  let na = 0;
  for (const key of CHECKLIST_KEYS) {
    const value = String(values[key] || 'not_filled');
    if (value === 'yes') yes += 1;
    if (value === 'na') na += 1;
  }
  const denom = CHECKLIST_KEYS.length - na;
  const percent = denom <= 0 ? 100 : Math.round((yes / denom) * 1000) / 10;
  const status = percent >= 100 ? 'Ready' : yes === 0 ? 'Not Ready' : 'Incomplete';
  return { percent, status, yes, na, applicable: denom };
}

export function riskScore(likelihood: number, impact: number): number {
  return Number(likelihood) * Number(impact);
}

export function riskLevel(score: number): 'Low' | 'Medium' | 'High' | 'Critical' {
  if (score >= 17) return 'Critical';
  if (score >= 10) return 'High';
  if (score >= 5) return 'Medium';
  return 'Low';
}

export function backupStatus(input: {
  status?: string | null;
  frequency?: string | null;
  lastSuccessful?: string | null;
  nextRestoreTest?: string | null;
  restoreResult?: string | null;
  today: string;
}): string {
  const status = String(input.status || '').toLowerCase();
  if (status === 'disabled') return 'Disabled';
  if (status === 'failed' || String(input.restoreResult || '').toLowerCase() === 'failed') return 'Failed';
  if (input.nextRestoreTest && input.nextRestoreTest < input.today) return 'Restore Test Due';
  const window = input.frequency === 'daily' ? 2 : input.frequency === 'weekly' ? 8 : 35;
  if (input.lastSuccessful && daysBetween(input.lastSuccessful, input.today) > window) return 'Backup Overdue';
  if (!input.lastSuccessful) return 'Backup Overdue';
  return 'Healthy';
}

export function isOverdue(due: string | null | undefined, today: string, closed: boolean): boolean {
  return Boolean(due && due < today && !closed);
}

export function controlDueStatus(input: {
  frequency: string;
  lastChecked?: string | null;
  status?: string | null;
  today: string;
}): 'Current' | 'Due Soon' | 'Overdue' | 'Not Checked' | 'N/A' {
  const frequency = input.frequency;
  if (['per_event', 'per_change', 'on_joining', 'on_exit', 'custom'].includes(frequency)) return 'N/A';
  if (input.status === 'na') return 'N/A';
  if (!input.lastChecked || input.status === 'not_checked') return 'Not Checked';
  const windows: Record<string, number> = { monthly: 30, quarterly: 90, annual: 365 };
  const window = windows[frequency];
  if (!window) return 'N/A';
  const age = daysBetween(input.lastChecked, input.today);
  if (age > window) return 'Overdue';
  if (age > window - Math.min(7, Math.floor(window / 5))) return 'Due Soon';
  return 'Current';
}

export function validateDailyUpdate(input: {
  category: string;
  rag?: string | null;
  completion?: number | null;
  workDone?: string | null;
  planToday?: string | null;
  blocker?: string | null;
  blockerOwner?: string | null;
  nextAction?: string | null;
  actionOwner?: string | null;
  escalate?: boolean;
}) {
  const issues: string[] = [];
  const tracked = input.category === 'ongoing' || input.category === 'planned_to_onboard';
  if (input.category === 'ongoing' || tracked) {
    if (input.category === 'ongoing') {
      if (!input.rag) issues.push('RAG is required');
      if (input.completion == null || Number.isNaN(Number(input.completion))) issues.push('Completion % is required');
      if (!String(input.workDone || '').trim()) issues.push('Work done is required');
      if (!String(input.planToday || '').trim()) issues.push('Plan for today is required');
    }
  }
  if (input.completion != null && (Number(input.completion) < 0 || Number(input.completion) > 100)) {
    issues.push('Completion % must be between 0 and 100');
  }
  if (input.rag === 'amber' || input.rag === 'red') {
    if (!String(input.blocker || '').trim()) issues.push('Blocker / risk is required');
    if (!input.blockerOwner) issues.push('Blocker owner is required');
  }
  if (input.rag === 'red') {
    if (!String(input.nextAction || '').trim()) issues.push('Next action is required');
    if (!input.actionOwner) issues.push('Action owner is required');
  }
  const escalate = input.rag === 'red' ? true : Boolean(input.escalate);
  return { ok: issues.length === 0, issues, escalate };
}

const EXPECTED_REPORTS: Record<string, string> = {
  sr_software_engineer: 'manager',
  full_stack_developer: 'sr_software_engineer',
  jr_full_stack_developer: 'full_stack_developer',
  account_manager: 'manager',
};

export function hierarchyStatus(role: string, reportsToRole?: string | null): 'OK' | 'Missing' | 'Check' {
  const expected = EXPECTED_REPORTS[role];
  if (!expected) return 'OK';
  if (!reportsToRole) return 'Missing';
  return reportsToRole === expected ? 'OK' : 'Check';
}

export function requiresDailyUpdate(category: string): boolean {
  return category === 'ongoing' || category === 'planned_to_onboard' || category === 'onboarded';
}

export type StaffSlot = 'account_manager' | 'lead' | 'developer';

export function staffSlot(input: { project_role?: string | null; designation?: string | null; department?: string | null }): StaffSlot | null {
  const role = String(input.project_role || '');
  const text = `${input.designation || ''} ${input.department || ''}`.toLowerCase();
  if (role === 'account_manager' || /\baccount\s*manager\b/.test(text)) return 'account_manager';
  if (role === 'sr_software_engineer' || role === 'manager' || /\b(project lead|tech lead|technical lead|team lead|lead)\b/.test(text) || /\bsr\.?\s*software\b|\bsenior software\b/.test(text)) return 'lead';
  if (role === 'full_stack_developer' || role === 'jr_full_stack_developer' || /\bdeveloper\b|\bengineer\b/.test(text)) return 'developer';
  return null;
}
