import { existsSync } from 'fs';
import { unlink } from 'fs/promises';
import { writeFinanceAudit } from './audit';
import { q, withFinanceTx } from './db';
import { FinanceConflictError, FinanceForbiddenError, FinanceNotFoundError, FinanceValidationError } from './errors';
import { assertISODate, financialYearAliases, financialYearFromDate } from './fy';
import { fromCents, toCents } from './money';
import { generatePayslipPdf } from './payslip-pdf';
import { figuresForApprovedPayroll } from '../hr/payslip-map';
import { daysInMonth, payslipTotals, salaryFromAnnualCtc } from './salary';
import { getFinanceSettings } from './settings';
import { absoluteFinancePath, saveFinanceBuffer, saveFinanceFile, sanitizeFilename } from './storage';
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

export async function listEmployees(params?: { q?: string; status?: string; department?: string }) {
  const values: unknown[] = [];
  const where: string[] = [];
  if (params?.status) {
    values.push(params.status);
    where.push(`status = $${values.length}`);
  }
  if (params?.department) {
    values.push(params.department);
    where.push(`department = $${values.length}`);
  }
  if (params?.q) {
    values.push(`%${params.q}%`);
    where.push(
      `(full_name ILIKE $${values.length} OR employee_code ILIKE $${values.length} OR email ILIKE $${values.length} OR phone ILIKE $${values.length})`
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

function cleanText(value: unknown) {
  const text = String(value ?? '').trim();
  return text || null;
}

function optionalDate(value: unknown, label: string) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  return assertISODate(text, label);
}

function optionalCtc(value: unknown) {
  if (value == null || String(value).trim() === '') return null;
  const cents = toCents(value);
  if (cents <= 0) throw new FinanceValidationError('Annual CTC must be greater than 0');
  return fromCents(cents);
}

function employeeProfile(body: Record<string, unknown>) {
  const requireProfile = body.require_profile === true || body.require_profile === '1' || body.require_profile === 'true';
  const dateOfBirth = optionalDate(body.date_of_birth, 'Date of birth');
  const dateOfJoining = optionalDate(body.date_of_joining, 'Date of joining');
  const designation = cleanText(body.designation);
  const department = cleanText(body.department);
  const bankName = cleanText(body.bank_name);
  const bankAccount = cleanText(body.bank_account_no)?.replace(/\s+/g, '') || null;
  const pan = cleanText(body.pan)?.toUpperCase() || null;
  const location = cleanText(body.work_location || body.location);
  const annualCtc = optionalCtc(body.annual_ctc);
  const lastWorkingDate = optionalDate(body.last_working_date, 'Last working date');
  const phone = cleanText(body.phone);
  const genderRaw = cleanText(body.gender)?.toLowerCase() || null;
  const gender = genderRaw && ['male', 'female', 'other'].includes(genderRaw) ? genderRaw : genderRaw ? null : null;
  if (cleanText(body.gender) && !gender) throw new FinanceValidationError('Choose a gender');
  const emergencyContact = cleanText(body.emergency_contact);
  const typeRaw = cleanText(body.employee_type);
  const employeeType = typeRaw && ['full_time', 'part_time', 'contract', 'intern'].includes(typeRaw) ? typeRaw : null;
  if (typeRaw && !employeeType) throw new FinanceValidationError('Choose an employee type');
  const managerId = cleanText(body.reporting_manager_id);
  const aadhaar = cleanText(body.aadhaar)?.replace(/\s+/g, '') || null;
  const ifsc = cleanText(body.ifsc_code)?.toUpperCase() || null;
  const uan = cleanText(body.uan);
  const currentAddress = cleanText(body.current_address);
  const permanentAddress = cleanText(body.permanent_address);
  const notes = cleanText(body.notes);
  if (pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
    throw new FinanceValidationError('PAN must look like ABCDE1234F');
  }
  if (bankAccount && !/^\d{9,18}$/.test(bankAccount)) {
    throw new FinanceValidationError('Bank account number must be 9 to 18 digits');
  }
  if (phone && !/^\+?[0-9]{10,15}$/.test(phone.replace(/[\s-]/g, ''))) {
    throw new FinanceValidationError('Phone must be 10 to 15 digits');
  }
  if (aadhaar && !/^\d{12}$/.test(aadhaar)) throw new FinanceValidationError('Aadhaar must be 12 digits');
  if (ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) throw new FinanceValidationError('IFSC must look like HDFC0001234');
  if (dateOfBirth && dateOfJoining && dateOfJoining < dateOfBirth) {
    throw new FinanceValidationError('Date of joining cannot be before date of birth');
  }
  if (dateOfJoining && lastWorkingDate && lastWorkingDate < dateOfJoining) {
    throw new FinanceValidationError('Last working date cannot be before the joining date');
  }
  if (requireProfile) {
    const missing = [
      !phone ? 'phone' : '',
      !gender ? 'gender' : '',
      !emergencyContact ? 'emergency contact' : '',
      !dateOfJoining ? 'date of joining' : '',
      !designation ? 'designation' : '',
      !location ? 'work location' : '',
      !annualCtc ? 'annual CTC' : '',
      !pan ? 'PAN' : '',
      !aadhaar ? 'Aadhaar' : '',
      !bankName ? 'bank name' : '',
      !bankAccount ? 'bank account number' : '',
      !ifsc ? 'IFSC code' : '',
      !currentAddress ? 'current address' : '',
      !permanentAddress ? 'permanent address' : '',
    ].filter(Boolean);
    if (missing.length) throw new FinanceValidationError(`Employee needs ${missing.join(', ')}`);
  }
  return {
    requireProfile,
    dateOfBirth,
    dateOfJoining,
    designation,
    department,
    bankName,
    bankAccount,
    pan,
    location,
    annualCtc,
    lastWorkingDate,
    phone: phone ? phone.replace(/[\s-]/g, '') : null,
    gender,
    emergencyContact,
    employeeType,
    managerId,
    aadhaar,
    ifsc,
    uan,
    currentAddress,
    permanentAddress,
    notes,
    status: String(body.status || 'active') === 'inactive' ? 'inactive' : 'active',
    employmentStatus: ['probation', 'regular', 'part_time'].includes(String(body.employment_status || '')) ? String(body.employment_status) : null,
  };
}

export async function upsertEmployee(body: Record<string, unknown>, userId: string, id?: string) {
  const code = String(body.employee_code || body.employee_id || '').trim().toUpperCase();
  const name = String(body.full_name || body.employee_name || '').trim();
  if (!code) throw new FinanceValidationError('Employee ID is required');
  if (!name) throw new FinanceValidationError('Employee name is required');
  const email = String(body.email || '').trim().toLowerCase() || null;
  const profile = employeeProfile(body);
  const values = [
    code,
    name,
    email,
    body.user_id || null,
    profile.department,
    profile.designation,
    profile.status,
    userId,
    profile.dateOfBirth,
    profile.dateOfJoining,
    profile.bankName,
    profile.bankAccount,
    profile.pan,
    profile.location,
    profile.annualCtc,
    profile.lastWorkingDate,
    profile.phone,
    profile.gender,
    profile.emergencyContact,
    profile.employeeType,
    profile.managerId,
    profile.aadhaar,
    profile.ifsc,
    profile.uan,
    profile.currentAddress,
    profile.permanentAddress,
    profile.notes,
    profile.employmentStatus,
  ];
  if (profile.managerId && profile.managerId === id) throw new FinanceValidationError('An employee cannot report to themselves');
  if (profile.managerId) {
    const manager = await q(undefined, `SELECT id FROM finance_employees WHERE id=$1`, [profile.managerId]);
    if (!manager.rows[0]) throw new FinanceValidationError('Choose a reporting manager from the employee list');
  }
  if (id) {
    const { rows } = await q(
      undefined,
      `UPDATE finance_employees SET
         employee_code=$2, full_name=$3, email=$4, user_id=$5, department=$6, designation=$7, status=$8,
         updated_by=$9, date_of_birth=$10, date_of_joining=$11, bank_name=$12, bank_account_no=$13,
         pan=$14, work_location=$15, annual_ctc=$16, last_working_date=$17,
         phone=$18, gender=$19, emergency_contact=$20, employee_type=$21, reporting_manager_id=$22,
         aadhaar=$23, ifsc_code=$24, uan=$25, current_address=$26, permanent_address=$27, notes=$28,
         employment_status=COALESCE($29, employment_status)
       WHERE id=$1 RETURNING *`,
      [id, ...values]
    );
    if (!rows[0]) throw new FinanceNotFoundError('Employee not found');
    return rows[0];
  }
  const conflict = profile.requireProfile
    ? `full_name = EXCLUDED.full_name,
       email = EXCLUDED.email,
       department = EXCLUDED.department,
       designation = EXCLUDED.designation,
       status = EXCLUDED.status,
       date_of_birth = EXCLUDED.date_of_birth,
       date_of_joining = EXCLUDED.date_of_joining,
       bank_name = EXCLUDED.bank_name,
       bank_account_no = EXCLUDED.bank_account_no,
       pan = EXCLUDED.pan,
       work_location = EXCLUDED.work_location,
       annual_ctc = EXCLUDED.annual_ctc,
       last_working_date = EXCLUDED.last_working_date,
       phone = EXCLUDED.phone,
       gender = EXCLUDED.gender,
       emergency_contact = EXCLUDED.emergency_contact,
       employee_type = EXCLUDED.employee_type,
       reporting_manager_id = EXCLUDED.reporting_manager_id,
       aadhaar = EXCLUDED.aadhaar,
       ifsc_code = EXCLUDED.ifsc_code,
       uan = EXCLUDED.uan,
       current_address = EXCLUDED.current_address,
       permanent_address = EXCLUDED.permanent_address,
       notes = EXCLUDED.notes,
       employment_status = COALESCE($28, finance_employees.employment_status),
       updated_by = EXCLUDED.updated_by`
    : `full_name = EXCLUDED.full_name,
       email = COALESCE(EXCLUDED.email, finance_employees.email),
       department = COALESCE(EXCLUDED.department, finance_employees.department),
       designation = COALESCE(EXCLUDED.designation, finance_employees.designation),
       date_of_birth = COALESCE(EXCLUDED.date_of_birth, finance_employees.date_of_birth),
       date_of_joining = COALESCE(EXCLUDED.date_of_joining, finance_employees.date_of_joining),
       bank_name = COALESCE(EXCLUDED.bank_name, finance_employees.bank_name),
       bank_account_no = COALESCE(EXCLUDED.bank_account_no, finance_employees.bank_account_no),
       pan = COALESCE(EXCLUDED.pan, finance_employees.pan),
       work_location = COALESCE(EXCLUDED.work_location, finance_employees.work_location),
       annual_ctc = COALESCE(EXCLUDED.annual_ctc, finance_employees.annual_ctc),
       last_working_date = COALESCE(EXCLUDED.last_working_date, finance_employees.last_working_date),
       phone = COALESCE(EXCLUDED.phone, finance_employees.phone),
       gender = COALESCE(EXCLUDED.gender, finance_employees.gender),
       emergency_contact = COALESCE(EXCLUDED.emergency_contact, finance_employees.emergency_contact),
       employee_type = COALESCE(EXCLUDED.employee_type, finance_employees.employee_type),
       reporting_manager_id = COALESCE(EXCLUDED.reporting_manager_id, finance_employees.reporting_manager_id),
       aadhaar = COALESCE(EXCLUDED.aadhaar, finance_employees.aadhaar),
       ifsc_code = COALESCE(EXCLUDED.ifsc_code, finance_employees.ifsc_code),
       uan = COALESCE(EXCLUDED.uan, finance_employees.uan),
       current_address = COALESCE(EXCLUDED.current_address, finance_employees.current_address),
       permanent_address = COALESCE(EXCLUDED.permanent_address, finance_employees.permanent_address),
       notes = COALESCE(EXCLUDED.notes, finance_employees.notes),
       employment_status = COALESCE($28, finance_employees.employment_status),
       updated_by = EXCLUDED.updated_by`;
  const { rows } = await q(
    undefined,
    `INSERT INTO finance_employees (
       employee_code, full_name, email, user_id, department, designation, status, created_by, updated_by,
       date_of_birth, date_of_joining, bank_name, bank_account_no, pan, work_location, annual_ctc, last_working_date,
       phone, gender, emergency_contact, employee_type, reporting_manager_id, aadhaar, ifsc_code, uan,
       current_address, permanent_address, notes, employment_status
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,COALESCE($28,'regular'))
     ON CONFLICT (employee_code) DO UPDATE SET
       ${conflict}
     RETURNING *`,
    values
  );
  return rows[0];
}

export async function saveEmployeePhoto(id: string, file: File, userId: string) {
  if (file.size > 2 * 1024 * 1024) throw new FinanceValidationError('Profile photo must be 2 MB or smaller');
  const stored = await saveFinanceFile(file, 'employee-photos');
  if (!stored.mime_type.startsWith('image/')) throw new FinanceValidationError('Profile photo must be a JPG or PNG');
  const { rows } = await q(
    undefined,
    `UPDATE finance_employees SET photo_path=$2, updated_by=$3 WHERE id=$1 RETURNING id, photo_path`,
    [id, stored.storage_path, userId]
  );
  if (!rows[0]) throw new FinanceNotFoundError('Employee not found');
  return rows[0];
}

export async function employeePhoto(id: string) {
  const { rows } = await q(undefined, `SELECT photo_path FROM finance_employees WHERE id=$1`, [id]);
  if (!rows[0]?.photo_path) throw new FinanceNotFoundError('Profile photo not found');
  const storagePath = String(rows[0].photo_path);
  return { path: absoluteFinancePath(storagePath), mime: storagePath.endsWith('.png') ? 'image/png' : 'image/jpeg' };
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
  department?: string;
  fy?: string;
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
  if (params.department) {
    values.push(params.department);
    where.push(`e.department = $${values.length}`);
  }
  if (params.fy) {
    let keys = [params.fy];
    try {
      keys = financialYearAliases(params.fy);
    } catch {
      keys = [params.fy];
    }
    values.push(keys);
    where.push(`p.financial_year = ANY($${values.length}::text[])`);
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
  const departments = await q<{ department: string }>(
    undefined,
    `SELECT DISTINCT department FROM finance_employees WHERE NULLIF(BTRIM(department), '') IS NOT NULL ORDER BY department`
  );
  return {
    rows,
    total: Number(count.rows[0]?.count || 0),
    page,
    pageSize,
    departments: departments.rows.map((row) => row.department),
  };
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
  return saveFinanceFile(file, `payslips/${sanitizeFilename(employeeCode)}`, {
    pdfOnly: true,
    displayName: storedPayslipName(employeeCode, year, month),
  });
}

function isUniqueViolation(err: unknown) {
  return Boolean(err && typeof err === 'object' && 'code' in err && (err as { code?: string }).code === '23505');
}

function wholeDays(value: unknown, label: string, max: number) {
  const text = String(value ?? '').trim();
  if (!text) return 0;
  if (!/^\d+$/.test(text)) throw new FinanceValidationError(`${label} must be a whole number`);
  const days = Number(text);
  if (days > max) throw new FinanceValidationError(`${label} cannot be more than ${max}`);
  return days;
}

export async function generatePayslip(body: Record<string, unknown>, userId: string) {
  const employeeId = String(body.employee_id || '').trim();
  if (!employeeId) throw new FinanceValidationError('Select an employee');
  const { rows: empRows } = await q(undefined, 'SELECT * FROM finance_employees WHERE id = $1', [employeeId]);
  const employee = empRows[0];
  if (!employee) throw new FinanceNotFoundError('Employee not found');
  if (employee.status === 'inactive') throw new FinanceValidationError('This employee is inactive');

  const missing = [
    !employee.date_of_birth ? 'date of birth' : '',
    !employee.date_of_joining ? 'date of joining' : '',
    !employee.designation ? 'designation' : '',
    !employee.bank_name ? 'bank name' : '',
    !employee.bank_account_no ? 'bank account number' : '',
    !employee.pan ? 'PAN' : '',
    !employee.work_location ? 'location' : '',
    employee.annual_ctc == null || Number(employee.annual_ctc) <= 0 ? 'annual CTC' : '',
  ].filter(Boolean);
  if (missing.length) {
    throw new FinanceValidationError(`Add ${missing.join(', ')} on the employee before generating a payslip`);
  }

  const month = Number(body.payroll_month || body.month);
  const year = Number(body.payroll_year || body.year);
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new FinanceValidationError('Payroll month is invalid');
  if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new FinanceValidationError('Payroll year is invalid');
  const monthDays = daysInMonth(year, month);
  const payrollResult = await q(
    undefined,
    `SELECT * FROM hr_monthly_payroll WHERE employee_id = $1 AND payroll_year = $2 AND payroll_month = $3 AND is_current`,
    [employeeId, month, year]
  );
  const payroll = payrollResult.rows[0];
  let lopDays = 0;
  let lprDays = 0;
  let structure = salaryFromAnnualCtc(employee.annual_ctc);
  let totals = payslipTotals(structure, 0);
  let workingDays: number | null = null;
  let payableDays: number | null = null;
  let paidLeaveDays: number | null = null;
  let payrollId: string | null = null;
  let payrollRevision: number | null = null;
  if (payroll) {
    if (payroll.status !== 'approved' && payroll.status !== 'paid') {
      throw new FinanceValidationError('Approve monthly payroll before generating this payslip.');
    }
    const figures = figuresForApprovedPayroll(structure, {
      grossPayableCents: toCents(payroll.gross_payable),
      additionalCents: toCents(payroll.additional_earnings),
      lopDeductionCents: toCents(payroll.lop_deduction),
      otherDeductionCents: toCents(payroll.other_deductions),
      professionalTaxCents: toCents(payroll.professional_tax),
      pfCents: toCents(payroll.pf_amount),
      netPayableCents: toCents(payroll.net_payable),
    });
    structure = figures.structure;
    totals = figures;
    lopDays = Number(payroll.lop_days);
    lprDays = Number(payroll.paid_leave_days);
    workingDays = Number(payroll.company_working_days);
    payableDays = Number(payroll.payable_days);
    paidLeaveDays = Number(payroll.paid_leave_days);
    payrollId = payroll.id;
    payrollRevision = Number(payroll.revision);
  } else {
    lopDays = wholeDays(body.lop_days, 'LOP days', monthDays);
    lprDays = wholeDays(body.lpr_days, 'LPR days', monthDays);
    totals = payslipTotals(structure, body.lop_amount ?? body.lop ?? 0);
  }
  const fy = financialYearFromDate(`${year}-${String(month).padStart(2, '0')}-01`).label;
  const payslipDate = `${year}-${String(month).padStart(2, '0')}-${String(monthDays).padStart(2, '0')}`;
  const settings = await getFinanceSettings();
  const logoStored = settings.payslip_logo_path || settings.logo_path;
  let logoPath: string | null = null;
  if (logoStored) {
    try {
      const full = absoluteFinancePath(logoStored);
      logoPath = existsSync(full) ? full : null;
    } catch {
      logoPath = null;
    }
  }
  const pdf = await generatePayslipPdf({
    companyName: settings.company_name || 'Techantum Solutions',
    logoPath,
    headerRight: settings.payslip_header_right,
    signatoryName: settings.payslip_signatory_name,
    signatoryTitle: settings.payslip_signatory_title,
    employeeCode: employee.employee_code,
    fullName: employee.full_name,
    dateOfBirth: employee.date_of_birth,
    dateOfJoining: employee.date_of_joining,
    designation: employee.designation,
    bankName: employee.bank_name,
    bankAccountNo: employee.bank_account_no,
    pan: employee.pan,
    location: employee.work_location,
    payrollMonth: month,
    payrollYear: year,
    daysInMonth: monthDays,
    lopDays,
    lprDays,
    workingDays,
    payableDays,
    paidLeaveDays,
    otherDeductionCents: totals.otherCents,
    structure,
    lopCents: totals.lopCents,
    grossDeductionCents: totals.grossDeductionCents,
    netCents: totals.netCents,
  });
  const friendly = storedPayslipName(employee.employee_code, year, month);
  const stored = await saveFinanceBuffer(
    pdf,
    `payslips/${sanitizeFilename(employee.employee_code)}`,
    friendly,
    'application/pdf'
  );
  stored.original_filename = friendly;
  stored.stored_filename = friendly;

  try {
    return await withFinanceTx(async (db) => {
      const existing = await q(
        db,
        `SELECT * FROM finance_employee_payslips WHERE employee_id = $1 AND payroll_month = $2 AND payroll_year = $3`,
        [employeeId, month, year]
      );
      if (existing.rows[0] && body.revise !== true) {
        throw new FinanceConflictError('A payslip already exists for this employee and month.');
      }
      if (existing.rows[0] && !payrollId) {
        throw new FinanceConflictError('A payslip already exists for this employee and month.');
      }
      const amountValues = [
        monthDays,
        lopDays,
        lprDays,
        fromCents(structure.annualCtcCents),
        fromCents(structure.basicCents),
        fromCents(structure.hraCents),
        fromCents(structure.leaveEncashmentCents),
        fromCents(structure.specialAllowanceCents),
        fromCents(structure.pdaCents),
        fromCents(structure.convenienceCents),
        fromCents(structure.professionalTaxCents),
        fromCents(structure.pfCents),
        fromCents(totals.lopCents),
        fromCents(structure.monthlyGrossCents),
        fromCents(totals.grossDeductionCents),
        fromCents(totals.netCents),
        workingDays,
        payableDays,
        paidLeaveDays,
        payrollId,
        payrollRevision,
      ];
      if (existing.rows[0]) {
        const { rows } = await q(
          db,
          `UPDATE finance_employee_payslips SET
             previous_storage_path = storage_path,
             previous_original_filename = original_filename,
             storage_path=$2, original_filename=$3, stored_filename=$4, mime_type=$5, file_size=$6,
             source='generated', days_in_month=$7, lop_days=$8, lpr_days=$9, annual_ctc=$10,
             basic_amount=$11, hra_amount=$12, leave_encashment=$13, special_allowance=$14, pda_amount=$15,
             convenience_allowance=$16, professional_tax=$17, pf_amount=$18, lop_amount=$19,
             gross_earning=$20, gross_deduction=$21, net_pay=$22, working_days=$23, payable_days=$24,
             paid_leave_days=$25, payroll_id=$26, payroll_revision=$27,
             replaced_by=$28, replaced_at=NOW(), uploaded_by=$28, updated_by=$28
           WHERE id=$1 RETURNING *`,
          [existing.rows[0].id, stored.storage_path, stored.original_filename, stored.stored_filename, stored.mime_type, stored.file_size, ...amountValues, userId]
        );
        if (payrollId) {
          await q(db, 'UPDATE hr_monthly_payroll SET payslip_id=$2 WHERE id=$1', [payrollId, rows[0].id]);
        }
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
          notes: `Revised payslip ${employee.employee_code} ${year}-${String(month).padStart(2, '0')}`,
          userId,
        });
        await writeFinanceAudit(db, {
          userId,
          action: 'Payslip Revised From Payroll',
          entityType: 'payslip',
          entityId: rows[0].id,
          previous: { payroll_revision: existing.rows[0].payroll_revision },
          next: { payroll_id: payrollId, payroll_revision: payrollRevision, net_pay: rows[0].net_pay },
        });
        return rows[0];
      }
      const { rows } = await q(
        db,
        `INSERT INTO finance_employee_payslips (
           employee_id, payroll_month, payroll_year, financial_year, payslip_date, storage_path,
           original_filename, stored_filename, mime_type, file_size, remarks, uploaded_by, created_by, updated_by,
           source, days_in_month, lop_days, lpr_days, annual_ctc,
           basic_amount, hra_amount, leave_encashment, special_allowance, pda_amount, convenience_allowance,
           professional_tax, pf_amount, lop_amount, gross_earning, gross_deduction, net_pay,
           working_days, payable_days, paid_leave_days, payroll_id, payroll_revision
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$12,$12,
           'generated',$13,$14,$15,$16,
           $17,$18,$19,$20,$21,$22,
           $23,$24,$25,$26,$27,$28,
           $29,$30,$31,$32,$33
         )
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
          ...amountValues,
        ]
      );
      if (payrollId) {
        await q(db, 'UPDATE hr_monthly_payroll SET payslip_id=$2 WHERE id=$1', [payrollId, rows[0].id]);
      }
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
        notes: `Generated payslip ${employee.employee_code} ${year}-${String(month).padStart(2, '0')}`,
        userId,
      });
      await writeFinanceAudit(db, {
        userId,
        action: 'Payslip Generated',
        entityType: 'payslip',
        entityId: rows[0].id,
        next: rows[0],
      });
      return rows[0];
    });
  } catch (err) {
    await unlink(absoluteFinancePath(stored.storage_path)).catch(() => undefined);
    if (err instanceof FinanceConflictError || isUniqueViolation(err)) {
      throw new FinanceConflictError('A payslip already exists for this employee and month.');
    }
    throw err;
  }
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

export async function deletePayslip(id: string) {
  const payslip = await getPayslip(id);
  const docs = await q<{ storage_path: string }>(
    undefined,
    `SELECT storage_path FROM finance_documents WHERE reference_type = 'payslip' AND reference_id = $1`,
    [id]
  );
  await q(undefined, `DELETE FROM finance_documents WHERE reference_type = 'payslip' AND reference_id = $1`, [id]);
  await q(undefined, 'DELETE FROM finance_employee_payslips WHERE id = $1', [id]);
  const paths = [payslip.storage_path, payslip.previous_storage_path, ...docs.rows.map((row) => row.storage_path)].filter(Boolean);
  await Promise.all(
    paths.map((storagePath) => unlink(absoluteFinancePath(String(storagePath))).catch(() => undefined))
  );
  return { ok: true };
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
