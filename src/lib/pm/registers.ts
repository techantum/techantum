import { writePmAudit } from './audit';
import { decorateRegisterRow } from './dashboard';
import type { PmPermission } from './permissions';
import { q, withFinanceTx } from '@/lib/finance/db';
import { FinanceConflictError, FinanceNotFoundError, FinanceValidationError } from '@/lib/finance/errors';

type FieldType = 'text' | 'long' | 'date' | 'num' | 'bool' | 'emp' | 'project';

export type RegisterField = {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  required?: boolean;
  list?: boolean;
};

export type RegisterDef = {
  key: string;
  title: string;
  table: string;
  codePrefix?: string;
  view: PmPermission;
  manage: PmPermission;
  fields: RegisterField[];
  search: string[];
};

const f = (key: string, label: string, type: FieldType, extra: Partial<RegisterField> = {}): RegisterField => ({ key, label, type, ...extra });

export const REGISTERS: RegisterDef[] = [
  {
    key: 'assets', title: 'Asset Register', table: 'process_assets', codePrefix: 'AST', view: 'process.asset.view', manage: 'process.asset.manage',
    search: ['code', 'asset_type', 'brand_model', 'serial_identifier'],
    fields: [
      f('asset_type', 'Asset Type', 'text', { list: true }), f('brand_model', 'Brand / Model', 'text', { list: true }),
      f('serial_identifier', 'Serial / Identifier', 'text'), f('classification', 'Classification', 'text'),
      f('assigned_employee_id', 'Assigned Employee', 'emp', { list: true }), f('issue_date', 'Issue Date', 'date'),
      f('status', 'Status', 'text', { list: true, options: ['available', 'assigned', 'returned', 'repair', 'retired', 'lost'] }),
      f('os_version', 'OS / Version', 'text'), f('encryption', 'Encryption', 'text'), f('endpoint_protection', 'Endpoint Protection', 'text'),
      f('last_review', 'Last Review', 'date'), f('return_date', 'Return / Retire Date', 'date'), f('notes', 'Evidence / Notes', 'long'),
    ],
  },
  {
    key: 'access', title: 'Access Register', table: 'process_access_records', codePrefix: 'ACC', view: 'process.access.view', manage: 'process.access.manage',
    search: ['code', 'system_name', 'external_user', 'access_type'],
    fields: [
      f('employee_id', 'Employee', 'emp', { list: true }), f('external_user', 'External User', 'text'),
      f('system_name', 'System / Application', 'text', { required: true, list: true }), f('project_id', 'Project', 'project', { list: true }),
      f('environment', 'Environment', 'text', { options: ['development', 'testing', 'staging', 'production', 'corporate'] }),
      f('access_type', 'Access Type', 'text', { list: true }), f('business_need', 'Business Need', 'long'),
      f('requested_date', 'Requested Date', 'date'), f('approved_by_id', 'Approved By', 'emp'), f('granted_date', 'Granted Date', 'date'),
      f('last_review', 'Last Review', 'date', { list: true }),
      f('status', 'Status', 'text', { list: true, options: ['requested', 'approved', 'active', 'revoked', 'rejected'] }),
      f('revoke_date', 'Revoke Date', 'date'), f('revoked_by_id', 'Revoked By', 'emp'), f('mfa_enabled', 'MFA Enabled', 'bool', { list: true }),
      f('notes', 'Evidence / Ticket', 'long'),
    ],
  },
  {
    key: 'servers', title: 'Server & Cloud', table: 'process_servers', codePrefix: 'SRV', view: 'process.server.view', manage: 'process.server.manage',
    search: ['code', 'provider', 'service_name', 'hostname'],
    fields: [
      f('provider', 'Provider', 'text', { list: true }), f('service_name', 'Service / VPS Name', 'text', { required: true, list: true }),
      f('purpose', 'Purpose', 'text'), f('project_id', 'Project', 'project', { list: true }),
      f('environment', 'Environment', 'text', { list: true, options: ['development', 'testing', 'staging', 'production', 'corporate'] }),
      f('region', 'Region', 'text'), f('platform', 'OS / Platform', 'text'), f('hostname', 'Public IP / Hostname', 'text'),
      f('owner_id', 'Owner', 'emp', { list: true }), f('admin_restricted', 'Admin Restricted', 'bool'), f('mfa_or_ssh', 'MFA / SSH Keys', 'bool'),
      f('firewall_reviewed', 'Firewall Reviewed', 'bool'), f('backup_enabled', 'Backup Enabled', 'bool'),
      f('status', 'Status', 'text', { list: true, options: ['active', 'inactive', 'retired'] }),
      f('last_patch', 'Last Patch', 'date'), f('last_security_review', 'Last Security Review', 'date'),
      f('monitoring_enabled', 'Monitoring Enabled', 'bool'), f('notes', 'Evidence / Notes', 'long'),
    ],
  },
  {
    key: 'suppliers', title: 'Supplier Register', table: 'process_suppliers', codePrefix: 'SUP', view: 'process.supplier.view', manage: 'process.supplier.manage',
    search: ['code', 'supplier_name', 'service'],
    fields: [
      f('supplier_name', 'Supplier', 'text', { required: true, list: true }), f('service', 'Service', 'text', { list: true }),
      f('data_involved', 'Data / Systems Involved', 'text'), f('criticality', 'Criticality', 'text', { list: true, options: ['critical', 'high', 'medium', 'low'] }),
      f('contract_dpa', 'Contract / DPA', 'text'), f('security_review', 'Security Review', 'text'), f('owner_id', 'Owner', 'emp'),
      f('project_id', 'Project', 'project'), f('start_date', 'Start Date', 'date'), f('last_review', 'Last Review', 'date'),
      f('next_review', 'Next Review', 'date', { list: true }), f('status', 'Status', 'text', { list: true, options: ['active', 'inactive', 'exited'] }),
      f('exit_plan', 'Exit / Data Return Plan', 'long'), f('notes', 'Evidence / Notes', 'long'),
    ],
  },
  {
    key: 'software', title: 'Software Register', table: 'process_software', codePrefix: 'SW', view: 'process.software.view', manage: 'process.software.manage',
    search: ['code', 'software_name', 'category'],
    fields: [
      f('software_name', 'Software / SaaS', 'text', { required: true, list: true }), f('purpose', 'Purpose', 'text'),
      f('category', 'Category', 'text', { list: true }), f('version_label', 'Version', 'text'), f('license_type', 'License Type', 'text'),
      f('approved_by_id', 'Approved By', 'emp'), f('users_teams', 'Users / Teams', 'text'), f('data_handled', 'Data Handled', 'text'),
      f('auto_update', 'Auto Update', 'bool'), f('last_review', 'Last Review', 'date'),
      f('status', 'Status', 'text', { list: true, options: ['approved', 'under_review', 'restricted', 'deprecated', 'removed'] }),
      f('removal_notes', 'Removal / Replacement Notes', 'long'),
    ],
  },
  {
    key: 'backups', title: 'Backup Register', table: 'process_backups', codePrefix: 'BKP', view: 'process.backup.view', manage: 'process.backup.manage',
    search: ['code', 'system_name', 'backup_location'],
    fields: [
      f('system_name', 'System / Data', 'text', { required: true, list: true }), f('project_id', 'Project', 'project', { list: true }),
      f('backup_location', 'Backup Location', 'text'), f('frequency', 'Frequency', 'text', { options: ['daily', 'weekly', 'monthly'] }),
      f('retention', 'Retention', 'text'), f('encrypted', 'Encrypted', 'bool'), f('owner_id', 'Owner', 'emp'),
      f('last_successful', 'Last Successful Backup', 'date', { list: true }), f('last_restore_test', 'Last Restore Test', 'date'),
      f('restore_result', 'Restore Result', 'text'), f('next_restore_test', 'Next Restore Test', 'date'),
      f('status', 'Status', 'text', { options: ['active', 'failed', 'disabled'] }), f('notes', 'Evidence / Link', 'long'),
    ],
  },
  {
    key: 'incidents', title: 'Incident Register', table: 'process_incidents', codePrefix: 'INC', view: 'process.incident.view', manage: 'process.incident.manage',
    search: ['code', 'category', 'affected_system', 'description'],
    fields: [
      f('reported_date', 'Reported Date', 'date', { required: true, list: true }), f('reported_by_id', 'Reported By', 'emp'),
      f('category', 'Category', 'text', { list: true }), f('affected_system', 'Affected Asset / System', 'text'),
      f('project_id', 'Project', 'project'), f('severity', 'Severity', 'text', { list: true, options: ['critical', 'high', 'medium', 'low'] }),
      f('description', 'Description', 'long'), f('containment', 'Immediate Containment', 'long'), f('owner_id', 'Owner', 'emp', { list: true }),
      f('root_cause', 'Root Cause', 'long'), f('corrective_action', 'Corrective Action', 'long'),
      f('status', 'Status', 'text', { list: true, options: ['reported', 'investigating', 'contained', 'remediation', 'closed'] }),
      f('closed_date', 'Closed Date', 'date'), f('lessons', 'Lessons Learned', 'long'), f('notes', 'Evidence', 'long'),
    ],
  },
  {
    key: 'vulnerabilities', title: 'Vulnerability Register', table: 'process_vulnerabilities', codePrefix: 'VUL', view: 'process.vulnerability.view', manage: 'process.vulnerability.manage',
    search: ['code', 'asset_application', 'source', 'description'],
    fields: [
      f('detected_date', 'Detected Date', 'date'), f('asset_application', 'Asset / Application', 'text', { required: true, list: true }),
      f('project_id', 'Project', 'project', { list: true }), f('source', 'Source', 'text'),
      f('severity', 'Severity', 'text', { list: true, options: ['critical', 'high', 'medium', 'low'] }), f('description', 'Description', 'long'),
      f('owner_id', 'Owner', 'emp'), f('target_fix_date', 'Target Fix Date', 'date', { list: true }), f('remediation', 'Remediation', 'long'),
      f('status', 'Status', 'text', { list: true, options: ['open', 'in_progress', 'fixed', 'risk_accepted', 'false_positive', 'closed'] }),
      f('verification_date', 'Verification Date', 'date'), f('verified_by_id', 'Verified By', 'emp'), f('notes', 'Evidence', 'long'),
    ],
  },
  {
    key: 'training', title: 'Training Register', table: 'process_training_sessions', codePrefix: 'TRN', view: 'process.training.view', manage: 'process.training.manage',
    search: ['code', 'topic', 'trainer'],
    fields: [
      f('training_date', 'Training Date', 'date', { list: true }), f('topic', 'Session / Topic', 'text', { required: true, list: true }),
      f('trainer', 'Trainer', 'text', { list: true }), f('duration', 'Duration', 'text'), f('next_refresher', 'Next Refresher', 'date'),
      f('notes', 'Assessment / Remarks', 'long'),
    ],
  },
  {
    key: 'joiner-leaver', title: 'Joiner / Leaver', table: 'process_joiner_leaver', codePrefix: 'JL', view: 'process.joiner_leaver.view', manage: 'process.joiner_leaver.manage',
    search: ['code', 'action_type', 'role_title'],
    fields: [
      f('employee_id', 'Employee', 'emp', { required: true, list: true }),
      f('action_type', 'Action Type', 'text', { required: true, list: true, options: ['join', 'role_change', 'exit'] }),
      f('role_title', 'Role', 'text'), f('effective_date', 'Effective Date', 'date', { list: true }),
      f('nda', 'NDA / Confidentiality', 'text', { options: ['yes', 'no', 'na'] }), f('isms_training', 'ISMS Training', 'text', { options: ['yes', 'no', 'na'] }),
      f('asset_status', 'Asset Issued / Returned', 'text'), f('email_account', 'Email Account', 'text'), f('git_access', 'Git / Repo Access', 'text'),
      f('cloud_access', 'Cloud / VPS Access', 'text'), f('client_access', 'Client Access', 'text'), f('mfa', 'MFA', 'text'),
      f('approver_id', 'Approver', 'emp'), f('completion_status', 'Completion Status', 'text', { list: true, options: ['open', 'in_progress', 'complete'] }),
      f('completed_date', 'Completed Date', 'date'), f('notes', 'Evidence / Notes', 'long'),
    ],
  },
  {
    key: 'changes', title: 'Change Register', table: 'process_changes', codePrefix: 'CHG', view: 'process.change.view', manage: 'process.change.manage',
    search: ['code', 'description', 'system_name', 'environment'],
    fields: [
      f('request_date', 'Request Date', 'date', { list: true }), f('project_id', 'Project', 'project', { list: true }),
      f('system_name', 'System', 'text'), f('environment', 'Environment', 'text', { list: true, options: ['development', 'testing', 'staging', 'production', 'corporate'] }),
      f('description', 'Change Description', 'long', { required: true }), f('reason', 'Reason', 'long'), f('risk_impact', 'Risk / Impact', 'text'),
      f('requested_by_id', 'Requested By', 'emp'), f('tested_by_id', 'Tested By', 'emp'), f('test_result', 'Test Result', 'text'),
      f('approved_by_id', 'Approved By', 'emp', { list: true }), f('implementation_date', 'Implementation Date', 'date', { list: true }),
      f('rollback_plan', 'Rollback Plan', 'long'),
      f('status', 'Status', 'text', { list: true, options: ['requested', 'testing', 'approved', 'scheduled', 'implemented', 'failed', 'rolled_back', 'closed'] }),
      f('notes', 'Evidence / Ticket', 'long'),
    ],
  },
  {
    key: 'risks', title: 'Risk Register', table: 'process_risks', codePrefix: 'RSK', view: 'process.risk.view', manage: 'process.risk.manage',
    search: ['code', 'threat', 'asset_process'],
    fields: [
      f('identified_date', 'Date Identified', 'date'), f('asset_process', 'Asset / Process', 'text', { list: true }),
      f('project_id', 'Project', 'project', { list: true }), f('threat', 'Threat / Event', 'text', { list: true }), f('cause', 'Vulnerability / Cause', 'long'),
      f('business_impact', 'Business Impact', 'long'), f('likelihood', 'Likelihood', 'num', { required: true }), f('impact', 'Impact', 'num', { required: true }),
      f('existing_controls', 'Existing Controls', 'long'), f('treatment', 'Treatment', 'long'), f('owner_id', 'Owner', 'emp'),
      f('target_date', 'Target Date', 'date'), f('status', 'Status', 'text', { list: true, options: ['open', 'treating', 'accepted', 'closed'] }),
      f('residual_likelihood', 'Residual Likelihood', 'num'), f('residual_impact', 'Residual Impact', 'num'),
      f('review_date', 'Review Date', 'date'), f('notes', 'Evidence / Notes', 'long'),
    ],
  },
  {
    key: 'actions', title: 'Corrective Actions', table: 'process_corrective_actions', codePrefix: 'CA', view: 'process.corrective_action.view', manage: 'process.corrective_action.manage',
    search: ['code', 'finding', 'source'],
    fields: [
      f('source', 'Source', 'text', { list: true, options: ['incident', 'vulnerability', 'risk', 'control', 'change', 'audit', 'other'] }),
      f('source_id', 'Linked Record ID', 'text'), f('raised_date', 'Date Raised', 'date', { list: true }),
      f('project_id', 'Project', 'project'), f('finding', 'Finding / Issue', 'long', { required: true }), f('root_cause', 'Root Cause', 'long'),
      f('corrective_action', 'Corrective Action', 'long'), f('owner_id', 'Owner', 'emp', { list: true }), f('due_date', 'Due Date', 'date', { list: true }),
      f('verification_method', 'Verification Method', 'text'),
      f('status', 'Status', 'text', { list: true, options: ['open', 'in_progress', 'pending_verification', 'closed'] }),
      f('closure_date', 'Closure Date', 'date'), f('verified_by_id', 'Verified By', 'emp'), f('effectiveness', 'Effectiveness Result', 'text'),
      f('notes', 'Evidence', 'long'),
    ],
  },
  {
    key: 'controls', title: 'Control Checklist', table: 'process_controls', view: 'process.control.view', manage: 'process.control.manage',
    search: ['area', 'control_check'],
    fields: [
      f('area', 'Area', 'text', { required: true, list: true }), f('control_check', 'Control Check', 'text', { required: true, list: true }),
      f('owner_id', 'Owner', 'emp'), f('frequency', 'Frequency', 'text', { list: true, options: ['per_event', 'per_change', 'monthly', 'quarterly', 'annual', 'on_joining', 'on_exit', 'custom'] }),
      f('required', 'Required', 'bool'), f('current_status', 'Current Status', 'text', { list: true, options: ['compliant', 'partial', 'not_compliant', 'not_checked', 'na'] }),
      f('last_checked', 'Last Checked', 'date', { list: true }), f('gap_action', 'Gap / Action', 'long'), f('target_date', 'Target Date', 'date'),
      f('notes', 'Evidence', 'long'),
    ],
  },
];

