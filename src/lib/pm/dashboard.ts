import { backupStatus, controlDueStatus, isOverdue, onboardingReadiness, projectHealth, riskLevel, riskScore, supportStatus, todayInKolkata } from './calculate';
import { decorateProject } from './projects';
import { q } from '@/lib/finance/db';

function num(value: unknown) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function flag(value: unknown) {
  return value === true || value === 't' || String(value) === 'true';
}

export async function projectDashboard() {
  const today = todayInKolkata();
  const { rows } = await q(
    undefined,
    `SELECT p.*, c.name AS client_name, ph.name AS phase_name,
            am.full_name AS account_manager_name, se.full_name AS sr_engineer_name,
            ld.full_name AS lead_developer_name, j1.full_name AS junior_1_name, j2.full_name AS junior_2_name,
            u.rag AS latest_rag, u.completion_percent, u.update_date AS last_update_date,
            u.blockers, u.next_action, u.action_due_date, u.escalate, ao.full_name AS action_owner_name,
            COALESCE(h.hours,0)::text AS logged_hours,
            EXISTS (SELECT 1 FROM project_management_daily_updates t WHERE t.project_id=p.id AND t.update_date=$1) AS updated_today
     FROM project_management_projects p
     LEFT JOIN ops_clients c ON c.id = p.client_id
     LEFT JOIN project_management_phases ph ON ph.id = p.phase_id
     LEFT JOIN finance_employees am ON am.id = p.account_manager_id
     LEFT JOIN finance_employees se ON se.id = p.sr_engineer_id
     LEFT JOIN finance_employees ld ON ld.id = p.lead_developer_id
     LEFT JOIN finance_employees j1 ON j1.id = p.junior_developer_1_id
     LEFT JOIN finance_employees j2 ON j2.id = p.junior_developer_2_id
     LEFT JOIN finance_employees ao ON ao.id = (
       SELECT action_owner_id FROM project_management_daily_updates WHERE project_id=p.id ORDER BY update_date DESC LIMIT 1
     )
     LEFT JOIN LATERAL (
       SELECT rag, completion_percent, update_date, blockers, next_action, action_due_date, escalate
       FROM project_management_daily_updates WHERE project_id=p.id ORDER BY update_date DESC LIMIT 1
     ) u ON TRUE
     LEFT JOIN LATERAL (
       SELECT SUM(team_hours) AS hours FROM project_management_daily_updates WHERE project_id=p.id
     ) h ON TRUE
     WHERE p.archived_at IS NULL
     ORDER BY p.project_code`,
    [today]
  );
  const projects = rows.map((row) => decorateProject(row, {
    loggedHours: num(row.logged_hours),
    latest: { rag: row.latest_rag, completion_percent: row.completion_percent, update_date: row.last_update_date, blockers: row.blockers, next_action: row.next_action, action_due_date: row.action_due_date, escalate: row.escalate },
    updatedToday: flag(row.updated_today),
    today,
  }));
  const count = (category: string) => projects.filter((row) => row.category === category).length;
  const needing = projects.filter((row) => row.category === 'ongoing' || row.category === 'planned_to_onboard' || row.category === 'onboarded');
  const updated = needing.filter((row) => flag(row.updated_today)).length;
  const attention = projects.filter((row) => row.latest_rag === 'red' || row.health === 'Overdue' || flag(row.escalate));
  const managers = new Map<string, { name: string; ongoing: number; planned: number; delivered: number; red: number; pending: number; total: number }>();
  for (const row of projects) {
    const key = String(row.account_manager_id || 'unassigned');
    const current = managers.get(key) || {
      name: String(row.account_manager_name || 'Unassigned'),
      ongoing: 0, planned: 0, delivered: 0, red: 0, pending: 0, total: 0,
    };
    current.total += 1;
    if (row.category === 'ongoing') current.ongoing += 1;
    if (row.category === 'planned_to_onboard') current.planned += 1;
    if (row.category === 'delivered') current.delivered += 1;
    if (row.latest_rag === 'red') current.red += 1;
    if (row.health === 'Update Pending') current.pending += 1;
    managers.set(key, current);
  }
  const load = new Map<string, { name: string; role: string; count: number }>();
  const addLoad = (id: unknown, name: unknown, role: string) => {
    if (!id) return;
    const current = load.get(String(id)) || { name: String(name || 'Employee'), role, count: 0 };
    current.count += 1;
    load.set(String(id), current);
  };
  for (const row of projects.filter((item) => item.category === 'ongoing')) {
    addLoad(row.account_manager_id, row.account_manager_name, 'Account Manager');
    addLoad(row.sr_engineer_id, row.sr_engineer_name, 'Sr Software Engineer');
    addLoad(row.lead_developer_id, row.lead_developer_name, 'Lead Developer');
    addLoad(row.junior_developer_1_id, row.junior_1_name, 'Junior Developer');
    addLoad(row.junior_developer_2_id, row.junior_2_name, 'Junior Developer');
  }
  return {
    today,
    portfolio: {
      total: projects.length,
      ongoing: count('ongoing'),
      planned: count('planned_to_onboard'),
      onboarded: count('onboarded'),
      delivered: count('delivered'),
      onHold: count('on_hold'),
      cancelled: count('cancelled'),
    },
    compliance: {
      requiring: needing.length,
      updated,
      pending: needing.length - updated,
      percent: needing.length ? Math.round((updated / needing.length) * 1000) / 10 : 100,
    },
    health: {
      green: projects.filter((row) => row.latest_rag === 'green').length,
      amber: projects.filter((row) => row.latest_rag === 'amber').length,
      red: projects.filter((row) => row.latest_rag === 'red').length,
      overdue: projects.filter((row) => row.health === 'Overdue').length,
      pending: projects.filter((row) => row.health === 'Update Pending').length,
      escalations: projects.filter((row) => flag(row.escalate)).length,
    },
    support: {
      inSupport: projects.filter((row) => row.support_status === 'In Support').length,
      endingSoon: projects.filter((row) => row.support_status === 'Support Ending Soon').length,
      ended: projects.filter((row) => row.support_status === 'Support Ended').length,
    },
    attention,
    ongoing: projects.filter((row) => row.category === 'ongoing'),
    managers: [...managers.values()],
    teamLoad: [...load.values()],
    operations: await operationalCounts(today, projects),
    activity: (await q(undefined, `SELECT id, entity_type, action, created_at FROM project_management_audit_logs ORDER BY created_at DESC LIMIT 12`)).rows,
    alerts: [
      ...projects.filter((row) => row.health === 'Update Pending').map((row) => ({ kind: 'Daily Update Pending', project: row.project_name, detail: row.project_code })),
      ...projects.filter((row) => row.latest_rag === 'red').map((row) => ({ kind: 'Red Project', project: row.project_name, detail: row.blockers })),
      ...projects.filter((row) => row.health === 'Overdue').map((row) => ({ kind: 'Project Overdue', project: row.project_name, detail: row.effective_end })),
      ...projects.filter((row) => row.milestone_due_date && String(row.milestone_due_date) < today && row.category === 'ongoing').map((row) => ({ kind: 'Milestone Overdue', project: row.project_name, detail: row.next_milestone })),
      ...projects.filter((row) => row.support_status === 'Support Ending Soon').map((row) => ({ kind: 'Support Ending Soon', project: row.project_name, detail: row.support_end })),
    ],
  };
}

