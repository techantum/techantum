import { writePmAudit } from './audit';
import { q, withFinanceTx } from '@/lib/finance/db';
import { FinanceNotFoundError, FinanceValidationError } from '@/lib/finance/errors';

const CATEGORIES = new Set(['business', 'functional', 'non_functional', 'technical', 'integration', 'ui_ux', 'security', 'change']);
const SOURCES = new Set(['client', 'account_manager', 'project_team', 'management', 'support', 'internal']);
const PRIORITIES = new Set(['must_have', 'should_have', 'could_have', 'future']);
const STATUSES = new Set(['draft', 'under_review', 'approved', 'in_development', 'implemented', 'tested', 'accepted', 'rejected', 'deferred']);

const SELECT = `
  SELECT r.*, p.project_code, p.project_name, c.name AS client_name,
         owner.full_name AS owner_name, owner.status AS owner_status, owner.department AS owner_department,
         requester.full_name AS requested_by_name, approver.full_name AS approved_by_name,
         ph.name AS phase_name,
         (SELECT COUNT(*) FROM project_management_tickets t WHERE t.requirement_id = r.id) AS ticket_count
  FROM project_management_requirements r
  JOIN project_management_projects p ON p.id = r.project_id
  LEFT JOIN ops_clients c ON c.id = p.client_id
  LEFT JOIN finance_employees owner ON owner.id = r.owner_employee_id
  LEFT JOIN finance_employees requester ON requester.id = r.requested_by_employee_id
  LEFT JOIN finance_employees approver ON approver.id = r.approved_by_employee_id
  LEFT JOIN project_management_phases ph ON ph.id = r.phase_id
`;

export async function listScope(filters: { projectId?: string; status?: string; priority?: string; q?: string }) {
  const where: string[] = [];
  const values: unknown[] = [];
  const add = (sql: string, ...args: unknown[]) => {
    where.push(sql.replace(/\?/g, () => `$${values.push(args.shift() as unknown)}`));
  };
  if (filters.projectId) add('r.project_id = ?', filters.projectId);
  if (filters.status) add('r.status = ?', filters.status);
  if (filters.priority) add('r.priority = ?', filters.priority);
  if (filters.q) {
    const like = `%${filters.q}%`;
    add('(r.requirement_code ILIKE ? OR r.title ILIKE ? OR r.module_name ILIKE ? OR p.project_name ILIKE ?)', like, like, like, like);
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const { rows } = await q(undefined, `${SELECT} ${clause} ORDER BY p.project_code, r.module_name NULLS FIRST, r.created_at`, values);
  return rows;
}

async function assertEmployee(id: unknown) {
  if (!id) return null;
  const { rows } = await q(undefined, `SELECT id, status FROM finance_employees WHERE id=$1`, [id]);
  if (!rows[0]) throw new FinanceNotFoundError('Employee not found in HR');
  if (rows[0].status !== 'active') throw new FinanceValidationError('Inactive employees cannot be newly assigned');
  return String(id);
}

export async function saveScope(body: Record<string, unknown>, userId: string) {
  const projectId = String(body.project_id || '');
  const title = String(body.title || '').trim();
  if (!projectId) throw new FinanceValidationError('Select an existing project');
  if (!title) throw new FinanceValidationError('Requirement title is required');
  const project = await q(undefined, `SELECT id, archived_at FROM project_management_projects WHERE id=$1`, [projectId]);
  if (!project.rows[0]) throw new FinanceNotFoundError('Project not found');
  if (project.rows[0].archived_at) throw new FinanceValidationError('Archived projects cannot receive new requirements');
  const category = CATEGORIES.has(String(body.category)) ? String(body.category) : 'functional';
  const source = SOURCES.has(String(body.source)) ? String(body.source) : 'client';
  const priority = PRIORITIES.has(String(body.priority)) ? String(body.priority) : 'must_have';
  const status = STATUSES.has(String(body.status)) ? String(body.status) : 'draft';
  const owner = await assertEmployee(body.owner_employee_id);
  const requester = await assertEmployee(body.requested_by_employee_id);
  return withFinanceTx(async (db) => {
    const code = await q<{ pm_next_code: string }>(db, `SELECT pm_next_code('REQ', 3)`);
    const { rows } = await q(
      db,
      `INSERT INTO project_management_requirements (
         requirement_code, project_id, parent_id, category, module_name, title, description, objective, source, priority, status,
         requested_by_employee_id, owner_employee_id, phase_id, target_date, acceptance_criteria, dependency,
         client_approval_required, client_approval_status, remarks, created_by, updated_by
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$21) RETURNING *`,
      [
        code.rows[0]?.pm_next_code, projectId, body.parent_id || null, category, body.module_name || null, title,
        body.description || null, body.objective || null, source, priority, status, requester, owner, body.phase_id || null,
        body.target_date || null, body.acceptance_criteria || null, body.dependency || null,
        body.client_approval_required === true || body.client_approval_required === 'true',
        body.client_approval_required ? 'pending' : 'not_required', body.remarks || null, userId,
      ]
    );
    await writePmAudit(db, { userId, entityType: 'requirement', entityId: rows[0].id, projectId, action: 'Requirement Created', next: rows[0] });
    await q(db, `INSERT INTO project_management_events (event_key, project_id, entity_type, entity_id, employee_id) VALUES ('requirement.created',$1,'requirement',$2,$3)`, [projectId, rows[0].id, owner]);
    return rows[0];
  });
}

export async function updateScope(id: string, body: Record<string, unknown>, userId: string) {
  return withFinanceTx(async (db) => {
    const current = await q(db, `SELECT * FROM project_management_requirements WHERE id=$1 FOR UPDATE`, [id]);
    if (!current.rows[0]) throw new FinanceNotFoundError('Requirement not found');
    const status = body.status && STATUSES.has(String(body.status)) ? String(body.status) : current.rows[0].status;
    const approval = body.client_approval_status ? String(body.client_approval_status) : current.rows[0].client_approval_status;
    const owner = body.owner_employee_id ? await assertEmployee(body.owner_employee_id) : current.rows[0].owner_employee_id;
    const approver = approval === 'approved' ? await assertEmployee(body.approved_by_employee_id || owner) : current.rows[0].approved_by_employee_id;
    const { rows } = await q(
      db,
      `UPDATE project_management_requirements SET
         status=$2, priority=$3, owner_employee_id=$4, client_approval_status=$5,
         approved_by_employee_id=$6, approval_date=$7, remarks=$8, version=version+1, updated_by=$9
       WHERE id=$1 RETURNING *`,
      [
        id, status, body.priority || current.rows[0].priority, owner, approval, approver,
        approval === 'approved' ? new Date().toISOString().slice(0, 10) : current.rows[0].approval_date,
        body.remarks ?? current.rows[0].remarks, userId,
      ]
    );
    const action = status !== current.rows[0].status ? 'Requirement Status Changed' : approval === 'approved' ? 'Requirement Approved' : 'Requirement Updated';
    await writePmAudit(db, { userId, entityType: 'requirement', entityId: id, projectId: current.rows[0].project_id, action, previous: current.rows[0], next: rows[0] });
    return rows[0];
  });
}
