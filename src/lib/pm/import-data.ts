import { CHECKLIST_KEYS } from './calculate';
import { createProject } from './projects';
import { registerByKey, saveRegister } from './registers';
import { q } from '@/lib/finance/db';
import { FinanceValidationError } from '@/lib/finance/errors';

type Bucket = { row: number; message: string; data?: Record<string, unknown> };
export type ImportReport = { imported: number; skipped: number; invalid: Bucket[]; duplicate: Bucket[] };

const ALIASES: Record<string, string> = {
  projectcode: 'project_code',
  projectname: 'project_name',
  client: 'client_name',
  clientname: 'client_name',
  projecttype: 'project_type',
  accountmanager: 'account_manager',
  srsoftwareengineer: 'sr_engineer',
  srengineer: 'sr_engineer',
  leaddeveloper: 'lead_developer',
  juniordeveloper1: 'junior_developer_1',
  juniordeveloper2: 'junior_developer_2',
  plannedend: 'planned_end_date',
  revisedend: 'revised_end_date',
  startdate: 'start_date',
  plannedhours: 'planned_hours',
  hoursbeforetracker: 'hours_before_tracker',
  updatedate: 'update_date',
  rag: 'rag',
  completion: 'completion_percent',
  workdone: 'work_done',
  plantoday: 'plan_today',
  teamhours: 'team_hours',
  blocker: 'blockers',
  blockers: 'blockers',
};

function keyOf(header: string) {
  const compact = header.toLowerCase().replace(/[^a-z0-9]+/g, '');
  return ALIASES[compact] || header.trim().toLowerCase().replace(/\s+/g, '_');
}

export function normalizeImportRow(row: Record<string, unknown>) {
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) next[keyOf(key)] = typeof value === 'string' ? value.trim() : value;
  return next;
}

async function employeeId(name: unknown) {
  const text = String(name || '').trim();
  if (!text) return null;
  const { rows } = await q(undefined, `SELECT id FROM finance_employees WHERE lower(full_name)=lower($1) OR lower(employee_code)=lower($1) LIMIT 1`, [text]);
  return rows[0]?.id || null;
}

async function clientId(name: unknown) {
  const text = String(name || '').trim();
  if (!text) return null;
  const { rows } = await q(undefined, `SELECT id FROM ops_clients WHERE lower(name)=lower($1) LIMIT 1`, [text]);
  return rows[0]?.id || null;
}