const TABLES = new Set(REGISTERS.map((item) => item.table));

export function registerByKey(key: string) {
  const def = REGISTERS.find((item) => item.key === key);
  if (!def || !TABLES.has(def.table)) throw new FinanceNotFoundError('Register not found');
  return def;
}

function clean(def: RegisterDef, body: Record<string, unknown>) {
  const data: Record<string, unknown> = {};
  for (const field of def.fields) {
    if (field.key === 'source_id') {
      const text = String(body.source_id || '').trim();
      data[field.key] = /^[0-9a-f-]{36}$/i.test(text) ? text : null;
      continue;
    }
    let value = body[field.key];
    if (field.type === 'bool') value = value === true || value === 'true' || value === 'on' || value === 'yes';
    else if (value === '' || value == null) value = field.type === 'num' ? null : null;
    else if (field.type === 'num') value = Number(value);
    else value = field.type === 'text' || field.type === 'long' ? String(value) : value;
    if (field.options && value && !field.options.includes(String(value))) {
      throw new FinanceValidationError(`${field.label} is not a valid option`);
    }
    if (field.required && (value == null || value === '')) throw new FinanceValidationError(`${field.label} is required`);
    if (field.type === 'num' && value != null && (field.key.includes('likelihood') || field.key === 'impact' || field.key === 'residual_impact')) {
      const n = Number(value);
      if (n < 1 || n > 5) throw new FinanceValidationError(`${field.label} must be between 1 and 5`);
    }
    data[field.key] = value;
  }
  return data;
}

