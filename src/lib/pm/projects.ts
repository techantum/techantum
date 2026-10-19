import { syncProjectDevelopers } from './allocations';
import { writePmAudit } from './audit';
import {
  actualHours,
  daysToDeadline,
  effectiveEnd,
  hoursUsedPercent,
  hoursVariance,
  onboardingReadiness,
  PROJECT_CATEGORIES,
  projectHealth,
  staffSlot,
  supportEndDate,
  supportStatus,
  todayInKolkata,
  type StaffSlot,
} from './calculate';
import { listProjectFiles } from './project-files';
import { q, withFinanceTx } from '@/lib/finance/db';
import { FinanceConflictError, FinanceNotFoundError, FinanceValidationError } from '@/lib/finance/errors';

const PROJECT_FIELDS = `
  p.*, c.name AS client_name, ty.name AS type_name, ph.name AS phase_name,
  am.full_name AS account_manager_name, se.full_name AS sr_engineer_name,
  ld.full_name AS lead_developer_name, j1.full_name AS junior_1_name, j2.full_name AS junior_2_name
`;

const JOINS = `
  FROM project_management_projects p
  LEFT JOIN ops_clients c ON c.id = p.client_id
  LEFT JOIN project_management_project_types ty ON ty.id = p.project_type_id
  LEFT JOIN project_management_phases ph ON ph.id = p.phase_id
  LEFT JOIN finance_employees am ON am.id = p.account_manager_id
  LEFT JOIN finance_employees se ON se.id = p.sr_engineer_id
  LEFT JOIN finance_employees ld ON ld.id = p.lead_developer_id
  LEFT JOIN finance_employees j1 ON j1.id = p.junior_developer_1_id
  LEFT JOIN finance_employees j2 ON j2.id = p.junior_developer_2_id
`;

function num(value: unknown) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

export function decorateProject(row: Record<string, any>, extras: {
  loggedHours?: number;
  latest?: Record<string, unknown> | null;
  updatedToday?: boolean;
  today?: string;
}): Record<string, any> {
  const today = extras.today || todayInKolkata();
  const end = effectiveEnd(row.planned_end_date as string | null, row.revised_end_date as string | null);
  const supportEnd = supportEndDate(row.signoff_date as string | null, row.support_days as number | null);
  const support = supportStatus({
    category: String(row.category),
    signoff: row.signoff_date as string | null,
    supportDays: row.support_days as number | null,
    today,
  });
  const actual = actualHours(num(row.hours_before_tracker), [num(extras.loggedHours)]);
  const planned = num(row.planned_hours);
  const latest = extras.latest;
  return {
    ...row,
    effective_end: end,
    days_to_deadline: row.category === 'ongoing' ? daysToDeadline(end, today) : null,
    support_end: supportEnd,
    support_status: support,
    actual_hours: actual,
    hours_variance: hoursVariance(actual, planned),
    hours_used_percent: hoursUsedPercent(actual, planned),
    latest_rag: latest?.rag || null,
    completion_percent: latest?.completion_percent ?? null,
    last_update: latest?.update_date || null,
    latest_update: latest,
    health: projectHealth({
      category: String(row.category),
      effectiveEnd: end,
      updatedToday: Boolean(extras.updatedToday),
      latestRag: latest?.rag as string | null,
      today,
      support,
    }),
  };
}

async function latestUpdate(projectId: string) {
  const { rows } = await q(
    undefined,
    `SELECT d.*, bo.full_name AS blocker_owner_name, ao.full_name AS action_owner_name
     FROM project_management_daily_updates d
     LEFT JOIN finance_employees bo ON bo.id = d.blocker_owner_id
     LEFT JOIN finance_employees ao ON ao.id = d.action_owner_id
     WHERE d.project_id = $1
     ORDER BY d.update_date DESC LIMIT 1`,
    [projectId]
  );
  return rows[0] || null;
}

async function loggedHours(projectId: string) {
  const { rows } = await q<{ hours: string }>(
    undefined,
    `SELECT COALESCE(SUM(team_hours),0)::text AS hours FROM project_management_daily_updates WHERE project_id = $1`,
    [projectId]
  );
  return num(rows[0]?.hours);
}

