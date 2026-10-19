import { writePmAudit } from './audit';
import { CHECKLIST_KEYS, onboardingReadiness } from './calculate';
import { q, withFinanceTx } from '@/lib/finance/db';
import { FinanceConflictError, FinanceNotFoundError } from '@/lib/finance/errors';

const OPTIONS = new Set(['yes', 'no', 'na', 'pending', 'not_filled']);

export async function listOnboarding() {
  const { rows } = await q(
    undefined,
    `SELECT p.id, p.project_code, p.project_name, p.category, c.name AS client_name, o.*
     FROM project_management_projects p
     LEFT JOIN project_management_onboarding o ON o.project_id = p.id
     LEFT JOIN ops_clients c ON c.id = p.client_id
     WHERE p.archived_at IS NULL AND p.category = 'planned_to_onboard'
     ORDER BY p.project_code`
  );
  return rows.map((row) => ({ ...row, readiness: onboardingReadiness(row) }));
}

export async function saveOnboarding(projectId: string, body: Record<string, unknown>, userId: string) {
  return withFinanceTx(async (db) => {
    const current = await q(db, 'SELECT * FROM project_management_onboarding WHERE project_id=$1 FOR UPDATE', [projectId]);
    if (!current.rows[0]) throw new FinanceNotFoundError('Onboarding checklist not found');
    if (body.version != null && Number(body.version) !== Number(current.rows[0].version)) {
      throw new FinanceConflictError('This checklist was updated by someone else. Reload and try again.');
    }
    const values = CHECKLIST_KEYS.map((key) => {
      const value = String(body[key] || current.rows[0][key] || 'not_filled');
      return OPTIONS.has(value) ? value : 'not_filled';
    });
    const sets = CHECKLIST_KEYS.map((key, index) => `${key}=$${index + 2}`).join(', ');
    const { rows } = await q(
      db,
      `UPDATE project_management_onboarding SET
         ${sets}, kickoff_date=$${CHECKLIST_KEYS.length + 2}, remarks=$${CHECKLIST_KEYS.length + 3},
         version=version+1, updated_by=$${CHECKLIST_KEYS.length + 4}
       WHERE project_id=$1 RETURNING *`,
      [projectId, ...values, body.kickoff_date || null, body.remarks || null, userId]
    );
    await writePmAudit(db, { userId, entityType: 'onboarding', entityId: projectId, projectId, action: 'Onboarding Updated', previous: current.rows[0], next: rows[0] });
    return { ...rows[0], readiness: onboardingReadiness(rows[0]) };
  });
}