function assertProductionChange(data: Record<string, unknown>) {
  const status = String(data.status || '');
  if (String(data.environment || '') !== 'production') return;
  if (!['scheduled', 'implemented', 'closed'].includes(status)) return;
  if (!data.test_result || !data.approved_by_id || !data.rollback_plan) {
    throw new FinanceValidationError('Production changes need a test result, approval and rollback plan before implementation.');
  }
}

export async function listRegister(key: string, params: { q?: string; status?: string; projectId?: string; page?: number }) {
  const def = registerByKey(key);
  const page = Math.max(1, params.page || 1);
  const values: unknown[] = [];
  const where: string[] = [];
  if (params.status && def.fields.some((field) => field.key === 'status' || field.key === 'current_status' || field.key === 'completion_status')) {
    const column = def.fields.some((field) => field.key === 'status') ? 'status' : def.fields.some((field) => field.key === 'current_status') ? 'current_status' : 'completion_status';
    values.push(params.status);
    where.push(`t.${column} = $${values.length}`);
  }
  if (params.projectId && def.fields.some((field) => field.key === 'project_id')) {
    values.push(params.projectId);
    where.push(`t.project_id = $${values.length}`);
  }
  if (params.q && def.search.length) {
    const like = `%${params.q}%`;
    const parts = def.search.map((column) => {
      values.push(like);
      return `t.${column}::text ILIKE $${values.length}`;
    });
    where.push(`(${parts.join(' OR ')})`);
  }
  const projectJoin = def.fields.some((field) => field.key === 'project_id')
    ? 'LEFT JOIN project_management_projects p ON p.id = t.project_id LEFT JOIN ops_clients c ON c.id = p.client_id'
    : '';
  const projectCols = projectJoin ? ', p.project_code, p.project_name, c.name AS client_name' : '';
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const { rows } = await q(
    undefined,
    `SELECT t.* ${projectCols} FROM ${def.table} t ${projectJoin} ${clause} ORDER BY t.updated_at DESC NULLS LAST LIMIT 50 OFFSET ${(page - 1) * 50}`,
    values
  );
  const employees = await q(undefined, `SELECT id, full_name, status FROM finance_employees ORDER BY full_name`);
  let decorated = rows.map((row) => decorateRegisterRow(def.table, row));
  if (key === 'training') {
    const attendees = await q(undefined, `SELECT a.session_id, a.employee_id, e.full_name, a.attendance, a.acknowledged FROM process_training_attendees a JOIN finance_employees e ON e.id=a.employee_id`);
    decorated = decorated.map((row) => ({ ...row, attendees: attendees.rows.filter((item) => item.session_id === row.id) }));
  }
  return { register: { key: def.key, title: def.title, fields: def.fields }, rows: decorated, employees: employees.rows, page };
}