async function operationalCounts(today: string, projects: Record<string, any>[]) {
  const openTicketStatuses = `('open','assigned','in_progress','waiting_for_client','blocked','testing','reopened','client_review')`;
  const pendingRequirement = `status NOT IN ('accepted','rejected','implemented','tested')`;
  const openTickets = await count(`SELECT COUNT(*)::text AS c FROM project_management_tickets WHERE status IN ${openTicketStatuses}`);
  const highTickets = await count(`SELECT COUNT(*)::text AS c FROM project_management_tickets WHERE status IN ${openTicketStatuses} AND priority IN ('critical','high')`);
  const blockedTickets = await count(`SELECT COUNT(*)::text AS c FROM project_management_tickets WHERE status IN ('blocked','waiting_for_client')`);
  const pendingRequirements = await count(`SELECT COUNT(*)::text AS c FROM project_management_requirements WHERE ${pendingRequirement}`);
  const awaitingApproval = await count(`SELECT COUNT(*)::text AS c FROM project_management_requirements WHERE client_approval_status='pending'`);
  const activeMembers = await count(`SELECT COUNT(DISTINCT employee_id)::text AS c FROM project_management_allocations WHERE status='active'`);
  const allocatedEmployees = activeMembers;
  const employees = await count(`SELECT COUNT(*)::text AS c FROM finance_employees WHERE status='active'`);
  const overloaded = await count(
    `SELECT COUNT(*)::text AS c FROM (
       SELECT employee_id FROM project_management_allocations
       WHERE status='active' AND (end_date IS NULL OR end_date >= $1::date)
       GROUP BY employee_id HAVING SUM(allocation_percent) > 100
     ) x`,
    [today]
  );
  const onboarding = await q(undefined, `SELECT o.*, p.category FROM project_management_onboarding o JOIN project_management_projects p ON p.id=o.project_id WHERE p.archived_at IS NULL AND p.category='planned_to_onboard'`);
  const readiness = onboarding.rows.map((row) => onboardingReadiness(row).status);
  return {
    atRisk: projects.filter((row) => row.health === 'At Risk' || row.latest_rag === 'red').length,
    overdue: projects.filter((row) => row.health === 'Overdue').length,
    updatePending: projects.filter((row) => row.health === 'Update Pending').length,
    openTickets,
    pendingRequirements,
    highTickets,
    blockedTickets,
    awaitingApproval,
    activeMembers,
    allocatedEmployees,
    unallocated: Math.max(0, employees - allocatedEmployees),
    overloaded,
    missingLead: projects.filter((row) => row.category === 'ongoing' && !row.lead_developer_id).length,
    onboardingReady: readiness.filter((status) => status === 'Ready').length,
    onboardingIncomplete: readiness.filter((status) => status === 'Incomplete').length,
    onboardingNotReady: readiness.filter((status) => status === 'Not Ready').length,
    approachingDeadline: projects.filter((row) => row.category === 'ongoing' && row.days_to_deadline != null && row.days_to_deadline >= 0 && row.days_to_deadline <= 14).length,
    inSupport: projects.filter((row) => row.support_status === 'In Support' || row.support_status === 'Support Ending Soon').length,
  };
}

