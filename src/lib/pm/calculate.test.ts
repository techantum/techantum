import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  actualHours,
  backupStatus,
  controlDueStatus,
  daysToDeadline,
  effectiveEnd,
  hierarchyStatus,
  hoursUsedPercent,
  hoursVariance,
  onboardingReadiness,
  projectHealth,
  riskLevel,
  riskScore,
  supportEndDate,
  supportStatus,
  todayInKolkata,
  validateDailyUpdate,
} from './calculate.ts';

describe('project management calculations', () => {
  it('uses Asia/Kolkata for the operational date', () => {
    const lateUtc = new Date('2026-10-18T19:30:00.000Z');
    assert.equal(todayInKolkata(lateUtc), '2026-10-19');
  });

  it('prefers the revised end date and counts days to deadline', () => {
    assert.equal(effectiveEnd('2026-11-01', '2026-11-10'), '2026-11-10');
    assert.equal(daysToDeadline('2026-11-10', '2026-11-01'), 9);
    assert.equal(daysToDeadline('2026-10-01', '2026-11-01'), -31);
  });

  it('sums tracker hours without employee timesheets', () => {
    assert.equal(actualHours(10, [4, 6]), 20);
    assert.equal(hoursVariance(20, 16), 4);
    assert.equal(hoursUsedPercent(8, 16), 50);
  });

  it('calculates support windows', () => {
    assert.equal(supportEndDate('2026-10-01', 30), '2026-10-31');
    assert.equal(supportStatus({ category: 'delivered', signoff: '2026-10-01', supportDays: 30, today: '2026-10-05' }), 'In Support');
    assert.equal(supportStatus({ category: 'delivered', signoff: '2026-10-01', supportDays: 30, today: '2026-10-20' }), 'Support Ending Soon');
    assert.equal(supportStatus({ category: 'delivered', signoff: '2026-10-01', supportDays: 10, today: '2026-10-08' }), 'Support Ending Soon');
    assert.equal(supportStatus({ category: 'delivered', signoff: '2026-09-01', supportDays: 10, today: '2026-10-01' }), 'Support Ended');
  });

  it('derives project health from category, deadline, update and RAG', () => {
    assert.equal(projectHealth({ category: 'ongoing', effectiveEnd: '2026-10-01', updatedToday: true, latestRag: 'green', today: '2026-10-02' }), 'Overdue');
    assert.equal(projectHealth({ category: 'ongoing', effectiveEnd: '2026-12-01', updatedToday: false, latestRag: 'green', today: '2026-10-02' }), 'Update Pending');
    assert.equal(projectHealth({ category: 'ongoing', effectiveEnd: '2026-12-01', updatedToday: true, latestRag: 'red', today: '2026-10-02' }), 'At Risk');
    assert.equal(projectHealth({ category: 'ongoing', effectiveEnd: '2026-12-01', updatedToday: true, latestRag: 'amber', today: '2026-10-02' }), 'Watch');
    assert.equal(projectHealth({ category: 'ongoing', effectiveEnd: '2026-12-01', updatedToday: true, latestRag: 'green', today: '2026-10-02' }), 'On Track');
    assert.equal(projectHealth({ category: 'on_hold', updatedToday: false, today: '2026-10-02' }), 'On Hold');
  });

  it('scores onboarding readiness from eight controls', () => {
    const ready = onboardingReadiness({
      proposal_sent: 'yes', proposal_accepted: 'yes', scope_signed: 'yes', contract_signed: 'yes',
      advance_received: 'yes', client_inputs: 'yes', accounts_access: 'na', team_allocated: 'yes',
      environment_ready: 'yes', repository_created: 'yes', communication_channel: 'yes', kickoff_completed: 'yes',
    });
    assert.equal(ready.percent, 100);
    assert.equal(ready.status, 'Ready');
    const partial = onboardingReadiness({ proposal_sent: 'yes', proposal_accepted: 'no' });
    assert.equal(partial.status, 'Incomplete');
  });

  it('calculates risk level from likelihood times impact', () => {
    assert.equal(riskScore(4, 5), 20);
    assert.equal(riskLevel(20), 'Critical');
    assert.equal(riskLevel(12), 'High');
    assert.equal(riskLevel(6), 'Medium');
    assert.equal(riskLevel(3), 'Low');
  });

  it('flags backup and control review state', () => {
    assert.equal(backupStatus({ frequency: 'daily', lastSuccessful: '2026-10-01', today: '2026-10-10' }), 'Backup Overdue');
    assert.equal(backupStatus({ status: 'failed', today: '2026-10-10' }), 'Failed');
    assert.equal(controlDueStatus({ frequency: 'monthly', lastChecked: '2026-08-01', today: '2026-10-01' }), 'Overdue');
    assert.equal(controlDueStatus({ frequency: 'per_change', today: '2026-10-01' }), 'N/A');
    assert.equal(controlDueStatus({ frequency: 'monthly', today: '2026-10-01' }), 'Not Checked');
  });

  it('enforces daily update rules and red escalation', () => {
    const missing = validateDailyUpdate({ category: 'ongoing', rag: 'green', completion: 10, workDone: '', planToday: 'plan' });
    assert.equal(missing.ok, false);
    const red = validateDailyUpdate({
      category: 'ongoing', rag: 'red', completion: 40, workDone: 'api', planToday: 'fix',
      blocker: 'client', blockerOwner: 'e1', nextAction: 'call', actionOwner: 'e2', escalate: false,
    });
    assert.equal(red.ok, true);
    assert.equal(red.escalate, true);
  });

  it('checks the delivery hierarchy', () => {
    assert.equal(hierarchyStatus('full_stack_developer', 'sr_software_engineer'), 'OK');
    assert.equal(hierarchyStatus('account_manager', null), 'Missing');
    assert.equal(hierarchyStatus('jr_full_stack_developer', 'manager'), 'Check');
  });
});