export async function getRegisterRow(key: string, id: string) {
  const def = registerByKey(key);
  const projectJoin = def.fields.some((field) => field.key === 'project_id')
    ? 'LEFT JOIN project_management_projects p ON p.id = t.project_id LEFT JOIN ops_clients c ON c.id = p.client_id'
    : '';
  const projectCols = projectJoin ? ', p.project_code, p.project_name, c.name AS client_name' : '';
  const { rows } = await q(undefined, `SELECT t.* ${projectCols} FROM ${def.table} t ${projectJoin} WHERE t.id=$1`, [id]);
  if (!rows[0]) throw new FinanceNotFoundError('Record not found');
  let row = decorateRegisterRow(def.table, rows[0]);
  if (key === 'training') {
    const attendees = await q(undefined, `SELECT a.employee_id, e.full_name, a.attendance, a.acknowledged FROM process_training_attendees a JOIN finance_employees e ON e.id=a.employee_id WHERE a.session_id=$1`, [id]);
    row = { ...row, attendees: attendees.rows, employee_ids: attendees.rows.map((item) => item.employee_id) };
  }
  const employees = await q(undefined, `SELECT id, full_name, status FROM finance_employees ORDER BY full_name`);
  const warnings = key === 'joiner-leaver' && row.action_type === 'exit' ? await exitWarnings(String(row.employee_id)) : [];
  return { register: { key: def.key, title: def.title, fields: def.fields }, row, employees: employees.rows, warnings };
}