export async function importPmRows(kind: string, rawRows: Record<string, unknown>[], userId: string): Promise<ImportReport> {
  const report: ImportReport = { imported: 0, skipped: 0, invalid: [], duplicate: [] };
  const rows = rawRows.map(normalizeImportRow).filter((row) => Object.values(row).some((value) => value !== '' && value != null));
  if (kind === 'projects') {
    for (const [index, row] of rows.entries()) {
      if (!row.project_name || !row.client_name) {
        report.invalid.push({ row: index + 2, message: 'Project name and client are required' });
        continue;
      }
      if (row.project_code) {
        const existing = await q(undefined, 'SELECT id FROM project_management_projects WHERE project_code=$1', [row.project_code]);
        if (existing.rows[0]) {
          report.duplicate.push({ row: index + 2, message: `Project ${row.project_code} already exists` });
          continue;
        }
      }
      const client = await clientId(row.client_name);
      if (!client) {
        report.invalid.push({ row: index + 2, message: `Client not found: ${row.client_name}` });
        continue;
      }
      const type = row.project_type
        ? await q(undefined, 'SELECT id FROM project_management_project_types WHERE lower(name)=lower($1)', [row.project_type])
        : { rows: [] as { id: string }[] };
      const phase = row.phase
        ? await q(undefined, 'SELECT id FROM project_management_phases WHERE lower(name)=lower($1)', [row.phase])
        : { rows: [] as { id: string }[] };
      let created;
      try {
        created = await createProject({
          ...row,
          client_id: client,
          project_type_id: type.rows[0]?.id,
          phase_id: phase.rows[0]?.id,
          account_manager_id: await employeeId(row.account_manager),
          sr_engineer_id: await employeeId(row.sr_engineer),
          lead_developer_id: await employeeId(row.lead_developer),
          junior_developer_1_id: await employeeId(row.junior_developer_1),
          junior_developer_2_id: await employeeId(row.junior_developer_2),
          category: String(row.category || 'planned_to_onboard').toLowerCase().replace(/\s+/g, '_'),
        }, userId);
      } catch (err) {
        report.invalid.push({ row: index + 2, message: err instanceof Error ? err.message : 'Invalid project' });
        continue;
      }
      if (row.project_code && created.project_code !== row.project_code) {
        await q(undefined, 'UPDATE project_management_projects SET project_code=$2 WHERE id=$1', [created.id, row.project_code]);
        const match = String(row.project_code).match(/(\d+)$/);
        if (match) {
          await q(undefined, `INSERT INTO project_management_sequences (kind, last_value) VALUES ('TS-P', $1) ON CONFLICT (kind) DO UPDATE SET last_value = GREATEST(project_management_sequences.last_value, $1)`, [Number(match[1])]);
        }
      }
      report.imported += 1;
    }
    return report;
  }
  if (kind === 'daily') {
    const { saveDailyUpdate } = await import('./daily');
    for (const [index, row] of rows.entries()) {
      const project = await q(undefined, 'SELECT id FROM project_management_projects WHERE project_code=$1 OR project_name=$1', [row.project_code || row.project_name]);
      if (!project.rows[0] || !row.update_date) {
        report.invalid.push({ row: index + 2, message: 'Project and update date are required' });
        continue;
      }
      const existing = await q(undefined, 'SELECT id FROM project_management_daily_updates WHERE project_id=$1 AND update_date=$2', [project.rows[0].id, row.update_date]);
      if (existing.rows[0]) {
        report.duplicate.push({ row: index + 2, message: 'Update already exists for that project and date' });
        continue;
      }
      try {
        await saveDailyUpdate({
          ...row,
          project_id: project.rows[0].id,
          blocker_owner_id: await employeeId(row.blocker_owner),
          action_owner_id: await employeeId(row.action_owner),
        }, userId, true);
        report.imported += 1;
      } catch (err) {
        report.invalid.push({ row: index + 2, message: err instanceof Error ? err.message : 'Invalid daily update' });
      }
    }
    return report;
  }
  if (kind === 'onboarding') {
    const { saveOnboarding } = await import('./onboarding');
    for (const [index, row] of rows.entries()) {
      const project = await q(undefined, 'SELECT id FROM project_management_projects WHERE project_code=$1 OR project_name=$1', [row.project_code || row.project_name]);
      if (!project.rows[0]) {
        report.invalid.push({ row: index + 2, message: 'Project not found' });
        continue;
      }
      const body: Record<string, unknown> = { remarks: row.remarks, kickoff_date: row.kickoff_date };
      for (const key of CHECKLIST_KEYS) body[key] = String(row[key] || 'not_filled').toLowerCase();
      await saveOnboarding(project.rows[0].id, body, userId);
      report.imported += 1;
    }
    return report;
  }
  try {
    registerByKey(kind);
  } catch {
    throw new FinanceValidationError('Import type is not recognised');
  }
  for (const [index, row] of rows.entries()) {
    if (row.code) {
      const def = registerByKey(kind);
      const existing = await q(undefined, `SELECT id FROM ${def.table} WHERE code=$1`, [row.code]);
      if (existing.rows[0]) {
        report.duplicate.push({ row: index + 2, message: `${row.code} already exists` });
        continue;
      }
    }
    const body: Record<string, unknown> = { ...row };
    for (const field of registerByKey(kind).fields) {
      if (field.type === 'emp' && row[field.key.replace(/_id$/, '')]) body[field.key] = await employeeId(row[field.key.replace(/_id$/, '')]);
      if (field.type === 'project' && row.project) {
        const project = await q(undefined, 'SELECT id FROM project_management_projects WHERE project_code=$1 OR project_name=$1', [row.project]);
        body.project_id = project.rows[0]?.id || null;
      }
    }
    try {
      const saved = await saveRegister(kind, body, userId);
      if (row.code && saved.code !== row.code) {
        const def = registerByKey(kind);
        await q(undefined, `UPDATE ${def.table} SET code=$2 WHERE id=$1`, [saved.id, row.code]);
      }
      report.imported += 1;
    } catch (err) {
      report.invalid.push({ row: index + 2, message: err instanceof Error ? err.message : 'Invalid row' });
    }
  }
  return report;
}
