import { writeFinanceAudit } from './audit';
import { calculateInvoice, invoiceOutstandingCents, paymentStatusFor, type InvoiceItemInput } from './calculate';
import { q, withFinanceTx, type DbClient } from './db';
import { registerDocument } from './documents';
import { FinanceConflictError, FinanceNotFoundError, FinanceValidationError } from './errors';
import { assertISODate, formatFinancialYear, todayISO } from './fy';
import { fromCents, toCents } from './money';
import { generateInvoicePdf } from './pdf';
import { getFinanceSettings } from './settings';
import { saveFinanceBuffer, sanitizeFilename } from './storage';
import type { TaxTreatment } from './gst';

function snapshotFromClient(client: Record<string, unknown>, body: Record<string, unknown>) {
  return {
    client_name: String(body.client_name || client.name || ''),
    client_address: String(
      body.client_address ||
        client.billing_address ||
        [client.address_line1, client.address_line2].filter(Boolean).join(', ') ||
        client.location ||
        ''
    ),
    client_city: String(body.client_city || client.city || ''),
    client_state: String(body.client_state || client.state || ''),
    client_state_code: String(body.client_state_code || client.state_code || ''),
    client_country: String(body.client_country || client.country || 'India'),
    client_pincode: String(body.client_pincode || client.pincode || ''),
    client_gstin: String(body.client_gstin || client.gstin || ''),
    client_pan: String(body.client_pan || client.pan || ''),
    client_email: String(body.client_email || client.email || ''),
    client_phone: String(body.client_phone || client.contact_number || ''),
  };
}

async function loadClient(client: DbClient, id: string) {
  const { rows } = await q(client, 'SELECT * FROM ops_clients WHERE id = $1', [id]);
  if (!rows[0]) throw new FinanceValidationError('Client is required');
  return rows[0];
}

function calcFromBody(body: Record<string, unknown>, settings: { state_code: string | null }) {
  const items = (Array.isArray(body.items) ? body.items : []) as InvoiceItemInput[];
  return calculateInvoice({
    items,
    supplierStateCode: String(body.supplier_state_code || settings.state_code || ''),
    placeOfSupplyStateCode: String(body.place_of_supply_state_code || body.place_of_supply || ''),
    taxTreatment: (body.tax_treatment as TaxTreatment) || 'auto',
    roundOff: body.round_off == null ? null : String(body.round_off),
  });
}