async function exitWarnings(employeeId: string) {
  const assets = await q(undefined, `SELECT code, asset_type, brand_model FROM process_assets WHERE assigned_employee_id=$1 AND status='assigned'`, [employeeId]);
  const access = await q(undefined, `SELECT code, system_name FROM process_access_records WHERE employee_id=$1 AND status IN ('requested','approved','active')`, [employeeId]);
  return [
    ...assets.rows.map((row) => `Assigned asset ${row.code} is still open`),
    ...access.rows.map((row) => `Access ${row.code} for ${row.system_name} is still open`),
  ];
}

export async function saveRegister(key: string, body: Record<string, unknown>, userId: string) {
  const def = registerByKey(key);
  const data = clean(def, body);
  if (def.table === 'process_changes') assertProductionChange(data);
  return withFinanceTx(async (db) => {
    if (body.id) {
      const current = await q(db, `SELECT * FROM ${def.table} WHERE id=$1 FOR UPDATE`, [body.id]);
      if (!current.rows[0]) throw new FinanceNotFoundError('Record not found');
      if (Number(body.version) !== Number(current.rows[0].version)) {
        throw new FinanceConflictError('This record was updated by someone else. Reload and try again.');
      }
      const keys = Object.keys(data);
      const sets = keys.map((column, index) => `${column}=$${index + 2}`);
      const { rows } = await q(
        db,
        `UPDATE ${def.table} SET ${sets.join(', ')}, version=version+1, updated_by=$${keys.length + 2} WHERE id=$1 RETURNING *`,
        [body.id, ...keys.map((column) => data[column]), userId]
      );
      if (key === 'training') await saveAttendees(db, String(rows[0].id), body.employee_ids);
      await writePmAudit(db, { userId, entityType: def.table, entityId: rows[0].id, action: statusAction(current.rows[0], rows[0]), previous: current.rows[0], next: rows[0] });
      return rows[0];
    }
    let code: string | null = null;
    if (def.codePrefix) {
      const next = await q<{ pm_next_code: string }>(db, `SELECT pm_next_code($1, 3)`, [def.codePrefix]);
      code = next.rows[0]?.pm_next_code || null;
    }
    const keys = Object.keys(data).filter((column) => data[column] != null);
    const columns = [...(code ? ['code'] : []), ...keys, 'created_by', 'updated_by'];
    const params = [...(code ? [code] : []), ...keys.map((column) => data[column]), userId, userId];
    const placeholders = params.map((_, index) => `$${index + 1}`);
    const { rows } = await q(
      db,
      `INSERT INTO ${def.table} (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
      params
    );
    if (key === 'training') await saveAttendees(db, String(rows[0].id), body.employee_ids);
    await writePmAudit(db, { userId, entityType: def.table, entityId: rows[0].id, action: 'Create', next: rows[0] });
    const warnings = key === 'joiner-leaver' && data.action_type === 'exit' ? await exitWarnings(String(data.employee_id)) : [];
    return { ...rows[0], warnings };
  });
}

function statusAction(previous: Record<string, unknown>, next: Record<string, unknown>) {
  if (previous.status !== next.status || previous.current_status !== next.current_status) {
    if (next.status === 'closed' || next.current_status === 'compliant') return 'Closure';
    if (next.status === 'approved') return 'Approval';
    if (next.verified_by_id && next.verified_by_id !== previous.verified_by_id) return 'Verification';
    return 'Status Change';
  }
  return 'Edit';
}

async function saveAttendees(db: Parameters<Parameters<typeof withFinanceTx>[0]>[0], sessionId: string, employeeIds: unknown) {
  const ids = Array.isArray(employeeIds) ? employeeIds.map(String).filter(Boolean) : [];
  await q(db, 'DELETE FROM process_training_attendees WHERE session_id=$1', [sessionId]);
  for (const employeeId of ids) {
    await q(db, `INSERT INTO process_training_attendees (session_id, employee_id) VALUES ($1,$2) ON CONFLICT (session_id, employee_id) DO NOTHING`, [sessionId, employeeId]);
  }
}

export async function lookupOptions() {
  const [employees, projects, types, phases, clients, roles] = await Promise.all([
    q(undefined, `SELECT e.id, e.full_name, e.status, e.designation, e.department, t.project_role
       FROM finance_employees e
       LEFT JOIN project_management_team_profiles t ON t.employee_id = e.id
       ORDER BY e.full_name`),
    q(undefined, `SELECT p.id, p.project_code, p.project_name, p.client_id, p.category, c.name AS client_name, am.full_name AS account_manager_name
       FROM project_management_projects p
       LEFT JOIN ops_clients c ON c.id = p.client_id
       LEFT JOIN finance_employees am ON am.id = p.account_manager_id
       WHERE p.archived_at IS NULL ORDER BY p.project_code`),
    q(undefined, `SELECT id, name, active FROM project_management_project_types ORDER BY sort_order`),
    q(undefined, `SELECT id, name, active FROM project_management_phases ORDER BY sort_order`),
    q(undefined, `SELECT id, name FROM ops_clients WHERE status IS DISTINCT FROM 'inactive' ORDER BY name`),
    q(undefined, `SELECT id, name FROM project_management_roles WHERE active ORDER BY sort_order, name`),
  ]);
  return { employees: employees.rows, projects: projects.rows, types: types.rows, phases: phases.rows, clients: clients.rows, roles: roles.rows };
}
