import { writeFinanceAudit } from './audit';
import { q, withFinanceTx } from './db';
import { FinanceConflictError, FinanceForbiddenError, FinanceNotFoundError, FinanceValidationError } from './errors';
import { financialYearFromDate } from './fy';
import { saveFinanceFile, sanitizeFilename } from './storage';
import { registerDocument } from './documents';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function payrollMonthName(month: number) {
  return MONTHS[month - 1] || String(month);
}

export async function listEmployees(params?: { q?: string; status?: string }) {
  const values: unknown[] = [];
  const where: string[] = [];
  if (params?.status) {
    values.push(params.status);
    where.push(`status = $${values.length}`);
  }
  if (params?.q) {
    values.push(`%${params.q}%`);
    where.push(
      `(full_name ILIKE $${values.length} OR employee_code ILIKE $${values.length} OR email ILIKE $${values.length})`
    );
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const { rows } = await q(
    undefined,
    `SELECT * FROM finance_employees ${clause} ORDER BY full_name`,
    values
  );
  return rows;
}

export async function upsertEmployee(body: Record<string, unknown>, userId: string, id?: string) {
  const code = String(body.employee_code || body.employee_id || '').trim().toUpperCase();
  const name = String(body.full_name || body.employee_name || '').trim();
  if (!code) throw new FinanceValidationError('Employee ID is required');
  if (!name) throw new FinanceValidationError('Employee name is required');
  const email = String(body.email || '').trim().toLowerCase() || null;
  if (id) {
    const { rows } = await q(
      undefined,
      `UPDATE finance_employees
       SET employee_code=$2, full_name=$3, email=$4, user_id=$5, department=$6, designation=$7, status=$8, updated_by=$9
       WHERE id=$1 RETURNING *`,
      [
        id,
        code,
        name,
        email,
        body.user_id || null,
        body.department || null,
        body.designation || null,
        String(body.status || 'active') === 'inactive' ? 'inactive' : 'active',
        userId,
      ]
    );
    if (!rows[0]) throw new FinanceNotFoundError('Employee not found');
    return rows[0];
  }
  const { rows } = await q(
    undefined,
    `INSERT INTO finance_employees (
       employee_code, full_name, email, user_id, department, designation, status, created_by, updated_by
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8)
     ON CONFLICT (employee_code) DO UPDATE SET
       full_name = EXCLUDED.full_name,
       email = COALESCE(EXCLUDED.email, finance_employees.email),
       department = COALESCE(EXCLUDED.department, finance_employees.department),
       designation = COALESCE(EXCLUDED.designation, finance_employees.designation),
       updated_by = EXCLUDED.updated_by
     RETURNING *`,
    [
      code,
      name,
      email,
      body.user_id || null,
      body.department || null,
      body.designation || null,
      String(body.status || 'active') === 'inactive' ? 'inactive' : 'active',
      userId,
    ]
  );
  return rows[0];
}

export async function findEmployeeForUser(userId: string, email?: string | null) {
  const { rows } = await q(
    undefined,
    `SELECT * FROM finance_employees
     WHERE status = 'active'
       AND (user_id = $1 OR ($2::text IS NOT NULL AND lower(email) = lower($2)))
     ORDER BY user_id = $1 DESC
     LIMIT 1`,
    [userId, email || null]
  );
  return rows[0] || null;
}

function storedPayslipName(employeeCode: string, year: number, month: number) {
  return `${sanitizeFilename(employeeCode)}_${year}_${String(month).padStart(2, '0')}_PAYSLIP.pdf`;
}

export async function listPayslips(params: {
  q?: string;
  year?: number;
  month?: number;
  employeeId?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize || 25));
  const where: string[] = [];
  const values: unknown[] = [];
  if (params.year) {
    values.push(params.year);
    where.push(`p.payroll_year = $${values.length}`);
  }
  if (params.month) {
    values.push(params.month);
    where.push(`p.payroll_month = $${values.length}`);
  }
  if (params.employeeId) {
    values.push(params.employeeId);
    where.push(`p.employee_id = $${values.length}`);
  }
  if (params.q) {
    values.push(`%${params.q}%`);
    where.push(
      `(e.full_name ILIKE $${values.length} OR e.employee_code ILIKE $${values.length} OR e.department ILIKE $${values.length})`
    );
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const { rows } = await q(
    undefined,
    `SELECT p.*, e.full_name AS employee_name, e.employee_code, e.department, e.designation, e.email AS employee_email,
            au.email AS uploaded_by_email
     FROM finance_employee_payslips p
     JOIN finance_employees e ON e.id = p.employee_id
     LEFT JOIN admin_users au ON au.user_id = p.uploaded_by
     ${clause}
     ORDER BY p.payroll_year DESC, p.payroll_month DESC, e.full_name
     LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
    values
  );
  const count = await q<{ count: string }>(
    undefined,
    `SELECT COUNT(*)::text AS count
     FROM finance_employee_payslips p
     JOIN finance_employees e ON e.id = p.employee_id
     ${clause}`,
    values
  );
  return { rows, total: Number(count.rows[0]?.count || 0), page, pageSize };
}

export async function getPayslip(id: string) {
  const { rows } = await q(
    undefined,
    `SELECT p.*, e.full_name AS employee_name, e.employee_code, e.department, e.designation, e.user_id AS employee_user_id
     FROM finance_employee_payslips p
     JOIN finance_employees e ON e.id = p.employee_id
     WHERE p.id = $1`,
    [id]
  );
  if (!rows[0]) throw new FinanceNotFoundError('Payslip not found');
  return rows[0];
}

export async function listMyPayslips(employeeId: string) {
  const { rows } = await q(
    undefined,
    `SELECT p.id, p.payroll_month, p.payroll_year, p.financial_year, p.payslip_date, p.uploaded_at, p.original_filename
     FROM finance_employee_payslips p
     WHERE p.employee_id = $1
     ORDER BY p.payroll_year DESC, p.payroll_month DESC`,
    [employeeId]
  );
  return rows;
}

async function persistPayslipFile(file: File, employeeCode: string, year: number, month: number) {
  if ((file.type || '').toLowerCase() !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    throw new FinanceValidationError('Payslips must be PDF files');
  }
  return saveFinanceFile(file, 'payslips', {
    pdfOnly: true,
    displayName: storedPayslipName(employeeCode, year, month),
  });
}

export async function uploadPayslip(body: Record<string, unknown>, file: File, userId: string) {
  let employeeId = String(body.employee_id || '').trim();
  if (!employeeId) {
    const employee = await upsertEmployee(body, userId);
    employeeId = employee.id;
  }
  const { rows: empRows } = await q(undefined, 'SELECT * FROM finance_employees WHERE id = $1', [employeeId]);
  const employee = empRows[0];
  if (!employee) throw new FinanceNotFoundError('Employee not found');
  const month = Number(body.payroll_month || body.month);
  const year = Number(body.payroll_year || body.year);
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new FinanceValidationError('Payroll month is invalid');
  if (!Number.isInteger(year) || year < 2000) throw new FinanceValidationError('Payroll year is invalid');
  const fy =
    String(body.financial_year || '').trim() ||
    financialYearFromDate(`${year}-${String(month).padStart(2, '0')}-01`).label;
  const payslipDate = body.payslip_date ? String(body.payslip_date) : `${year}-${String(month).padStart(2, '0')}-01`;
  const stored = await persistPayslipFile(file, employee.employee_code, year, month);

  return withFinanceTx(async (db) => {
    const existing = await q(
      db,
      `SELECT * FROM finance_employee_payslips WHERE employee_id = $1 AND payroll_month = $2 AND payroll_year = $3`,
      [employeeId, month, year]
    );
    if (existing.rows[0]) {
      throw new FinanceConflictError('A payslip already exists for this employee and month. Use Replace instead.');
    }
    const { rows } = await q(
      db,
      `INSERT INTO finance_employee_payslips (
         employee_id, payroll_month, payroll_year, financial_year, payslip_date, storage_path,
         original_filename, stored_filename, mime_type, file_size, remarks, uploaded_by, created_by, updated_by
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$12,$12)
       RETURNING *`,
      [
        employeeId,
        month,
        year,
        fy,
        payslipDate,
        stored.storage_path,
        stored.original_filename,
        stored.stored_filename,
        stored.mime_type,
        stored.file_size,
        body.remarks || null,
        userId,
      ]
    );
    await registerDocument(db, {
      documentType: 'payslip',
      referenceType: 'payslip',
      referenceId: rows[0].id,
      documentDate: payslipDate,
      originalFilename: stored.original_filename,
      storedFilename: stored.stored_filename,
      storagePath: stored.storage_path,
      mimeType: stored.mime_type,
      fileSize: stored.file_size,
      notes: `Payslip ${employee.employee_code} ${year}-${String(month).padStart(2, '0')}`,
      userId,
    });
    await writeFinanceAudit(db, {
      userId,
      action: 'Payslip Uploaded',
      entityType: 'payslip',
      entityId: rows[0].id,
      next: rows[0],
    });
    return rows[0];
  });
}

export async function replacePayslip(id: string, file: File, remarks: string | null, userId: string) {
  const current = await getPayslip(id);
  const stored = await persistPayslipFile(file, current.employee_code, Number(current.payroll_year), Number(current.payroll_month));
  const { rows } = await q(
    undefined,
    `UPDATE finance_employee_payslips SET
       previous_storage_path = storage_path,
       previous_original_filename = original_filename,
       storage_path=$2, original_filename=$3, stored_filename=$4, mime_type=$5, file_size=$6,
       remarks=COALESCE($7, remarks), replaced_by=$8, replaced_at=NOW(), uploaded_by=$8, uploaded_at=NOW(), updated_by=$8
     WHERE id=$1 RETURNING *`,
    [id, stored.storage_path, stored.original_filename, stored.stored_filename, stored.mime_type, stored.file_size, remarks, userId]
  );
  await registerDocument(undefined, {
    documentType: 'payslip',
    referenceType: 'payslip',
    referenceId: id,
    documentDate: current.payslip_date,
    originalFilename: stored.original_filename,
    storedFilename: stored.stored_filename,
    storagePath: stored.storage_path,
    mimeType: stored.mime_type,
    fileSize: stored.file_size,
    notes: 'Replaced payslip',
    userId,
  });
  await writeFinanceAudit(undefined, {
    userId,
    action: 'Payslip Replaced',
    entityType: 'payslip',
    entityId: id,
    previous: {
      storage_path: current.storage_path,
      original_filename: current.original_filename,
    },
    next: rows[0],
  });
  return rows[0];
}

export async function assertPayslipDownloadAccess(payslipId: string, user: { id: string; email?: string; role?: string }) {
  const payslip = await getPayslip(payslipId);
  if (user.role === 'SUPER_ADMIN') return payslip;
  const employee = await findEmployeeForUser(user.id, user.email);
  if (!employee || employee.id !== payslip.employee_id) {
    throw new FinanceForbiddenError('You can only download your own payslip');
  }
  return payslip;
}