export async function listProjects(params: {
  q?: string;
  category?: string;
  typeId?: string;
  accountManagerId?: string;
  srEngineerId?: string;
  leadDeveloperId?: string;
  juniorId?: string;
  rag?: string;
  priority?: string;
  phaseId?: string;
  health?: string;
  includeArchived?: boolean;
  page?: number;
  pageSize?: number;
}) {
  const today = todayInKolkata();
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize || 25));
  const where: string[] = [];
  const values: unknown[] = [];
  if (!params.includeArchived) where.push('p.archived_at IS NULL');
  const add = (sql: string, ...args: unknown[]) => {
    where.push(sql.replace(/\?/g, () => `$${values.push(args.shift() as unknown)}`));
  };
  if (params.category) add('p.category = ?', params.category);
  if (params.typeId) add('p.project_type_id = ?', params.typeId);
  if (params.accountManagerId) add('p.account_manager_id = ?', params.accountManagerId);
  if (params.srEngineerId) add('p.sr_engineer_id = ?', params.srEngineerId);
  if (params.leadDeveloperId) add('p.lead_developer_id = ?', params.leadDeveloperId);
  if (params.juniorId) add('(p.junior_developer_1_id = ? OR p.junior_developer_2_id = ?)', params.juniorId, params.juniorId);
  if (params.priority) add('p.priority = ?', params.priority);
  if (params.phaseId) add('p.phase_id = ?', params.phaseId);
  if (params.q) add('(p.project_code ILIKE ? OR p.project_name ILIKE ? OR c.name ILIKE ?)', `%${params.q}%`, `%${params.q}%`, `%${params.q}%`);
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const { rows } = await q(
    undefined,
    `SELECT ${PROJECT_FIELDS},
            u.rag AS latest_rag, u.completion_percent, u.update_date AS last_update_date,
            COALESCE(h.hours,0)::text AS logged_hours,
            EXISTS (SELECT 1 FROM project_management_daily_updates t WHERE t.project_id = p.id AND t.update_date = $${values.length + 1}) AS updated_today,
            (SELECT COUNT(*) FROM project_management_allocations a WHERE a.project_id = p.id AND a.status = 'active')::int AS team_size,
            (SELECT COUNT(*) FROM project_management_tickets tk WHERE tk.project_id = p.id AND tk.status NOT IN ('completed','cancelled','closed','resolved'))::int AS open_tickets,
            (SELECT COUNT(*) FROM project_management_requirements rq WHERE rq.project_id = p.id AND rq.status NOT IN ('accepted','rejected','implemented','tested'))::int AS pending_requirements
     ${JOINS}
     LEFT JOIN LATERAL (
       SELECT rag, completion_percent, update_date FROM project_management_daily_updates
       WHERE project_id = p.id ORDER BY update_date DESC LIMIT 1
     ) u ON TRUE
     LEFT JOIN LATERAL (
       SELECT SUM(team_hours) AS hours FROM project_management_daily_updates WHERE project_id = p.id
     ) h ON TRUE
     ${clause}
     ORDER BY p.created_at DESC
     LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
    [...values, today]
  );
  let decorated = rows.map((row) => decorateProject(row, {
    loggedHours: num(row.logged_hours),
    latest: { rag: row.latest_rag, completion_percent: row.completion_percent, update_date: row.last_update_date },
    updatedToday: row.updated_today === true || row.updated_today === 't' || String(row.updated_today) === 'true',
    today,
  }));
  if (params.rag) decorated = decorated.filter((row) => row.latest_rag === params.rag);
  if (params.health) decorated = decorated.filter((row) => row.health === params.health);
  const count = await q<{ count: string }>(undefined, `SELECT COUNT(*)::text AS count ${JOINS} ${clause}`, values);
  return { rows: decorated, total: Number(count.rows[0]?.count || 0), page, pageSize, today };
}

export async function getProject(id: string) {
  const today = todayInKolkata();
  const { rows } = await q(undefined, `SELECT ${PROJECT_FIELDS} ${JOINS} WHERE p.id = $1`, [id]);
  if (!rows[0]) throw new FinanceNotFoundError('Project not found');
  const latest = await latestUpdate(id);
  const hours = await loggedHours(id);
  const updated = await q(undefined, `SELECT 1 FROM project_management_daily_updates WHERE project_id=$1 AND update_date=$2`, [id, today]);
  const onboarding = await q(undefined, 'SELECT * FROM project_management_onboarding WHERE project_id=$1', [id]);
  const updates = await q(
    undefined,
    `SELECT d.*, bo.full_name AS blocker_owner_name, ao.full_name AS action_owner_name
     FROM project_management_daily_updates d
     LEFT JOIN finance_employees bo ON bo.id = d.blocker_owner_id
     LEFT JOIN finance_employees ao ON ao.id = d.action_owner_id
     WHERE d.project_id=$1 ORDER BY d.update_date DESC LIMIT 30`,
    [id]
  );
  const changes = await q(undefined, `SELECT id, code, environment, status, implementation_date, description FROM process_changes WHERE project_id=$1 ORDER BY request_date DESC NULLS LAST`, [id]);
  const snapshot = await operationalSnapshot(id);
  const team = await q(undefined, `SELECT a.*, e.full_name, e.department, e.designation, e.status AS employee_status, r.name AS role_name FROM project_management_allocations a JOIN finance_employees e ON e.id=a.employee_id LEFT JOIN project_management_roles r ON r.id=a.role_id WHERE a.project_id=$1 ORDER BY a.status, e.full_name`, [id]);
  const tickets = await q(undefined, `SELECT id, ticket_code, title, ticket_type, status, priority, due_date FROM project_management_tickets WHERE project_id=$1 ORDER BY created_at DESC`, [id]);
  const requirements = await q(undefined, `SELECT id, requirement_code, title, module_name, status, priority, client_approval_status FROM project_management_requirements WHERE project_id=$1 ORDER BY created_at DESC`, [id]);
  const files = await listProjectFiles(id);
  const activity = await q(undefined, `SELECT id, entity_type, action, created_at FROM project_management_audit_logs WHERE project_id=$1 OR entity_id=$1 ORDER BY created_at DESC LIMIT 40`, [id]);
  const project = decorateProject(rows[0], { loggedHours: hours, latest, updatedToday: Boolean(updated.rows[0]), today });
  const openTickets = tickets.rows.filter((row) => !['completed', 'cancelled', 'closed', 'resolved'].includes(String(row.status)));
  return {
    project,
    onboarding: onboarding.rows[0] ? { ...onboarding.rows[0], readiness: onboardingReadiness(onboarding.rows[0]) } : null,
    updates: updates.rows,
    changes: changes.rows,
    snapshot,
    risks: snapshot.risks,
    team: team.rows,
    tickets: tickets.rows,
    ticketSummary: {
      open: openTickets.filter((row) => ['open', 'assigned', 'reopened'].includes(String(row.status))).length,
      inProgress: openTickets.filter((row) => ['in_progress', 'testing', 'client_review'].includes(String(row.status))).length,
      blocked: openTickets.filter((row) => row.status === 'blocked' || row.status === 'waiting_for_client').length,
      overdue: openTickets.filter((row) => row.due_date && String(row.due_date) < today).length,
      closed: tickets.rows.length - openTickets.length,
    },
    requirements: requirements.rows,
    files,
    requirementSummary: {
      total: requirements.rows.length,
      approved: requirements.rows.filter((row) => ['approved', 'in_development', 'implemented', 'tested', 'accepted'].includes(String(row.status))).length,
      inDevelopment: requirements.rows.filter((row) => row.status === 'in_development').length,
      implemented: requirements.rows.filter((row) => ['implemented', 'tested', 'accepted'].includes(String(row.status))).length,
      pending: requirements.rows.filter((row) => !['accepted', 'rejected', 'implemented', 'tested'].includes(String(row.status))).length,
    },
    activity: activity.rows,
  };
}

export async function operationalSnapshot(projectId: string) {
  const today = todayInKolkata();
  const access = await q<{ c: string }>(undefined, `SELECT COUNT(*)::text AS c FROM process_access_records WHERE project_id=$1 AND status='active'`, [projectId]);
  const servers = await q<{ c: string }>(undefined, `SELECT COUNT(*)::text AS c FROM process_servers WHERE project_id=$1 AND status='active' AND environment='production'`, [projectId]);
  const incidents = await q<{ c: string }>(undefined, `SELECT COUNT(*)::text AS c FROM process_incidents WHERE project_id=$1 AND status<>'closed'`, [projectId]);
  const vulns = await q<{ c: string }>(undefined, `SELECT COUNT(*)::text AS c FROM process_vulnerabilities WHERE project_id=$1 AND status IN ('open','in_progress') AND severity IN ('critical','high')`, [projectId]);
  const risks = await q(undefined, `SELECT id, code, threat, status, likelihood, impact FROM process_risks WHERE project_id=$1 AND status IN ('open','treating') ORDER BY likelihood*impact DESC`, [projectId]);
  const changes = await q<{ c: string }>(undefined, `SELECT COUNT(*)::text AS c FROM process_changes WHERE project_id=$1 AND status IN ('requested','testing','approved','scheduled')`, [projectId]);
  const actions = await q<{ c: string }>(undefined, `SELECT COUNT(*)::text AS c FROM process_corrective_actions WHERE project_id=$1 AND status<>'closed'`, [projectId]);
  const backups = await q(undefined, `SELECT status, frequency, last_successful, next_restore_test, restore_result FROM process_backups WHERE project_id=$1`, [projectId]);
  return {
    today,
    activeAccess: Number(access.rows[0]?.c || 0),
    productionServers: Number(servers.rows[0]?.c || 0),
    openIncidents: Number(incidents.rows[0]?.c || 0),
    openHighVulnerabilities: Number(vulns.rows[0]?.c || 0),
    openRisks: risks.rows.length,
    pendingChanges: Number(changes.rows[0]?.c || 0),
    openActions: Number(actions.rows[0]?.c || 0),
    backups: backups.rows,
    risks: risks.rows,
  };
}

function cleanId(value: unknown) {
  const text = String(value || '').trim();
  return text || null;
}

function providedId(body: Record<string, unknown>, key: string, fallback: unknown) {
  return Object.prototype.hasOwnProperty.call(body, key) ? cleanId(body[key]) : cleanId(fallback);
}

function providedNum(body: Record<string, unknown>, key: string, fallback: unknown) {
  return Object.prototype.hasOwnProperty.call(body, key) ? num(body[key]) : num(fallback);
}

function assertCategory(value: unknown) {
  const category = String(value || 'planned_to_onboard');
  if (!(PROJECT_CATEGORIES as readonly string[]).includes(category)) throw new FinanceValidationError('Choose a valid project category');
  return category;
}

async function assertStaff(db: Parameters<typeof q>[0], id: string | null, slot: StaffSlot, label: string, previousId?: string | null) {
  if (!id) return null;
  const { rows } = await q(
    db,
    `SELECT e.id, e.status, e.designation, e.department, t.project_role
     FROM finance_employees e
     LEFT JOIN project_management_team_profiles t ON t.employee_id = e.id
     WHERE e.id=$1`,
    [id]
  );
  const employee = rows[0];
  if (!employee) throw new FinanceNotFoundError(`${label} was not found in HR`);
  const unchanged = Boolean(previousId && id === previousId);
  if (employee.status !== 'active' && !unchanged) throw new FinanceValidationError(`${label} must be an active employee`);
  if (staffSlot(employee) !== slot && !unchanged) throw new FinanceValidationError(`${label} must be an employee in that role`);
  return id;
}

export async function createProject(body: Record<string, unknown>, userId: string) {
  const name = String(body.project_name || '').trim();
  if (!name) throw new FinanceValidationError('Project name is required');
  if (!body.client_id) throw new FinanceValidationError('Client is required');
  const category = assertCategory(body.category);
  return withFinanceTx(async (db) => {
    const { rows: codeRows } = await q<{ pm_next_code: string }>(db, `SELECT pm_next_code('TS-P', 3)`);
    const code = codeRows[0]?.pm_next_code;
    const { rows } = await q(
      db,
      `INSERT INTO project_management_projects (
         project_code, client_id, project_name, project_type_id, category, priority,
         account_manager_id, sr_engineer_id, lead_developer_id, junior_developer_1_id, junior_developer_2_id,
         start_date, actual_start_date, planned_end_date, revised_end_date, phase_id, next_milestone, milestone_due_date,
         planned_hours, hours_before_tracker, signoff_date, support_days, notes, created_by, updated_by
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$24)
       RETURNING *`,
      [
        code, body.client_id, name, cleanId(body.project_type_id), category, body.priority || 'medium',
        await assertStaff(db, cleanId(body.account_manager_id), 'account_manager', 'Account Manager'), cleanId(body.sr_engineer_id),
        await assertStaff(db, cleanId(body.lead_developer_id), 'lead', 'Lead'),
        cleanId(body.junior_developer_1_id), cleanId(body.junior_developer_2_id),
        body.start_date || null, body.actual_start_date || null, body.planned_end_date || null, body.revised_end_date || null, cleanId(body.phase_id),
        body.next_milestone || null, body.milestone_due_date || null, num(body.planned_hours), num(body.hours_before_tracker),
        body.signoff_date || null, body.support_days === '' || body.support_days == null ? null : Number(body.support_days),
        body.notes || null, userId,
      ]
    );
    await q(db, `INSERT INTO project_management_onboarding (project_id, updated_by) VALUES ($1,$2)`, [rows[0].id, userId]);
    if (Array.isArray(body.developer_ids)) {
      const developers = body.developer_ids.map(String).filter((id) => id && id !== rows[0].lead_developer_id);
      await syncProjectDevelopers(db, rows[0].id, developers, userId);
    }
    await writePmAudit(db, { userId, entityType: 'project', entityId: rows[0].id, action: 'Create', next: rows[0] });
    return rows[0];
  });
}

export async function updateProject(id: string, body: Record<string, unknown>, userId: string) {
  return withFinanceTx(async (db) => {
    const { rows } = await q(db, 'SELECT * FROM project_management_projects WHERE id=$1 FOR UPDATE', [id]);
    const current = rows[0];
    if (!current) throw new FinanceNotFoundError('Project not found');
    if (Number(body.version) !== Number(current.version)) {
      throw new FinanceConflictError('This project was updated by someone else. Reload and try again.');
    }
    const nextCategory = body.category ? assertCategory(body.category) : String(current.category);
    if (current.category === 'planned_to_onboard' && (nextCategory === 'ongoing' || nextCategory === 'onboarded')) {
      const check = await q(db, 'SELECT * FROM project_management_onboarding WHERE project_id=$1', [id]);
      const readiness = onboardingReadiness(check.rows[0] || {});
      if (readiness.percent < 100 && !body.confirm_override) {
        throw new FinanceConflictError('Onboarding is not ready. A manager must confirm the override.');
      }
      if (readiness.percent < 100) {
        const reason = String(body.override_reason || 'Moved to ongoing before onboarding was ready');
        await q(db, `UPDATE project_management_onboarding SET override_reason=$2, override_by=$3 WHERE project_id=$1`, [id, reason, userId]);
        await writePmAudit(db, {
          userId, entityType: 'project', entityId: id, projectId: id, action: 'Override',
          next: { reason },
        });
      }
    }
    if (current.category !== 'delivered' && nextCategory === 'delivered' && !body.confirm_override) {
      const warnings = await deliveryWarnings(id, {
        ...body,
        signoff_date: Object.prototype.hasOwnProperty.call(body, 'signoff_date') ? body.signoff_date : current.signoff_date,
        support_days: Object.prototype.hasOwnProperty.call(body, 'support_days') ? body.support_days : current.support_days,
      });
      if (warnings.length) {
        throw new FinanceConflictError(`Delivery review: ${warnings.join('; ')}`);
      }
    }
    const { rows: updated } = await q(
      db,
      `UPDATE project_management_projects SET
         client_id=$2, project_name=$3, project_type_id=$4, category=$5, priority=$6,
         account_manager_id=$7, sr_engineer_id=$8, lead_developer_id=$9, junior_developer_1_id=$10, junior_developer_2_id=$11,
         start_date=$12, actual_start_date=$13, planned_end_date=$14, revised_end_date=$15, phase_id=$16, next_milestone=$17, milestone_due_date=$18,
         planned_hours=$19, hours_before_tracker=$20, signoff_date=$21, support_days=$22, notes=$23,
         closure_override=$24, version=version+1, updated_by=$25
       WHERE id=$1 RETURNING *`,
      [
        id, body.client_id || current.client_id, body.project_name || current.project_name, providedId(body, 'project_type_id', current.project_type_id),
        nextCategory, body.priority || current.priority,
        await assertStaff(db, providedId(body, 'account_manager_id', current.account_manager_id), 'account_manager', 'Account Manager', current.account_manager_id),
        providedId(body, 'sr_engineer_id', current.sr_engineer_id),
        await assertStaff(db, providedId(body, 'lead_developer_id', current.lead_developer_id), 'lead', 'Lead', current.lead_developer_id),
        providedId(body, 'junior_developer_1_id', current.junior_developer_1_id),
        providedId(body, 'junior_developer_2_id', current.junior_developer_2_id),
        body.start_date || null, body.actual_start_date || null, body.planned_end_date || null, body.revised_end_date || null, providedId(body, 'phase_id', current.phase_id),
        body.next_milestone || null, body.milestone_due_date || null, providedNum(body, 'planned_hours', current.planned_hours), providedNum(body, 'hours_before_tracker', current.hours_before_tracker),
        Object.prototype.hasOwnProperty.call(body, 'signoff_date') ? (body.signoff_date || null) : current.signoff_date,
        Object.prototype.hasOwnProperty.call(body, 'support_days') ? (body.support_days === '' || body.support_days == null ? null : Number(body.support_days)) : current.support_days,
        body.notes || null, body.confirm_override ? String(body.override_reason || 'Manager confirmed') : current.closure_override, userId,
      ]
    );
    if (Object.prototype.hasOwnProperty.call(body, 'lead_developer_id') && !updated[0].lead_developer_id) {
      throw new FinanceValidationError('Lead is required');
    }
    if (Array.isArray(body.developer_ids)) {
      const existing = await q<{ employee_id: string }>(db, `SELECT employee_id FROM project_management_allocations WHERE project_id=$1 AND status='active' AND responsibility='developer'`, [id]);
      const developers = body.developer_ids.map(String).filter((employeeId) => employeeId && employeeId !== updated[0].lead_developer_id);
      await syncProjectDevelopers(db, id, developers, userId, existing.rows.map((row) => row.employee_id));
    }
    await writePmAudit(db, { userId, entityType: 'project', entityId: id, action: 'Edit', previous: current, next: updated[0] });
    return updated[0];
  });
}

async function deliveryWarnings(id: string, body: Record<string, unknown>) {
  const warnings: string[] = [];
  if (!body.signoff_date) warnings.push('Sign-off date is missing');
  const red = await q(undefined, `SELECT 1 FROM project_management_daily_updates WHERE project_id=$1 AND rag='red' ORDER BY update_date DESC LIMIT 1`, [id]);
  if (red.rows[0]) warnings.push('Latest or recorded red status exists');
  const incident = await q(undefined, `SELECT 1 FROM process_incidents WHERE project_id=$1 AND status<>'closed' AND severity IN ('critical','high') LIMIT 1`, [id]);
  if (incident.rows[0]) warnings.push('Open critical/high incident');
  const vuln = await q(undefined, `SELECT 1 FROM process_vulnerabilities WHERE project_id=$1 AND status IN ('open','in_progress') AND severity IN ('critical','high') LIMIT 1`, [id]);
  if (vuln.rows[0]) warnings.push('Open critical/high vulnerability');
  const risk = await q(undefined, `SELECT 1 FROM process_risks WHERE project_id=$1 AND status IN ('open','treating') LIMIT 1`, [id]);
  if (risk.rows[0]) warnings.push('Open project risk');
  const change = await q(undefined, `SELECT 1 FROM process_changes WHERE project_id=$1 AND environment='production' AND status IN ('requested','testing','approved','scheduled') LIMIT 1`, [id]);
  if (change.rows[0]) warnings.push('Pending production change');
  if (body.support_days == null || body.support_days === '') warnings.push('Support days are not set');
  return warnings;
}

export async function archiveProject(id: string, userId: string) {
  const { rows } = await q(
    undefined,
    `UPDATE project_management_projects SET archived_at=NOW(), version=version+1, updated_by=$2 WHERE id=$1 AND archived_at IS NULL RETURNING *`,
    [id, userId]
  );
  if (!rows[0]) throw new FinanceNotFoundError('Project not found');
  await writePmAudit(undefined, { userId, entityType: 'project', entityId: id, action: 'Archive', next: rows[0] });
  return rows[0];
}