async function replaceItems(db: DbClient, invoiceId: string, calc: ReturnType<typeof calculateInvoice>) {
  await q(db, 'DELETE FROM finance_invoice_items WHERE invoice_id = $1', [invoiceId]);
  for (let i = 0; i < calc.items.length; i += 1) {
    const item = calc.items[i];
    await q(
      db,
      `INSERT INTO finance_invoice_items (
         invoice_id, line_no, service_id, description, sac_hsn, quantity, rate, discount_percentage, discount_amount,
         taxable_amount, gst_rate, cgst, sgst, igst, total_amount
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [
        invoiceId,
        i + 1,
        item.service_id,
        item.description,
        item.sac_hsn,
        item.quantity,
        item.rate,
        item.discount_percentage,
        item.discount_amount,
        item.taxable_amount,
        item.gst_rate,
        item.cgst,
        item.sgst,
        item.igst,
        item.total_amount,
      ]
    );
  }
}

export async function refreshInvoiceSettlement(db: DbClient, invoiceId: string, today = todayISO()) {
  const { rows: invRows } = await q(db, 'SELECT * FROM finance_invoices WHERE id = $1 FOR UPDATE', [invoiceId]);
  const invoice = invRows[0];
  if (!invoice) throw new FinanceNotFoundError('Invoice not found');
  const { rows: sums } = await q<{ received: string; tds: string; other: string }>(
    db,
    `SELECT COALESCE(SUM(amount_received),0)::text AS received,
            COALESCE(SUM(tds_deducted),0)::text AS tds,
            COALESCE(SUM(other_deduction),0)::text AS other
     FROM finance_invoice_payments WHERE invoice_id = $1 AND status = 'active'`,
    [invoiceId]
  );
  const received = toCents(sums[0]?.received);
  const tds = toCents(sums[0]?.tds);
  const other = toCents(sums[0]?.other);
  const total = toCents(invoice.total_amount);
  const outstanding = invoiceOutstandingCents({
    totalCents: total,
    receivedCents: received,
    tdsCents: tds,
    otherDeductionCents: other,
  });
  if (outstanding < 0) {
    throw new FinanceValidationError('Settlement cannot exceed invoice total. Record the excess as advance/credit separately.');
  }
  const paymentStatus =
    invoice.invoice_status === 'cancelled'
      ? invoice.payment_status
      : paymentStatusFor(outstanding, received + tds + other, invoice.due_date, today);
  await q(
    db,
    `UPDATE finance_invoices
     SET amount_received=$2, tds_deducted=$3, other_deduction=$4, outstanding_amount=$5, payment_status=$6
     WHERE id=$1`,
    [invoiceId, fromCents(received), fromCents(tds), fromCents(other), fromCents(outstanding), paymentStatus]
  );
  return { received, tds, other, outstanding, paymentStatus };
}

export async function listInvoices(params: {
  q?: string;
  from?: string;
  to?: string;
  clientId?: string;
  projectId?: string;
  paymentStatus?: string;
  invoiceStatus?: string;
  fy?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize || 25));
  const where: string[] = [];
  const values: unknown[] = [];
  if (params.from) {
    values.push(params.from);
    where.push(`i.invoice_date >= $${values.length}`);
  }
  if (params.to) {
    values.push(params.to);
    where.push(`i.invoice_date <= $${values.length}`);
  }
  if (params.clientId) {
    values.push(params.clientId);
    where.push(`i.client_id = $${values.length}`);
  }
  if (params.projectId) {
    values.push(params.projectId);
    where.push(`i.project_id = $${values.length}`);
  }
  if (params.paymentStatus) {
    values.push(params.paymentStatus);
    where.push(`i.payment_status = $${values.length}`);
  }
  if (params.invoiceStatus) {
    values.push(params.invoiceStatus);
    where.push(`i.invoice_status = $${values.length}`);
  }
  if (params.fy) {
    values.push(params.fy);
    where.push(`i.financial_year = $${values.length}`);
  }
  if (params.q) {
    values.push(`%${params.q}%`);
    where.push(
      `(i.invoice_number ILIKE $${values.length} OR i.client_name ILIKE $${values.length} OR i.purchase_order_number ILIKE $${values.length} OR c.name ILIKE $${values.length})`
    );
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const { rows } = await q(
    undefined,
    `SELECT i.*, c.name AS client_live_name, p.project_name,
            (i.cgst + i.sgst + i.igst)::text AS tax_amount
     FROM finance_invoices i
     LEFT JOIN ops_clients c ON c.id = i.client_id
     LEFT JOIN ops_projects p ON p.id = i.project_id
     ${clause}
     ORDER BY i.invoice_date DESC, i.created_at DESC
     LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
    values
  );
  const count = await q<{ count: string }>(undefined, `SELECT COUNT(*)::text AS count FROM finance_invoices i LEFT JOIN ops_clients c ON c.id = i.client_id ${clause}`, values);
  return { rows, total: Number(count.rows[0]?.count || 0), page, pageSize };
}

export async function getInvoice(id: string) {
  const { rows } = await q(
    undefined,
    `SELECT i.*, c.name AS client_live_name, p.project_name
     FROM finance_invoices i
     LEFT JOIN ops_clients c ON c.id = i.client_id
     LEFT JOIN ops_projects p ON p.id = i.project_id
     WHERE i.id = $1`,
    [id]
  );
  if (!rows[0]) throw new FinanceNotFoundError('Invoice not found');
  const items = await q(undefined, 'SELECT * FROM finance_invoice_items WHERE invoice_id = $1 ORDER BY line_no', [id]);
  const payments = await q(undefined, `SELECT * FROM finance_invoice_payments WHERE invoice_id = $1 ORDER BY payment_date DESC, created_at DESC`, [id]);
  return { invoice: rows[0], items: items.rows, payments: payments.rows };
}

function totalsPatch(calc: ReturnType<typeof calculateInvoice>) {
  return {
    subtotal: calc.subtotal,
    discount: calc.discount,
    taxable_amount: calc.taxable_amount,
    cgst: calc.cgst,
    sgst: calc.sgst,
    igst: calc.igst,
    round_off: calc.round_off,
    total_amount: calc.total_amount,
    outstanding_amount: calc.total_amount,
  };
}

export async function createInvoice(body: Record<string, unknown>, userId: string) {
  const settings = await getFinanceSettings();
  const invoiceDate = assertISODate(String(body.invoice_date || todayISO()), 'Invoice date');
  const dueDate = body.due_date ? assertISODate(String(body.due_date), 'Due date') : null;
  if (!body.client_id) throw new FinanceValidationError('Client is required');
  const fy = formatFinancialYear(invoiceDate, settings.invoice_number_fy_style === 'short' ? 'short' : 'full');
  const calc = calcFromBody(body, settings);

  return withFinanceTx(async (db) => {
    const client = await loadClient(db, String(body.client_id));
    const snap = snapshotFromClient(client, body);
    const { rows } = await q(
      db,
      `INSERT INTO finance_invoices (
         invoice_date, due_date, financial_year, client_id, project_id, purchase_order_number, work_order_number,
         currency, place_of_supply, place_of_supply_state_code, tax_treatment, notes, terms,
         client_name, client_address, client_city, client_state, client_state_code, client_country, client_pincode,
         client_gstin, client_pan, client_email, client_phone, company_snapshot,
         subtotal, discount, taxable_amount, cgst, sgst, igst, round_off, total_amount, outstanding_amount,
         invoice_status, payment_status, created_by, updated_by
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25::jsonb,
         $26,$27,$28,$29,$30,$31,$32,$33,$33,'draft','unpaid',$34,$34
       ) RETURNING *`,
      [
        invoiceDate,
        dueDate,
        fy,
        client.id,
        body.project_id || null,
        body.purchase_order_number || null,
        body.work_order_number || null,
        body.currency || settings.currency || 'INR',
        body.place_of_supply || snap.client_state || null,
        body.place_of_supply_state_code || snap.client_state_code || null,
        body.tax_treatment || 'auto',
        body.notes || settings.default_notes,
        body.terms || settings.default_terms,
        snap.client_name,
        snap.client_address,
        snap.client_city,
        snap.client_state,
        snap.client_state_code,
        snap.client_country,
        snap.client_pincode,
        snap.client_gstin,
        snap.client_pan,
        snap.client_email,
        snap.client_phone,
        JSON.stringify({
          company_name: settings.company_name,
          gstin: settings.gstin,
          pan: settings.pan,
          state: settings.state,
          state_code: settings.state_code,
          address: settings.billing_address || settings.registered_address,
        }),
        calc.subtotal,
        calc.discount,
        calc.taxable_amount,
        calc.cgst,
        calc.sgst,
        calc.igst,
        calc.round_off,
        calc.total_amount,
        userId,
      ]
    );
    await replaceItems(db, rows[0].id, calc);
    await writeFinanceAudit(db, { userId, action: 'Invoice Created', entityType: 'invoice', entityId: rows[0].id, next: rows[0] });
    return rows[0];
  });
}

export async function updateDraftInvoice(id: string, body: Record<string, unknown>, userId: string) {
  const settings = await getFinanceSettings();
  return withFinanceTx(async (db) => {
    const { rows } = await q(db, 'SELECT * FROM finance_invoices WHERE id = $1 FOR UPDATE', [id]);
    const invoice = rows[0];
    if (!invoice) throw new FinanceNotFoundError('Invoice not found');
    if (invoice.invoice_status !== 'draft') {
      throw new FinanceConflictError('Finalized invoices cannot be edited. Duplicate the invoice or cancel and create a new one.');
    }
    const invoiceDate = assertISODate(String(body.invoice_date || invoice.invoice_date), 'Invoice date');
    const dueDate = body.due_date ? assertISODate(String(body.due_date), 'Due date') : invoice.due_date;
    const fy = formatFinancialYear(invoiceDate, settings.invoice_number_fy_style === 'short' ? 'short' : 'full');
    const client = await loadClient(db, String(body.client_id || invoice.client_id));
    const snap = snapshotFromClient(client, body);
    const calc = calcFromBody({ ...invoice, ...body, items: body.items }, settings);
    const { rows: updated } = await q(
      db,
      `UPDATE finance_invoices SET
         invoice_date=$2, due_date=$3, financial_year=$4, client_id=$5, project_id=$6, purchase_order_number=$7,
         work_order_number=$8, currency=$9, place_of_supply=$10, place_of_supply_state_code=$11, tax_treatment=$12,
         notes=$13, terms=$14, client_name=$15, client_address=$16, client_city=$17, client_state=$18,
         client_state_code=$19, client_country=$20, client_pincode=$21, client_gstin=$22, client_pan=$23,
         client_email=$24, client_phone=$25, subtotal=$26, discount=$27, taxable_amount=$28, cgst=$29, sgst=$30,
         igst=$31, round_off=$32, total_amount=$33, outstanding_amount=$33, updated_by=$34
       WHERE id=$1 RETURNING *`,
      [
        id,
        invoiceDate,
        dueDate,
        fy,
        client.id,
        body.project_id ?? invoice.project_id,
        body.purchase_order_number ?? invoice.purchase_order_number,
        body.work_order_number ?? invoice.work_order_number,
        body.currency || invoice.currency,
        body.place_of_supply ?? invoice.place_of_supply,
        body.place_of_supply_state_code ?? invoice.place_of_supply_state_code,
        body.tax_treatment || invoice.tax_treatment,
        body.notes ?? invoice.notes,
        body.terms ?? invoice.terms,
        snap.client_name,
        snap.client_address,
        snap.client_city,
        snap.client_state,
        snap.client_state_code,
        snap.client_country,
        snap.client_pincode,
        snap.client_gstin,
        snap.client_pan,
        snap.client_email,
        snap.client_phone,
        calc.subtotal,
        calc.discount,
        calc.taxable_amount,
        calc.cgst,
        calc.sgst,
        calc.igst,
        calc.round_off,
        calc.total_amount,
        userId,
      ]
    );
    await replaceItems(db, id, calc);
    return updated[0];
  });
}

export async function finalizeInvoice(
  id: string,
  userId: string,
  meta?: { ip?: string | null; userAgent?: string | null }
) {
  const settings = await getFinanceSettings();
  const finalized = await withFinanceTx(async (db) => {
    const { rows } = await q(db, 'SELECT * FROM finance_invoices WHERE id = $1 FOR UPDATE', [id]);
    const invoice = rows[0];
    if (!invoice) throw new FinanceNotFoundError('Invoice not found');
    if (invoice.invoice_status === 'cancelled') throw new FinanceConflictError('Cancelled invoices cannot be finalized');
    if (invoice.invoice_status !== 'draft') return invoice;
    const items = await q(db, 'SELECT * FROM finance_invoice_items WHERE invoice_id = $1 ORDER BY line_no', [id]);
    if (!items.rows.length) throw new FinanceValidationError('At least one invoice item is required');
    if (!invoice.client_id) throw new FinanceValidationError('Client is required');
    const calc = calculateInvoice({
      items: items.rows,
      supplierStateCode: settings.state_code || '',
      placeOfSupplyStateCode: invoice.place_of_supply_state_code || invoice.place_of_supply || '',
      taxTreatment: invoice.tax_treatment,
      roundOff: invoice.round_off,
    });
    const { rows: numRows } = await q<{ finance_next_invoice_number: string }>(
      db,
      `SELECT finance_next_invoice_number($1,$2,$3,$4,$5)`,
      [
        settings.invoice_number_prefix,
        invoice.financial_year,
        settings.invoice_number_separator,
        settings.invoice_number_sequence_length,
        settings.invoice_number_include_fy,
      ]
    );
    const invoiceNumber = numRows[0].finance_next_invoice_number;
    const { rows: updated } = await q(
      db,
      `UPDATE finance_invoices SET
         invoice_number=$2, invoice_status='finalized', subtotal=$3, discount=$4, taxable_amount=$5, cgst=$6, sgst=$7,
         igst=$8, round_off=$9, total_amount=$10, outstanding_amount=$10, payment_status='unpaid',
         amount_received=0, tds_deducted=0, other_deduction=0, finalized_by=$11, finalized_at=NOW(), updated_by=$11,
         company_snapshot=$12::jsonb
       WHERE id=$1 RETURNING *`,
      [
        id,
        invoiceNumber,
        calc.subtotal,
        calc.discount,
        calc.taxable_amount,
        calc.cgst,
        calc.sgst,
        calc.igst,
        calc.round_off,
        calc.total_amount,
        userId,
        JSON.stringify({
          company_name: settings.company_name,
          gstin: settings.gstin,
          pan: settings.pan,
          cin: settings.cin,
          state: settings.state,
          state_code: settings.state_code,
          address: settings.billing_address || settings.registered_address,
          phone: settings.phone,
          email: settings.email,
          website: settings.website,
          bank_name: settings.bank_name,
          account_name: settings.account_name,
          account_number: settings.account_number,
          ifsc: settings.ifsc,
          branch: settings.branch,
          upi_id: settings.upi_id,
        }),
      ]
    );
    await replaceItems(db, id, calc);
    await writeFinanceAudit(db, {
      userId,
      action: 'Invoice Finalized',
      entityType: 'invoice',
      entityId: id,
      previous: invoice,
      next: updated[0],
      ip: meta?.ip,
      userAgent: meta?.userAgent,
    });
    return updated[0];
  });

  await persistInvoicePdf(id, userId);
  return getInvoice(id);
}

export function invoicePdfFilename(invoice: Record<string, unknown>) {
  const number = sanitizeFilename(String(invoice.invoice_number || invoice.id).replace(/\//g, '-'));
  const client = sanitizeFilename(String(invoice.client_name || invoice.client_live_name || 'Client'));
  return `${number}_${client}.pdf`;
}

export async function persistInvoicePdf(id: string, userId: string, regenerate = false) {
  const detail = await getInvoice(id);
  const settings = await getFinanceSettings();
  const buffer = await generateInvoicePdf(detail.invoice, detail.items, settings);
  const stored = await saveFinanceBuffer(
    buffer,
    'invoices',
    invoicePdfFilename(detail.invoice),
    'application/pdf'
  );
  await q(undefined, 'UPDATE finance_invoices SET pdf_path = $2 WHERE id = $1', [id, stored.storage_path]);
  await registerDocument(undefined, {
    documentType: 'client_invoice',
    referenceType: 'invoice',
    referenceId: id,
    documentDate: detail.invoice.invoice_date,
    originalFilename: stored.original_filename,
    storedFilename: stored.stored_filename,
    storagePath: stored.storage_path,
    mimeType: stored.mime_type,
    fileSize: stored.file_size,
    notes: regenerate ? 'Regenerated copy' : 'Finalized invoice PDF',
    userId,
  });
  return stored;
}

export async function cancelInvoice(id: string, reason: string, userId: string, meta?: { ip?: string | null; userAgent?: string | null }) {
  const text = String(reason || '').trim();
  if (!text) throw new FinanceValidationError('Cancellation reason is required');
  return withFinanceTx(async (db) => {
    const { rows } = await q(db, 'SELECT * FROM finance_invoices WHERE id = $1 FOR UPDATE', [id]);
    const invoice = rows[0];
    if (!invoice) throw new FinanceNotFoundError('Invoice not found');
    if (invoice.invoice_status === 'cancelled') return invoice;
    const { rows: updated } = await q(
      db,
      `UPDATE finance_invoices
       SET invoice_status='cancelled', cancelled_reason=$2, cancelled_by=$3, cancelled_at=NOW(), updated_by=$3
       WHERE id=$1 RETURNING *`,
      [id, text, userId]
    );
    await writeFinanceAudit(db, {
      userId,
      action: 'Invoice Cancelled',
      entityType: 'invoice',
      entityId: id,
      previous: invoice,
      next: updated[0],
      ip: meta?.ip,
      userAgent: meta?.userAgent,
    });
    return updated[0];
  });
}

export async function markInvoiceSent(id: string, userId: string) {
  const { rows } = await q(
    undefined,
    `UPDATE finance_invoices SET invoice_status='sent', updated_by=$2
     WHERE id=$1 AND invoice_status IN ('finalized','sent') RETURNING *`,
    [id, userId]
  );
  if (!rows[0]) throw new FinanceConflictError('Only finalized invoices can be marked sent');
  return rows[0];
}

export async function duplicateInvoice(id: string, userId: string) {
  const detail = await getInvoice(id);
  return createInvoice(
    {
      invoice_date: todayISO(),
      due_date: detail.invoice.due_date,
      client_id: detail.invoice.client_id,
      project_id: detail.invoice.project_id,
      purchase_order_number: detail.invoice.purchase_order_number,
      work_order_number: detail.invoice.work_order_number,
      currency: detail.invoice.currency,
      place_of_supply: detail.invoice.place_of_supply,
      place_of_supply_state_code: detail.invoice.place_of_supply_state_code,
      tax_treatment: detail.invoice.tax_treatment,
      notes: detail.invoice.notes,
      terms: detail.invoice.terms,
      client_name: detail.invoice.client_name,
      client_address: detail.invoice.client_address,
      client_city: detail.invoice.client_city,
      client_state: detail.invoice.client_state,
      client_state_code: detail.invoice.client_state_code,
      client_country: detail.invoice.client_country,
      client_pincode: detail.invoice.client_pincode,
      client_gstin: detail.invoice.client_gstin,
      client_pan: detail.invoice.client_pan,
      client_email: detail.invoice.client_email,
      client_phone: detail.invoice.client_phone,
      items: detail.items.map((item) => ({
        description: item.description,
        sac_hsn: item.sac_hsn,
        quantity: item.quantity,
        rate: item.rate,
        discount_percentage: item.discount_percentage,
        discount_amount: item.discount_amount,
        gst_rate: item.gst_rate,
        service_id: item.service_id,
      })),
    },
    userId
  );
}

export { totalsPatch };
