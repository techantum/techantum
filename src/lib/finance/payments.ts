import { writeFinanceAudit } from './audit';
import { q, withFinanceTx } from './db';
import { FinanceConflictError, FinanceNotFoundError, FinanceValidationError } from './errors';
import { assertISODate } from './fy';
import { fromCents, toCents } from './money';
import { refreshInvoiceSettlement } from './invoices';
import { registerDocument } from './documents';

export async function recordInvoicePayment(
  body: Record<string, unknown>,
  userId: string,
  meta?: { ip?: string | null; userAgent?: string | null }
) {
  const invoiceId = String(body.invoice_id || '');
  if (!invoiceId) throw new FinanceValidationError('Invoice is required');
  const paymentDate = assertISODate(String(body.payment_date), 'Payment date');
  const amount = toCents(body.amount_received);
  const tds = toCents(body.tds_deducted);
  const other = toCents(body.other_deduction);
  if (amount <= 0) throw new FinanceValidationError('Payment amount must be greater than 0');
  if (tds < 0 || other < 0) throw new FinanceValidationError('Deductions cannot be negative');

  const result = await withFinanceTx(async (db) => {
    const { rows } = await q(db, 'SELECT * FROM finance_invoices WHERE id = $1 FOR UPDATE', [invoiceId]);
    const invoice = rows[0];
    if (!invoice) throw new FinanceNotFoundError('Invoice not found');
    if (invoice.invoice_status === 'draft') throw new FinanceConflictError('Finalize the invoice before recording payment');
    if (invoice.invoice_status === 'cancelled') throw new FinanceConflictError('Cannot record payment on a cancelled invoice');

    const { rows: payRows } = await q(
      db,
      `INSERT INTO finance_invoice_payments (
         invoice_id, client_id, payment_date, amount_received, tds_deducted, other_deduction, tds_type, tds_rate,
         tds_section, payment_mode, bank_account, transaction_reference, notes, status, payment_recorded_by, created_by, updated_by
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'active',$14,$14,$14) RETURNING *`,
      [
        invoiceId,
        invoice.client_id,
        paymentDate,
        fromCents(amount),
        fromCents(tds),
        fromCents(other),
        body.tds_type || null,
        body.tds_rate || null,
        body.tds_section || null,
        body.payment_mode || null,
        body.bank_account || null,
        body.transaction_reference || null,
        body.notes || null,
        userId,
      ]
    );
    const payment = payRows[0];
    await refreshInvoiceSettlement(db, invoiceId);

    await q(
      db,
      `INSERT INTO finance_transactions (
         transaction_date, transaction_type, reference_type, reference_id, party_type, party_id, category_id,
         description, money_in, money_out, payment_mode, bank_account, transaction_reference, status, created_by
       ) VALUES ($1,'invoice_payment','invoice_payment',$2,'client',$3,NULL,$4,$5,0,$6,$7,$8,'active',$9)`,
      [
        paymentDate,
        payment.id,
        invoice.client_id,
        `Invoice payment ${invoice.invoice_number || ''}`.trim(),
        fromCents(amount),
        body.payment_mode || null,
        body.bank_account || null,
        body.transaction_reference || null,
        userId,
      ]
    );

    await writeFinanceAudit(db, {
      userId,
      action: 'Invoice Payment Recorded',
      entityType: 'invoice_payment',
      entityId: payment.id,
      next: payment,
      ip: meta?.ip,
      userAgent: meta?.userAgent,
    });
    return payment;
  });

  return result;
}

