import { writePmAudit } from './audit';
import { todayInKolkata, validateDailyUpdate } from './calculate';
import { q, withFinanceTx } from '@/lib/finance/db';
import { FinanceConflictError, FinanceNotFoundError, FinanceValidationError } from '@/lib/finance/errors';

function isUnique(err: unknown) {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code === '23505';
}

export async function todayBoard() {
  const today = todayInKolkata();
  const { rows } = await q(
    undefined,
    `SELECT p.id, p.project_code, p.project_name, p.category, c.name AS client_name, am.full_name AS account_manager_name,
            u.rag AS latest_rag, u.completion_percent, u.update_date AS last_update,
            t.id AS today_id
     FROM project_management_projects p
     LEFT JOIN ops_clients c ON c.id = p.client_id
     LEFT JOIN finance_employees am ON am.id = p.account_manager_id
     LEFT JOIN LATERAL (
       SELECT rag, completion_percent, update_date FROM project_management_daily_updates
       WHERE project_id = p.id ORDER BY update_date DESC LIMIT 1
     ) u ON TRUE
     LEFT JOIN project_management_daily_updates t ON t.project_id = p.id AND t.update_date = $1
     WHERE p.archived_at IS NULL AND p.category IN ('ongoing','planned_to_onboard','onboarded')
     ORDER BY (t.id IS NULL) DESC, p.project_code`,
    [today]
  );
  const updated = rows.filter((row) => row.today_id).length;
  return {
    today,
    rows,
    requiring: rows.length,
    updated,
    pending: rows.length - updated,
    compliance: rows.length ? Math.round((updated / rows.length) * 1000) / 10 : 100,
  };
}

export async function prefillDaily(projectId: string, date?: string) {
  const updateDate = date || todayInKolkata();
  const { rows } = await q(
    undefined,
    `SELECT plan_today, completion_percent, rag FROM project_management_daily_updates
     WHERE project_id = $1 AND update_date < $2 ORDER BY update_date DESC LIMIT 1`,
    [projectId, updateDate]
  );
  const existing = await q(undefined, `SELECT id FROM project_management_daily_updates WHERE project_id=$1 AND update_date=$2`, [projectId, updateDate]);
  return {
    update_date: updateDate,
    suggested_work_done: rows[0]?.plan_today || '',
    suggested_completion: rows[0]?.completion_percent ?? '',
    previous_rag: rows[0]?.rag || '',
    exists: Boolean(existing.rows[0]),
    existing_id: existing.rows[0]?.id || null,
  };
}

export async function saveDailyUpdate(body: Record<string, unknown>, userId: string, allowRemarks: boolean) {
  const projectId = String(body.project_id || '');
  const updateDate = String(body.update_date || todayInKolkata());
  if (!projectId) throw new FinanceValidationError('Project is required');
  const project = await q<{ category: string; archived_at: string | null }>(undefined, 'SELECT category, archived_at FROM project_management_projects WHERE id=$1', [projectId]);
  if (!project.rows[0]) throw new FinanceNotFoundError('Project not found');
  if (project.rows[0].archived_at) throw new FinanceValidationError('Archived projects are closed for new daily updates');
  const checked = validateDailyUpdate({
    category: project.rows[0].category,
    rag: body.rag ? String(body.rag) : null,
    completion: body.completion_percent === '' || body.completion_percent == null ? null : Number(body.completion_percent),
    workDone: body.work_done as string,
    planToday: body.plan_today as string,
    blocker: body.blockers as string,
    blockerOwner: body.blocker_owner_id as string,
    nextAction: body.next_action as string,
    actionOwner: body.action_owner_id as string,
    escalate: Boolean(body.escalate),
  });
  if (!checked.ok) throw new FinanceValidationError(checked.issues.join(' '));
  const values = [
    projectId,
    updateDate,
    Boolean(body.am_input_received),
    body.rag || null,
    body.completion_percent === '' || body.completion_percent == null ? null : Number(body.completion_percent),
    body.work_done || null,
    body.plan_today || null,
    Number(body.team_hours || 0),
    body.blockers || null,
    body.blocker_owner_id || null,
    body.client_dependency || null,
    body.next_action || null,
    body.action_owner_id || null,
    body.action_due_date || null,
    checked.escalate,
    allowRemarks ? body.manager_remarks || null : null,
    userId,
  ];
  try {
    return await withFinanceTx(async (db) => {
      if (body.id) {
        const current = await q(db, 'SELECT * FROM project_management_daily_updates WHERE id=$1 FOR UPDATE', [body.id]);
        if (!current.rows[0]) throw new FinanceNotFoundError('Update not found');
        if (Number(body.version) !== Number(current.rows[0].version)) {
          throw new FinanceConflictError('This update was changed by someone else. Reload and try again.');
        }
        const remarks = allowRemarks ? body.manager_remarks || null : current.rows[0].manager_remarks;
        const { rows } = await q(
          db,
          `UPDATE project_management_daily_updates SET
             am_input_received=$2, rag=$3, completion_percent=$4, work_done=$5, plan_today=$6, team_hours=$7,
             blockers=$8, blocker_owner_id=$9, client_dependency=$10, next_action=$11, action_owner_id=$12,
             action_due_date=$13, escalate=$14, manager_remarks=$15, version=version+1, updated_by=$16
           WHERE id=$1 RETURNING *`,
          [body.id, ...values.slice(2, 15), remarks, userId]
        );
        await writePmAudit(db, { userId, entityType: 'daily_update', entityId: rows[0].id, action: 'Edit', previous: current.rows[0], next: rows[0] });
        return rows[0];
      }
      const { rows } = await q(
        db,
        `INSERT INTO project_management_daily_updates (
           project_id, update_date, am_input_received, rag, completion_percent, work_done, plan_today, team_hours,
           blockers, blocker_owner_id, client_dependency, next_action, action_owner_id, action_due_date, escalate,
           manager_remarks, updated_by, created_by
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$17) RETURNING *`,
        values
      );
      await writePmAudit(db, { userId, entityType: 'daily_update', entityId: rows[0].id, action: 'Create', next: rows[0] });
      return rows[0];
    });
  } catch (err) {
    if (isUnique(err)) throw new FinanceConflictError('This project already has an update for that date.');
    throw err;
  }
}

export async function getDailyUpdate(id: string) {
  const { rows } = await q(
    undefined,
    `SELECT d.*, p.project_name, p.project_code, p.category, c.name AS client_name, am.full_name AS account_manager_name
     FROM project_management_daily_updates d
     JOIN project_management_projects p ON p.id = d.project_id
     LEFT JOIN ops_clients c ON c.id = p.client_id
     LEFT JOIN finance_employees am ON am.id = p.account_manager_id
     WHERE d.id = $1`,
    [id]
  );
  if (!rows[0]) throw new FinanceNotFoundError('Update not found');
  return rows[0];
}