async function count(sql: string, params: unknown[] = []) {
  const { rows } = await q<{ c: string }>(undefined, sql, params);
  return Number(rows[0]?.c || 0);
}

export async function processDashboard(projectId?: string) {
  const today = todayInKolkata();
  const projectClause = projectId ? ' AND project_id = $1' : '';
  const params = projectId ? [projectId] : [];
  const backups = await q(undefined, `SELECT * FROM process_backups WHERE 1=1${projectClause}`, params);
  const backupIssues = backups.rows.filter((row) => backupStatus({
    status: row.status as string,
    frequency: row.frequency as string,
    lastSuccessful: row.last_successful as string,
    nextRestoreTest: row.next_restore_test as string,
    restoreResult: row.restore_result as string,
    today,
  }) !== 'Healthy').length;
  const controls = await q(undefined, 'SELECT * FROM process_controls');
  const controlStates = controls.rows.map((row) => controlDueStatus({
    frequency: String(row.frequency),
    lastChecked: row.last_checked as string,
    status: row.current_status as string,
    today,
  }));
  const controlDue = controlStates.filter((status) => ['Due Soon', 'Overdue', 'Not Checked'].includes(status)).length;
  const controlOverdue = controlStates.filter((status) => status === 'Overdue').length;
  const review = async (label: string, done: boolean, overdue: boolean) => ({
    label,
    status: overdue ? 'Overdue' : done ? 'Complete' : 'Pending',
  });
  const accessDue = await count(`SELECT COUNT(*)::text AS c FROM process_access_records WHERE status='active' AND (last_review IS NULL OR last_review < $1::date - 30)${projectId ? ' AND project_id=$2' : ''}`, projectId ? [today, projectId] : [today]);
  const openIncidents = await count(`SELECT COUNT(*)::text AS c FROM process_incidents WHERE status<>'closed'${projectClause}`, params);
  const criticalVulns = await count(`SELECT COUNT(*)::text AS c FROM process_vulnerabilities WHERE status IN ('open','in_progress') AND severity IN ('critical','high')${projectClause}`, params);
  const openRisks = await count(`SELECT COUNT(*)::text AS c FROM process_risks WHERE status IN ('open','treating')${projectClause}`, params);
  const pendingActions = await count(`SELECT COUNT(*)::text AS c FROM process_corrective_actions WHERE status<>'closed'${projectClause}`, params);
  const overdueActions = await count(`SELECT COUNT(*)::text AS c FROM process_corrective_actions WHERE status<>'closed' AND due_date < $1${projectId ? ' AND project_id=$2' : ''}`, projectId ? [today, projectId] : [today]);
  const openJl = await count(`SELECT COUNT(*)::text AS c FROM process_joiner_leaver WHERE completion_status<>'complete'`);
  return {
    today,
    counts: {
      assignedAssets: await count(`SELECT COUNT(*)::text AS c FROM process_assets WHERE status='assigned'`),
      activeAccess: await count(`SELECT COUNT(*)::text AS c FROM process_access_records WHERE status='active'${projectClause}`, params),
      activeServers: await count(`SELECT COUNT(*)::text AS c FROM process_servers WHERE status='active'${projectClause}`, params),
      openIncidents,
      openVulnerabilities: await count(`SELECT COUNT(*)::text AS c FROM process_vulnerabilities WHERE status IN ('open','in_progress')${projectClause}`, params),
      openRisks,
      pendingActions,
      training: await count('SELECT COUNT(*)::text AS c FROM process_training_sessions'),
      backupIssues,
      accessReviewsDue: accessDue,
      controlChecksDue: controlDue,
    },
    monthly: [
      await review('Access Review', accessDue === 0, accessDue > 0),
      await review('Critical Backups', backupIssues === 0, backupIssues > 0),
      await review('Open Incidents', openIncidents === 0, false),
      await review('Critical Vulnerabilities', criticalVulns === 0, criticalVulns > 0),
      await review('Risk Register Review', openRisks === 0, false),
      await review('Joiner/Leaver Completion', openJl === 0, false),
      await review('Corrective Actions', overdueActions === 0, overdueActions > 0),
      await review('Control Checklist', controlDue === 0, controlOverdue > 0),
    ],
    alerts: [
      ...(accessDue ? [{ kind: 'Access Review Due', detail: `${accessDue} active records` }] : []),
      ...(backupIssues ? [{ kind: 'Backup Failed or Overdue', detail: `${backupIssues} records` }] : []),
      ...(criticalVulns ? [{ kind: 'High/Critical Vulnerability Open', detail: `${criticalVulns} records` }] : []),
      ...(openIncidents ? [{ kind: 'Incident Open', detail: `${openIncidents} records` }] : []),
      ...(overdueActions ? [{ kind: 'Corrective Action Overdue', detail: `${overdueActions} records` }] : []),
      ...(controlOverdue ? [{ kind: 'Control Check Overdue', detail: `${controlOverdue} checks` }] : []),
    ],
  };
}

