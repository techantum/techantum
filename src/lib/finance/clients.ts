import { writeFinanceAudit } from './audit';
import { CLIENT_TYPES, isIndianClientType, type ClientType } from './client-types';
import { q } from './db';
import { FinanceConflictError, FinanceNotFoundError, FinanceValidationError } from './errors';
import { fromCents, toCents } from './money';

export { CLIENT_TYPES, clientTypeLabel, isIndianClientType } from './client-types';
export type { ClientType } from './client-types';

function asType(value: unknown): ClientType {
  const text = String(value || '').trim();
  if (CLIENT_TYPES.some((t) => t.value === text)) return text as ClientType;
  throw new FinanceValidationError('Client type is required');
}

function billingAddress(input: Record<string, unknown>) {
  return [input.address_line1, input.address_line2, input.city, input.district, input.state, input.pincode, input.country]
    .map((v) => String(v || '').trim())
    .filter(Boolean)
    .join(', ');
}

export async function listFinanceCurrencies() {
  const { rows } = await q(
    undefined,
    `SELECT code, name FROM finance_currencies WHERE active = TRUE ORDER BY sort_order, code`
  );
  return rows;
}

export async function listFinanceClientsDetailed(params: {
  q?: string;
  status?: string;
  clientType?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize || 25));
  const where: string[] = [];
  const values: unknown[] = [];
  if (params.status) {
    values.push(params.status);
    where.push(`c.status = $${values.length}`);
  }
  if (params.clientType) {
    values.push(params.clientType);
    where.push(`c.client_type = $${values.length}`);
  }
  if (params.q) {
    values.push(`%${params.q}%`);
    where.push(
      `(c.name ILIKE $${values.length} OR c.client_code ILIKE $${values.length} OR c.email ILIKE $${values.length} OR c.gstin ILIKE $${values.length} OR c.contact_person ILIKE $${values.length})`
    );
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const { rows } = await q(
    undefined,
    `SELECT c.id, c.client_code, c.name, c.client_type, c.contact_person, c.country, c.state, c.email,
            c.contact_number, c.gstin, c.status, c.default_currency,
            COALESCE(s.invoice_count, 0)::int AS invoice_count,
            COALESCE(s.total_invoiced, 0)::text AS total_invoiced,
            COALESCE(s.outstanding, 0)::text AS outstanding_amount
     FROM ops_clients c
     LEFT JOIN (
       SELECT client_id,
              COUNT(*) FILTER (WHERE invoice_status IN ('finalized','sent')) AS invoice_count,
              SUM(total_amount) FILTER (WHERE invoice_status IN ('finalized','sent')) AS total_invoiced,
              SUM(outstanding_amount) FILTER (WHERE invoice_status IN ('finalized','sent')) AS outstanding
       FROM finance_invoices
       GROUP BY client_id
     ) s ON s.client_id = c.id
     ${clause}
     ORDER BY c.name
     LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
    values
  );
  const count = await q<{ count: string }>(undefined, `SELECT COUNT(*)::text AS count FROM ops_clients c ${clause}`, values);
  return { rows, total: Number(count.rows[0]?.count || 0), page, pageSize };
}

export async function getFinanceClientDetail(id: string) {
  const { rows } = await q(undefined, 'SELECT * FROM ops_clients WHERE id = $1', [id]);
  if (!rows[0]) throw new FinanceNotFoundError('Client not found');
  const client = rows[0];
  const projects = await q(
    undefined,
    `SELECT id, project_code, project_name, status, start_date, current_end_date
     FROM ops_projects WHERE client_id = $1 ORDER BY created_at DESC`,
    [id]
  );
  const invoices = await q(
    undefined,
    `SELECT id, invoice_number, invoice_date, due_date, currency, total_amount, amount_received, outstanding_amount,
            payment_status, invoice_status
     FROM finance_invoices
     WHERE client_id = $1
     ORDER BY invoice_date DESC, created_at DESC`,
    [id]
  );
  const payments = await q(
    undefined,
    `SELECT p.id, p.payment_date, p.amount_received, p.tds_deducted, p.payment_mode, p.transaction_reference,
            p.status, i.invoice_number
     FROM finance_invoice_payments p
     JOIN finance_invoices i ON i.id = p.invoice_id
     WHERE p.client_id = $1
     ORDER BY p.payment_date DESC, p.created_at DESC`,
    [id]
  );
  const totals = invoices.rows
    .filter((r) => r.invoice_status === 'finalized' || r.invoice_status === 'sent')
    .reduce(
      (acc, r) => ({
        invoiced: acc.invoiced + toCents(r.total_amount),
        received: acc.received + toCents(r.amount_received),
        outstanding: acc.outstanding + toCents(r.outstanding_amount),
      }),
      { invoiced: 0, received: 0, outstanding: 0 }
    );
  return {
    client,
    projects: projects.rows,
    invoices: invoices.rows,
    payments: payments.rows,
    totals: {
      totalInvoiced: fromCents(totals.invoiced),
      totalReceived: fromCents(totals.received),
      outstanding: fromCents(totals.outstanding),
    },
  };
}

function validateClientPayload(body: Record<string, unknown>) {
  const name = String(body.name || body.client_name || '').trim();
  if (!name) throw new FinanceValidationError('Company / client name is required');
  const clientType = asType(body.client_type);
  const indian = isIndianClientType(clientType);
  const gstRegistered = body.gst_registered === true || body.gst_registered === 'true' || body.gst_registered === 'Yes';
  const gstin = String(body.gstin || '').trim();
  if (indian && gstRegistered && !gstin) {
    throw new FinanceValidationError('GSTIN is required when the client is GST registered');
  }
  const country = indian ? 'India' : String(body.country || '').trim();
  if (!indian && !country) throw new FinanceValidationError('Country is required for international clients');
  const currency = String(body.default_currency || (indian ? 'INR' : '')).trim() || (indian ? 'INR' : 'USD');
  return {
    name,
    clientType,
    indian,
    gstRegistered,
    gstin: gstin || null,
    country,
    currency,
    email: String(body.email || '').trim() || null,
    contact_person: String(body.contact_person || '').trim() || null,
    contact_number: String(body.contact_number || body.primary_phone || body.phone || '').trim() || null,
    alternate_phone: String(body.alternate_phone || '').trim() || null,
    website: String(body.website || '').trim() || null,
    address_line1: String(body.address_line1 || '').trim() || null,
    address_line2: String(body.address_line2 || '').trim() || null,
    city: String(body.city || '').trim() || null,
    district: String(body.district || '').trim() || null,
    state: String(body.state || body.region || '').trim() || null,
    state_code: indian ? String(body.state_code || '').trim() || null : String(body.state_code || '').trim() || null,
    pincode: String(body.pincode || body.postal_code || '').trim() || null,
    pan: indian ? String(body.pan || '').trim() || null : null,
    legal_business_name: String(body.legal_business_name || '').trim() || null,
    trade_name: String(body.trade_name || '').trim() || null,
    tax_vat_number: indian ? null : String(body.tax_vat_number || '').trim() || null,
    business_registration_number: indian ? null : String(body.business_registration_number || '').trim() || null,
    company_registration_number: indian ? null : String(body.company_registration_number || '').trim() || null,
    default_payment_terms: String(body.default_payment_terms || '').trim() || null,
    billing_notes: String(body.billing_notes || body.notes || '').trim() || null,
    status: String(body.status || 'active') === 'inactive' ? 'inactive' : 'active',
  };
}

export async function createFinanceClient(body: Record<string, unknown>, userId: string) {
  const v = validateClientPayload(body);
  const { rows: codeRows } = await q<{ code: string }>(undefined, `SELECT ops_next_code('client') AS code`);
  const code = codeRows[0]?.code;
  if (!code) throw new FinanceValidationError('Could not allocate a client code');
  const address = billingAddress({ ...v });
  const { rows } = await q(
    undefined,
    `INSERT INTO ops_clients (
       client_code, name, client_type, contact_person, email, contact_number, alternate_phone, website,
       address_line1, address_line2, city, district, state, state_code, pincode, country, billing_address,
       gst_registered, gstin, pan, legal_business_name, trade_name, tax_vat_number,
       business_registration_number, company_registration_number, default_currency, default_payment_terms,
       billing_notes, status, created_by, updated_by
     ) VALUES (
       $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$30
     ) RETURNING *`,
    [
      code,
      v.name,
      v.clientType,
      v.contact_person,
      v.email,
      v.contact_number,
      v.alternate_phone,
      v.website,
      v.address_line1,
      v.address_line2,
      v.city,
      v.district,
      v.state,
      v.state_code,
      v.pincode,
      v.country,
      address || null,
      v.gstRegistered,
      v.gstin,
      v.pan,
      v.legal_business_name,
      v.trade_name,
      v.tax_vat_number,
      v.business_registration_number,
      v.company_registration_number,
      v.currency,
      v.default_payment_terms,
      v.billing_notes,
      v.status,
      userId,
    ]
  );
  await writeFinanceAudit(undefined, {
    userId,
    action: 'Client Created',
    entityType: 'client',
    entityId: rows[0].id,
    next: rows[0],
  });
  return rows[0];
}

export async function updateFinanceClient(id: string, body: Record<string, unknown>, userId: string) {
  const existing = await q(undefined, 'SELECT * FROM ops_clients WHERE id = $1', [id]);
  if (!existing.rows[0]) throw new FinanceNotFoundError('Client not found');
  const previous = existing.rows[0];
  const v = validateClientPayload({ ...previous, ...body, name: body.name || body.client_name || previous.name });
  const address = billingAddress({ ...v });
  const { rows } = await q(
    undefined,
    `UPDATE ops_clients SET
       name=$2, client_type=$3, contact_person=$4, email=$5, contact_number=$6, alternate_phone=$7, website=$8,
       address_line1=$9, address_line2=$10, city=$11, district=$12, state=$13, state_code=$14, pincode=$15,
       country=$16, billing_address=$17, gst_registered=$18, gstin=$19, pan=$20, legal_business_name=$21,
       trade_name=$22, tax_vat_number=$23, business_registration_number=$24, company_registration_number=$25,
       default_currency=$26, default_payment_terms=$27, billing_notes=$28, status=$29, updated_by=$30
     WHERE id=$1 RETURNING *`,
    [
      id,
      v.name,
      v.clientType,
      v.contact_person,
      v.email,
      v.contact_number,
      v.alternate_phone,
      v.website,
      v.address_line1,
      v.address_line2,
      v.city,
      v.district,
      v.state,
      v.state_code,
      v.pincode,
      v.country,
      address || previous.billing_address,
      v.gstRegistered,
      v.gstin,
      v.pan,
      v.legal_business_name,
      v.trade_name,
      v.tax_vat_number,
      v.business_registration_number,
      v.company_registration_number,
      v.currency,
      v.default_payment_terms,
      v.billing_notes,
      v.status,
      userId,
    ]
  );
  if (previous.status !== rows[0].status) {
    await writeFinanceAudit(undefined, {
      userId,
      action: 'Client Status Changed',
      entityType: 'client',
      entityId: id,
      previous: { status: previous.status },
      next: { status: rows[0].status },
    });
  }
  return rows[0];
}

export async function setFinanceClientStatus(id: string, status: string, userId: string) {
  const next = status === 'inactive' ? 'inactive' : 'active';
  const existing = await q(undefined, 'SELECT id, status FROM ops_clients WHERE id = $1', [id]);
  if (!existing.rows[0]) throw new FinanceNotFoundError('Client not found');
  const { rows } = await q(
    undefined,
    `UPDATE ops_clients SET status=$2, updated_by=$3 WHERE id=$1 RETURNING *`,
    [id, next, userId]
  );
  await writeFinanceAudit(undefined, {
    userId,
    action: 'Client Status Changed',
    entityType: 'client',
    entityId: id,
    previous: { status: existing.rows[0].status },
    next: { status: next },
  });
  return rows[0];
}

export async function deleteFinanceClient(id: string) {
  const invoices = await q(undefined, `SELECT id FROM finance_invoices WHERE client_id = $1 LIMIT 1`, [id]);
  if (invoices.rows[0]) {
    throw new FinanceConflictError('This client has invoices and cannot be deleted. Mark the client inactive instead.');
  }
  throw new FinanceConflictError('Clients are retained for billing history. Mark the client inactive instead of deleting.');
}
