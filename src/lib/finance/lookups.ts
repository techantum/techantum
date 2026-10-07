import { q } from './db';

export async function listFinanceClients(search?: string) {
  const { rows } = await q(
    undefined,
    `SELECT id, client_code, name, email, contact_number, contact_person, billing_address, city, state, state_code,
            country, pincode, gstin, pan, status, location, client_type, default_currency, gst_registered,
            address_line1, address_line2, district
     FROM ops_clients
     WHERE status IS DISTINCT FROM 'inactive'
       AND ($1::text IS NULL OR name ILIKE $1 OR client_code ILIKE $1 OR email ILIKE $1 OR gstin ILIKE $1)
     ORDER BY name ASC`,
    [search ? `%${search}%` : null]
  );
  return rows;
}

export async function getFinanceClient(id: string) {
  const { rows } = await q(undefined, 'SELECT * FROM ops_clients WHERE id = $1', [id]);
  return rows[0] || null;
}

export async function updateClientBilling(id: string, patch: Record<string, unknown>, userId: string) {
  const allowed = [
    'contact_person',
    'billing_address',
    'city',
    'state',
    'state_code',
    'country',
    'pincode',
    'gstin',
    'pan',
    'status',
    'email',
    'contact_number',
  ];
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const key of allowed) {
    if (!(key in patch)) continue;
    values.push(patch[key] || null);
    sets.push(`${key} = $${values.length}`);
  }
  if (!sets.length) return getFinanceClient(id);
  values.push(userId);
  sets.push(`updated_by = $${values.length}`);
  values.push(id);
  const { rows } = await q(undefined, `UPDATE ops_clients SET ${sets.join(', ')} WHERE id = $${values.length} RETURNING *`, values);
  return rows[0];
}

export async function listFinanceProjects(clientId?: string) {
  const { rows } = await q(
    undefined,
    `SELECT id, project_code, project_name, client_id, status
     FROM ops_projects
     WHERE ($1::uuid IS NULL OR client_id = $1)
     ORDER BY created_at DESC`,
    [clientId || null]
  );
  return rows;
}

export async function listServices(activeOnly = false) {
  const { rows } = await q(
    undefined,
    `SELECT * FROM finance_services ${activeOnly ? 'WHERE active = TRUE' : ''} ORDER BY service_name`
  );
  return rows;
}

export async function upsertService(input: Record<string, unknown>, userId: string, id?: string) {
  if (id) {
    const { rows } = await q(
      undefined,
      `UPDATE finance_services
       SET service_name=$1, description=$2, sac_hsn=$3, default_rate=$4, gst_rate=$5, unit=$6, active=$7, updated_by=$8
       WHERE id=$9 RETURNING *`,
      [
        input.service_name,
        input.description || null,
        input.sac_hsn || null,
        input.default_rate || 0,
        input.gst_rate ?? 18,
        input.unit || 'Nos',
        input.active !== false,
        userId,
        id,
      ]
    );
    return rows[0];
  }
  const { rows } = await q(
    undefined,
    `INSERT INTO finance_services (service_name, description, sac_hsn, default_rate, gst_rate, unit, active, created_by, updated_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8) RETURNING *`,
    [
      input.service_name,
      input.description || null,
      input.sac_hsn || null,
      input.default_rate || 0,
      input.gst_rate ?? 18,
      input.unit || 'Nos',
      input.active !== false,
      userId,
    ]
  );
  return rows[0];
}

export async function listIncomeCategories(activeOnly = false) {
  const { rows } = await q(
    undefined,
    `SELECT * FROM finance_income_categories ${activeOnly ? 'WHERE active = TRUE' : ''} ORDER BY category_name`
  );
  return rows;
}

export async function listExpenseCategories(activeOnly = false) {
  const { rows } = await q(
    undefined,
    `SELECT * FROM finance_expense_categories ${activeOnly ? 'WHERE active = TRUE' : ''} ORDER BY category_name`
  );
  return rows;
}

export const listReceiptCategories = listExpenseCategories;

export async function upsertCategory(
  table: 'finance_income_categories' | 'finance_expense_categories',
  input: { category_name: string; category_code: string; active?: boolean },
  id?: string
) {
  if (id) {
    const { rows } = await q(
      undefined,
      `UPDATE ${table} SET category_name=$1, category_code=$2, active=$3 WHERE id=$4 RETURNING *`,
      [input.category_name, input.category_code, input.active !== false, id]
    );
    return rows[0];
  }
  const { rows } = await q(
    undefined,
    `INSERT INTO ${table} (category_name, category_code, active) VALUES ($1,$2,$3) RETURNING *`,
    [input.category_name, input.category_code, input.active !== false]
  );
  return rows[0];
}

export async function categoryIdByCode(table: 'finance_income_categories' | 'finance_expense_categories', code: string) {
  const { rows } = await q(undefined, `SELECT id FROM ${table} WHERE category_code = $1`, [code]);
  return rows[0]?.id as string | undefined;
}