export function decorateRegisterRow(table: string, row: Record<string, unknown>, today = todayInKolkata()) {
  if (table === 'process_risks') {
    const score = riskScore(num(row.likelihood), num(row.impact));
    const residual = row.residual_likelihood && row.residual_impact ? riskScore(num(row.residual_likelihood), num(row.residual_impact)) : null;
    return { ...row, risk_score: score, risk_level: riskLevel(score), residual_score: residual, residual_level: residual == null ? null : riskLevel(residual) };
  }
  if (table === 'process_backups') {
    return { ...row, computed_status: backupStatus({
      status: row.status as string, frequency: row.frequency as string, lastSuccessful: row.last_successful as string,
      nextRestoreTest: row.next_restore_test as string, restoreResult: row.restore_result as string, today,
    }) };
  }
  if (table === 'process_controls') {
    return { ...row, due_status: controlDueStatus({
      frequency: String(row.frequency || ''), lastChecked: row.last_checked as string, status: row.current_status as string, today,
    }) };
  }
  if (table === 'process_vulnerabilities') {
    return { ...row, overdue: isOverdue(row.target_fix_date as string, today, !['open', 'in_progress'].includes(String(row.status))) };
  }
  if (table === 'process_corrective_actions') {
    return { ...row, overdue: isOverdue(row.due_date as string, today, row.status === 'closed') };
  }
  if (table === 'project_management_projects') {
    return { ...row, support_status: supportStatus({ category: String(row.category), signoff: row.signoff_date as string, supportDays: row.support_days as number, today }) };
  }
  return row;
}

export { projectHealth };
