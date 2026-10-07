import { writeFinanceAudit } from './audit';
import { expensePaymentStatus } from './calculate';
import { q, withFinanceTx, type DbClient } from './db';
import { registerDocument } from './documents';
import { FinanceConflictError, FinanceNotFoundError, FinanceValidationError } from './errors';
import { assertISODate, formatFinancialYear } from './fy';
import { fromCents, toCents } from './money';
import { saveFinanceFile } from './storage';

async function resolveVendorId(db: DbClient, vendorId: unknown) {
  const id = String(vendorId || '').trim();
  if (id) {
    const { rows } = await q(db, 'SELECT id FROM finance_vendors WHERE id = $1', [id]);
    if (!rows[0]) throw new FinanceValidationError('Vendor is required');
    return rows[0].id as string;
  }
  throw new FinanceValidationError('Vendor is required. Select a vendor, or use General / Other.');
}

export async function refreshExpenseSettlement(db: DbClient, expenseId: string) {
  const { rows } = await q(db, 'SELECT * FROM finance_expenses WHERE id = $1 FOR UPDATE', [expenseId]);
  const expense = rows[0];
  if (!expense) throw new FinanceNotFoundError('Receipt not found');
  const { rows: sums } = await q<{ paid: string; tds: string }>(
    db,
    `SELECT COALESCE(SUM(amount_paid),0)::text AS paid, COALESCE(SUM(tds_amount),0)::text AS tds
     FROM finance_expense_payments WHERE expense_id = $1 AND status = 'active'`,
    [expenseId]
  );
  const paid = toCents(sums[0]?.paid);
  const tds = toCents(sums[0]?.tds);
  const total = toCents(expense.total_amount);
  const settled = paid + tds;
  if (settled > total) throw new FinanceValidationError('Receipt payments cannot exceed the receipt total');
  const balance = total - settled;
  await q(
    db,
    `UPDATE finance_expenses
     SET amount_paid=$2, tds_amount=$3, balance_amount=$4, payment_status=$5
     WHERE id=$1`,
    [expenseId, fromCents(paid), fromCents(tds), fromCents(balance), expensePaymentStatus(total, settled)]
  );
}

