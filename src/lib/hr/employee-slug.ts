/** Human-readable employee path segments for admin HR URLs. */

export function slugifyEmployeePart(value: string) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export type EmployeeSlugSource = {
  id?: string | null;
  full_name?: string | null;
  employee_code?: string | null;
};

export function employeeNameSlug(employee: EmployeeSlugSource) {
  return slugifyEmployeePart(String(employee.full_name || '')) || 'employee';
}

/** Stable unique slug: name when unique, otherwise name + employee code. */
export function employeeSlug(employee: EmployeeSlugSource, peers: EmployeeSlugSource[] = []) {
  const base = employeeNameSlug(employee);
  const code = slugifyEmployeePart(String(employee.employee_code || ''));
  const sameName = peers.filter((peer) => employeeNameSlug(peer) === base);
  if (sameName.length <= 1) return base;
  return code ? `${base}-${code}` : `${base}-${String(employee.id || '').slice(0, 8)}`;
}

export function employeeAdminPath(employee: EmployeeSlugSource, peers: EmployeeSlugSource[] = []) {
  return `/admin/hr/employees/${employeeSlug(employee, peers)}`;
}

export function findEmployeeBySlug<T extends EmployeeSlugSource>(rows: T[], slug: string): T | undefined {
  const key = String(slug || '').trim().toLowerCase();
  if (!key) return undefined;
  const byId = rows.find((row) => String(row.id || '').toLowerCase() === key);
  if (byId) return byId;
  const byCode = rows.find((row) => slugifyEmployeePart(String(row.employee_code || '')) === key);
  if (byCode) return byCode;
  const byExact = rows.find((row) => employeeSlug(row, rows) === key);
  if (byExact) return byExact;
  return rows.find((row) => employeeNameSlug(row) === key);
}