export async function reverseInvoicePayment(id: string, reason: string, userId: string) {
  const text = String(reason || '').trim();
  if (!text) throw new FinanceValidationError('Reversal reason is required');
  return withFinanceTx(async (db) => {
    const { rows } = await q(db, 'SELECT * FROM finance_invoice_payments WHERE id = $1 FOR UPDATE', [id]);
    const payment = rows[0];
    if (!payment) throw new FinanceNotFoundError('Payment not found');
    if (payment.status === 'reversed') return payment;
    await q(
      db,
      `UPDATE finance_invoice_payments
       SET status='reversed', cancelled_by=$2, cancelled_at=NOW(), cancelled_reason=$3, updated_by=$2
       WHERE id=$1`,
      [id, userId, text]
    );
    await q(
      db,
      `UPDATE finance_transactions SET status='reversed', updated_by=$2 WHERE reference_type='invoice_payment' AND reference_id=$1`,
      [id, userId]
    );
    await q(
      db,
      `INSERT INTO finance_transactions (
         transaction_date, transaction_type, reference_type, reference_id, party_type, party_id,
         description, money_in, money_out, payment_mode, bank_account, transaction_reference, status, created_by
       ) VALUES (CURRENT_DATE,'refund','invoice_payment',$1,'client',$2,$3,0,$4,$5,$6,$7,'active',$8)`,
      [
        payment.id,
        payment.client_id,
        `Reversal of payment ${payment.id}`,
        payment.amount_received,
        payment.payment_mode,
        payment.bank_account,
        payment.transaction_reference,
        userId,
      ]
    );
    await refreshInvoiceSettlement(db, payment.invoice_id);
    await writeFinanceAudit(db, {
      userId,
      action: 'Payment Updated/Reversed',
      entityType: 'invoice_payment',
      entityId: id,
      previous: payment,
      next: { status: 'reversed', reason: text },
    });
    return payment;
  });
}

export async function attachPaymentFile(paymentId: string, file: File, userId: string) {
  const { saveFinanceFile } = await import('./storage');
  const stored = await saveFinanceFile(file, 'payments');
  await q(undefined, 'UPDATE finance_invoice_payments SET attachment_path=$2 WHERE id=$1', [paymentId, stored.storage_path]);
  await registerDocument(undefined, {
    documentType: 'other',
    referenceType: 'invoice_payment',
    referenceId: paymentId,
    originalFilename: stored.original_filename,
    storedFilename: stored.stored_filename,
    storagePath: stored.storage_path,
    mimeType: stored.mime_type,
    fileSize: stored.file_size,
    notes: 'Payment attachment',
    userId,
  });
  return stored;
}

export async function listIncome(params: {
  q?: string;
  from?: string;
  to?: string;
  clientId?: string;
  categoryId?: string;
  source?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize || 25));
  const where: string[] = [`i.status = 'active'`];
  const values: unknown[] = [];
  if (params.from) {
    values.push(params.from);
    where.push(`i.income_date >= $${values.length}`);
  }
  if (params.to) {
    values.push(params.to);
    where.push(`i.income_date <= $${values.length}`);
  }
  if (params.clientId) {
    values.push(params.clientId);
    where.push(`i.client_id = $${values.length}`);
  }
  if (params.categoryId) {
    values.push(params.categoryId);
    where.push(`i.category_id = $${values.length}`);
  }
  if (params.source) {
    values.push(params.source);
    where.push(`i.source = $${values.length}`);
  }
  if (params.q) {
    values.push(`%${params.q}%`);
    where.push(`(i.description ILIKE $${values.length} OR i.transaction_reference ILIKE $${values.length} OR c.name ILIKE $${values.length})`);
  }
  const clause = `WHERE ${where.join(' AND ')}`;
  const { rows } = await q(
    undefined,
    `SELECT i.*, c.name AS client_name, cat.category_name, inv.invoice_number
     FROM finance_income i
     LEFT JOIN ops_clients c ON c.id = i.client_id
     LEFT JOIN finance_income_categories cat ON cat.id = i.category_id
     LEFT JOIN finance_invoices inv ON inv.id = i.invoice_id
     ${clause}
     ORDER BY i.income_date DESC, i.created_at DESC
     LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
    values
  );
  const count = await q<{ count: string }>(
    undefined,
    `SELECT COUNT(*)::text AS count FROM finance_income i LEFT JOIN ops_clients c ON c.id = i.client_id ${clause}`,
    values
  );
  return { rows, total: Number(count.rows[0]?.count || 0), page, pageSize };
}

export async function createManualIncome(_body: Record<string, unknown>, _userId: string) {
  throw new FinanceValidationError(
    'Manual income is no longer used. Record revenue through client invoices and invoice payments.'
  );
}