export async function listExpenses(params: {
  q?: string;
  from?: string;
  to?: string;
  vendorId?: string;
  categoryId?: string;
  paymentStatus?: string;
  projectId?: string;
  missingDocs?: boolean;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize || 25));
  const where: string[] = [`e.status <> 'cancelled'`];
  const values: unknown[] = [];
  if (params.from) {
    values.push(params.from);
    where.push(`e.expense_date >= $${values.length}`);
  }
  if (params.to) {
    values.push(params.to);
    where.push(`e.expense_date <= $${values.length}`);
  }
  if (params.vendorId) {
    values.push(params.vendorId);
    where.push(`e.vendor_id = $${values.length}`);
  }
  if (params.categoryId) {
    values.push(params.categoryId);
    where.push(`e.category_id = $${values.length}`);
  }
  if (params.paymentStatus) {
    values.push(params.paymentStatus);
    where.push(`e.payment_status = $${values.length}`);
  }
  if (params.projectId) {
    values.push(params.projectId);
    where.push(`e.project_id = $${values.length}`);
  }
  if (params.q) {
    values.push(`%${params.q}%`);
    where.push(
      `(e.description ILIKE $${values.length} OR e.vendor_invoice_number ILIKE $${values.length} OR e.receipt_number ILIKE $${values.length} OR v.vendor_name ILIKE $${values.length})`
    );
  }
  if (params.missingDocs) {
    where.push(
      `NOT EXISTS (SELECT 1 FROM finance_documents d WHERE d.reference_type='expense' AND d.reference_id=e.id)`
    );
  }
  const clause = `WHERE ${where.join(' AND ')}`;
  const { rows } = await q(
    undefined,
    `SELECT e.*, v.vendor_name, v.gstin AS vendor_gstin, c.category_name,
            (e.cgst + e.sgst + e.igst + COALESCE(e.other_tax,0))::text AS tax_amount,
            EXISTS (SELECT 1 FROM finance_documents d WHERE d.reference_type='expense' AND d.reference_id=e.id) AS has_document,
            au.email AS created_by_email,
            (SELECT payment_mode FROM finance_expense_payments p WHERE p.expense_id=e.id AND p.status='active' ORDER BY payment_date DESC LIMIT 1) AS last_payment_mode,
            (SELECT transaction_reference FROM finance_expense_payments p WHERE p.expense_id=e.id AND p.status='active' ORDER BY payment_date DESC LIMIT 1) AS last_transaction_reference
     FROM finance_expenses e
     LEFT JOIN finance_vendors v ON v.id = e.vendor_id
     LEFT JOIN finance_expense_categories c ON c.id = e.category_id
     LEFT JOIN admin_users au ON au.user_id = e.created_by
     ${clause}
     ORDER BY e.expense_date DESC, e.created_at DESC
     LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
    values
  );
  const count = await q<{ count: string }>(
    undefined,
    `SELECT COUNT(*)::text AS count FROM finance_expenses e LEFT JOIN finance_vendors v ON v.id = e.vendor_id ${clause}`,
    values
  );
  return { rows, total: Number(count.rows[0]?.count || 0), page, pageSize };
}

export async function getExpense(id: string) {
  const { rows } = await q(
    undefined,
    `SELECT e.*, v.vendor_name, v.gstin AS vendor_gstin, c.category_name,
            (e.cgst + e.sgst + e.igst + COALESCE(e.other_tax,0))::text AS tax_amount,
            au.email AS created_by_email
     FROM finance_expenses e
     LEFT JOIN finance_vendors v ON v.id = e.vendor_id
     LEFT JOIN finance_expense_categories c ON c.id = e.category_id
     LEFT JOIN admin_users au ON au.user_id = e.created_by
     WHERE e.id = $1`,
    [id]
  );
  if (!rows[0]) throw new FinanceNotFoundError('Receipt not found');
  const payments = await q(undefined, 'SELECT * FROM finance_expense_payments WHERE expense_id = $1 ORDER BY payment_date', [id]);
  const docs = await q(
    undefined,
    `SELECT id, original_filename, mime_type, file_size, uploaded_at FROM finance_documents WHERE reference_type IN ('expense','receipt') AND reference_id=$1`,
    [id]
  );
  return { receipt: rows[0], expense: rows[0], payments: payments.rows, documents: docs.rows };
}

export async function createExpense(body: Record<string, unknown>, userId: string) {
  const date = assertISODate(String(body.expense_date || body.receipt_date), 'Receipt date');
  const description = String(body.description || '').trim();
  if (!description) throw new FinanceValidationError('Description is required');
  if (!body.category_id) throw new FinanceValidationError('Receipt category is required');
  const taxable = toCents(body.taxable_amount);
  const cgst = toCents(body.cgst);
  const sgst = toCents(body.sgst);
  const igst = toCents(body.igst);
  const otherTax = toCents(body.other_tax);
  const total =
    body.total_amount != null && body.total_amount !== ''
      ? toCents(body.total_amount)
      : taxable + cgst + sgst + igst + otherTax;
  if (total < 0) throw new FinanceValidationError('Receipt total cannot be negative');
  const amountPaidAtCreate = toCents(body.amount_paid);
  const paymentDate = body.payment_date ? assertISODate(String(body.payment_date), 'Payment date') : null;
  if (amountPaidAtCreate > 0 && !paymentDate) throw new FinanceValidationError('Payment date is required when amount paid is set');
  if (amountPaidAtCreate > total) throw new FinanceValidationError('Amount paid cannot exceed the receipt total');

  return withFinanceTx(async (db) => {
    const vendorId = await resolveVendorId(db, body.vendor_id);
    const fy = formatFinancialYear(date, 'short');
    const { rows: numRows } = await q<{ finance_next_receipt_number: string }>(
      db,
      `SELECT finance_next_receipt_number('RCP',$1,'-',3,TRUE)`,
      [fy]
    );
    const receiptNumber = numRows[0]?.finance_next_receipt_number;
    const providedBill = String(body.vendor_invoice_number || '').trim();
    let vendorBillNumber = providedBill;
    if (!vendorBillNumber) {
      const { rows: billRows } = await q<{ finance_next_receipt_number: string }>(
        db,
        `SELECT finance_next_receipt_number('VBL',$1,'-',3,TRUE)`,
        [fy]
      );
      vendorBillNumber = billRows[0]?.finance_next_receipt_number || receiptNumber;
    }
    const { rows } = await q(
      db,
      `INSERT INTO finance_expenses (
         receipt_number, expense_date, vendor_id, category_id, description, vendor_invoice_number, vendor_invoice_date,
         currency, taxable_amount, cgst, sgst, igst, other_tax, total_amount, tds_amount, amount_paid, balance_amount,
         payment_status, payment_mode, bank_account, transaction_reference, payment_date, project_id, client_id, notes,
         status, created_by, updated_by
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,0,$14,'unpaid',$16,$17,$18,$19,$20,$21,$22,'recorded',$23,$23)
       RETURNING *`,
      [
        receiptNumber,
        date,
        vendorId,
        body.category_id,
        description,
        vendorBillNumber,
        body.vendor_invoice_date || null,
        body.currency || 'INR',
        fromCents(taxable),
        fromCents(cgst),
        fromCents(sgst),
        fromCents(igst),
        fromCents(otherTax),
        fromCents(total),
        fromCents(toCents(body.tds_amount)),
        body.payment_mode || null,
        body.bank_account || null,
        body.transaction_reference || null,
        paymentDate,
        body.project_id || null,
        body.client_id || null,
        body.notes || null,
        userId,
      ]
    );
    const receipt = rows[0];
    if (amountPaidAtCreate > 0 && paymentDate) {
      const { rows: payRows } = await q(
        db,
        `INSERT INTO finance_expense_payments (
           expense_id, payment_date, amount_paid, tds_amount, tds_type, tds_rate, tds_section, payment_mode,
           bank_account, transaction_reference, notes, status, payment_recorded_by, created_by, updated_by
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'active',$12,$12,$12) RETURNING *`,
        [
          receipt.id,
          paymentDate,
          fromCents(amountPaidAtCreate),
          fromCents(toCents(body.tds_amount)),
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
      await refreshExpenseSettlement(db, receipt.id);
      await q(
        db,
        `INSERT INTO finance_transactions (
           transaction_date, transaction_type, reference_type, reference_id, party_type, party_id, category_id,
           description, money_in, money_out, payment_mode, bank_account, transaction_reference, status, created_by
         ) VALUES ($1,'receipt_payment','expense_payment',$2,'vendor',$3,$4,$5,0,$6,$7,$8,$9,'active',$10)`,
        [
          paymentDate,
          payRows[0].id,
          vendorId,
          body.category_id,
          description,
          fromCents(amountPaidAtCreate),
          body.payment_mode || null,
          body.bank_account || null,
          body.transaction_reference || null,
          userId,
        ]
      );
    }
    await writeFinanceAudit(db, { userId, action: 'Receipt Created', entityType: 'receipt', entityId: receipt.id, next: receipt });
    const { rows: latest } = await q(db, 'SELECT * FROM finance_expenses WHERE id = $1', [receipt.id]);
    return latest[0];
  });
}

export async function recordExpensePayment(body: Record<string, unknown>, userId: string) {
  const expenseId = String(body.expense_id || body.receipt_id || '');
  const paymentDate = assertISODate(String(body.payment_date), 'Payment date');
  const amount = toCents(body.amount_paid);
  const tds = toCents(body.tds_amount);
  if (amount <= 0) throw new FinanceValidationError('Payment amount must be greater than 0');
  return withFinanceTx(async (db) => {
    const { rows } = await q(db, 'SELECT * FROM finance_expenses WHERE id = $1 FOR UPDATE', [expenseId]);
    const expense = rows[0];
    if (!expense) throw new FinanceNotFoundError('Receipt not found');
    if (expense.status === 'cancelled') throw new FinanceConflictError('Cannot pay a cancelled receipt');
    const { rows: payRows } = await q(
      db,
      `INSERT INTO finance_expense_payments (
         expense_id, payment_date, amount_paid, tds_amount, tds_type, tds_rate, tds_section, payment_mode,
         bank_account, transaction_reference, notes, status, payment_recorded_by, created_by, updated_by
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'active',$12,$12,$12) RETURNING *`,
      [
        expenseId,
        paymentDate,
        fromCents(amount),
        fromCents(tds),
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
    await refreshExpenseSettlement(db, expenseId);
    const txnType = expense.salary_entry_id ? 'salary_payment' : 'receipt_payment';
    await q(
      db,
      `INSERT INTO finance_transactions (
         transaction_date, transaction_type, reference_type, reference_id, party_type, party_id, category_id,
         description, money_in, money_out, payment_mode, bank_account, transaction_reference, status, created_by
       ) VALUES ($1,$2,'expense_payment',$3,'vendor',$4,$5,$6,0,$7,$8,$9,$10,'active',$11)`,
      [
        paymentDate,
        txnType,
        payRows[0].id,
        expense.vendor_id,
        expense.category_id,
        expense.description,
        fromCents(amount),
        body.payment_mode || null,
        body.bank_account || null,
        body.transaction_reference || null,
        userId,
      ]
    );
    return payRows[0];
  });
}

export async function cancelExpense(id: string, reason: string, userId: string) {
  const text = String(reason || '').trim();
  if (!text) throw new FinanceValidationError('Cancellation reason is required');
  return withFinanceTx(async (db) => {
    const { rows } = await q(db, 'SELECT * FROM finance_expenses WHERE id = $1 FOR UPDATE', [id]);
    if (!rows[0]) throw new FinanceNotFoundError('Receipt not found');
    const { rows: updated } = await q(
      db,
      `UPDATE finance_expenses
       SET status='cancelled', cancelled_reason=$2, cancelled_by=$3, cancelled_at=NOW(), updated_by=$3
       WHERE id=$1 RETURNING *`,
      [id, text, userId]
    );
    await q(
      db,
      `UPDATE finance_expense_payments SET status='reversed', cancelled_by=$2, cancelled_at=NOW(), cancelled_reason=$3
       WHERE expense_id=$1 AND status='active'`,
      [id, userId, text]
    );
    await q(
      db,
      `UPDATE finance_transactions SET status='reversed'
       WHERE reference_id IN (SELECT id FROM finance_expense_payments WHERE expense_id=$1)`,
      [id]
    );
    await writeFinanceAudit(db, {
      userId,
      action: 'Receipt Cancelled',
      entityType: 'receipt',
      entityId: id,
      previous: rows[0],
      next: updated[0],
    });
    return updated[0];
  });
}

export async function addExpenseDocument(expenseId: string, file: File, userId: string) {
  const stored = await saveFinanceFile(file, 'receipts');
  const { rows } = await q(undefined, 'SELECT expense_date, vendor_id FROM finance_expenses WHERE id=$1', [expenseId]);
  if (!rows[0]) throw new FinanceNotFoundError('Receipt not found');
  return registerDocument(undefined, {
    documentType: 'receipt',
    referenceType: 'expense',
    referenceId: expenseId,
    documentDate: rows[0].expense_date,
    originalFilename: stored.original_filename,
    storedFilename: stored.stored_filename,
    storagePath: stored.storage_path,
    mimeType: stored.mime_type,
    fileSize: stored.file_size,
    notes: rows[0].vendor_id ? `Vendor ${rows[0].vendor_id}` : null,
    userId,
  });
}

export const listReceipts = listExpenses;
export const getReceipt = getExpense;
export const createReceipt = createExpense;
export const recordReceiptPayment = recordExpensePayment;
export const cancelReceipt = cancelExpense;
export const addReceiptDocument = addExpenseDocument;
