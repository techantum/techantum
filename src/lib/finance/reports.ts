import { q } from './db';
import { resolvePeriod, todayISO, type PeriodFilter } from './fy';
import { fromCents, toCents } from './money';

export async function reportFilters(search: URLSearchParams): Promise<PeriodFilter & { clientId?: string; vendorId?: string; categoryId?: string; projectId?: string }> {
  const kind = (search.get('period') || 'financial_year') as PeriodFilter['kind'];
  const base =
    kind === 'custom'
      ? { kind: 'custom' as const, from: search.get('from') || todayISO(), to: search.get('to') || todayISO() }
      : kind === 'month'
        ? { kind: 'month' as const, year: Number(search.get('year')), month: Number(search.get('month')) }
        : kind === 'quarter'
          ? { kind: 'quarter' as const, year: Number(search.get('year')), quarter: Number(search.get('quarter')) }
          : kind === 'previous_month'
            ? { kind: 'previous_month' as const }
            : kind === 'current_month'
              ? { kind: 'current_month' as const }
              : { kind: 'financial_year' as const, fy: search.get('fy') || undefined };
  return {
    ...base,
    clientId: search.get('clientId') || undefined,
    vendorId: search.get('vendorId') || undefined,
    categoryId: search.get('categoryId') || undefined,
    projectId: search.get('projectId') || undefined,
  };
}

export async function financialSummary(filter: PeriodFilter) {
  const period = resolvePeriod(filter);
  const { from, to } = period;
  const invoiced = await q<{ v: string }>(undefined, `SELECT COALESCE(SUM(total_amount),0)::text AS v FROM finance_invoices WHERE invoice_date BETWEEN $1 AND $2 AND invoice_status IN ('finalized','sent')`, [from, to]);
  const collected = await q<{ v: string }>(undefined, `SELECT COALESCE(SUM(amount_received),0)::text AS v FROM finance_invoice_payments WHERE payment_date BETWEEN $1 AND $2 AND status='active'`, [from, to]);
  const outstanding = await q<{ v: string }>(undefined, `SELECT COALESCE(SUM(outstanding_amount),0)::text AS v FROM finance_invoices WHERE invoice_date BETWEEN $1 AND $2 AND invoice_status IN ('finalized','sent')`, [from, to]);
  const receipts = await q<{ v: string }>(undefined, `SELECT COALESCE(SUM(total_amount),0)::text AS v FROM finance_expenses WHERE expense_date BETWEEN $1 AND $2 AND status='recorded'`, [from, to]);
  const paid = await q<{ v: string }>(undefined, `SELECT COALESCE(SUM(amount_paid),0)::text AS v FROM finance_expense_payments WHERE payment_date BETWEEN $1 AND $2 AND status='active'`, [from, to]);
  const totalInvoiced = toCents(invoiced.rows[0]?.v);
  const totalCollected = toCents(collected.rows[0]?.v);
  const totalReceipts = toCents(receipts.rows[0]?.v);
  return {
    period,
    totalInvoiced: fromCents(totalInvoiced),
    totalCollected: fromCents(totalCollected),
    outstanding: fromCents(toCents(outstanding.rows[0]?.v)),
    totalReceipts: fromCents(totalReceipts),
    receiptsPaid: fromCents(toCents(paid.rows[0]?.v)),
    netCashPosition: fromCents(totalCollected - toCents(paid.rows[0]?.v)),
  };
}

export async function salesRegister(from: string, to: string, clientId?: string) {
  const { rows } = await q(
    undefined,
    `SELECT i.id, i.invoice_date, i.invoice_number, i.client_name, i.client_gstin, i.client_state, i.place_of_supply,
            p.project_name, i.taxable_amount, i.cgst, i.sgst, i.igst, i.total_amount, i.tds_deducted, i.amount_received,
            i.outstanding_amount, i.payment_status, i.invoice_status, i.due_date
     FROM finance_invoices i
     LEFT JOIN ops_projects p ON p.id = i.project_id
     WHERE i.invoice_date BETWEEN $1 AND $2 AND i.invoice_status IN ('finalized','sent')
       AND ($3::uuid IS NULL OR i.client_id = $3)
     ORDER BY i.invoice_date, i.invoice_number`,
    [from, to, clientId || null]
  );
  return rows;
}

export async function invoicePaymentRegister(from: string, to: string, clientId?: string) {
  const { rows } = await q(
    undefined,
    `SELECT p.payment_date, i.invoice_number, i.client_name, p.amount_received, p.tds_deducted, p.other_deduction,
            p.payment_mode, p.bank_account, p.transaction_reference, p.status, i.currency
     FROM finance_invoice_payments p
     JOIN finance_invoices i ON i.id = p.invoice_id
     WHERE p.payment_date BETWEEN $1 AND $2 AND p.status = 'active'
       AND ($3::uuid IS NULL OR p.client_id = $3)
     ORDER BY p.payment_date, i.invoice_number`,
    [from, to, clientId || null]
  );
  return rows;
}

export async function expenseRegister(from: string, to: string, vendorId?: string, categoryId?: string) {
  const { rows } = await q(
    undefined,
    `SELECT e.id, e.receipt_number, e.expense_date, v.vendor_name, v.gstin AS vendor_gstin, e.vendor_invoice_number, e.vendor_invoice_date,
            c.category_name, e.description, e.taxable_amount, e.cgst, e.sgst, e.igst, COALESCE(e.other_tax,0) AS other_tax,
            (e.cgst+e.sgst+e.igst+COALESCE(e.other_tax,0))::text AS total_gst, e.total_amount, e.tds_amount, e.amount_paid, e.balance_amount,
            e.payment_status, e.currency,
            (SELECT payment_mode FROM finance_expense_payments p WHERE p.expense_id=e.id AND p.status='active' ORDER BY payment_date DESC LIMIT 1) AS payment_mode,
            (SELECT transaction_reference FROM finance_expense_payments p WHERE p.expense_id=e.id AND p.status='active' ORDER BY payment_date DESC LIMIT 1) AS transaction_reference,
            EXISTS (SELECT 1 FROM finance_documents d WHERE d.reference_type IN ('expense','receipt') AND d.reference_id=e.id) AS has_document,
            e.notes
     FROM finance_expenses e
     LEFT JOIN finance_vendors v ON v.id = e.vendor_id
     LEFT JOIN finance_expense_categories c ON c.id = e.category_id
     WHERE e.expense_date BETWEEN $1 AND $2 AND e.status='recorded'
       AND ($3::uuid IS NULL OR e.vendor_id = $3)
       AND ($4::uuid IS NULL OR e.category_id = $4)
     ORDER BY e.expense_date, e.created_at`,
    [from, to, vendorId || null, categoryId || null]
  );
  return rows;
}

export async function clientBillingSummary(from: string, to: string) {
  const { rows } = await q(
    undefined,
    `SELECT c.name AS client_name, c.client_type, c.gstin, c.country,
            COUNT(i.id)::int AS invoices,
            COALESCE(SUM(i.total_amount),0)::text AS total_invoiced,
            COALESCE(SUM(i.amount_received),0)::text AS received,
            COALESCE(SUM(i.outstanding_amount),0)::text AS outstanding
     FROM ops_clients c
     JOIN finance_invoices i ON i.client_id = c.id
     WHERE i.invoice_date BETWEEN $1 AND $2 AND i.invoice_status IN ('finalized','sent')
     GROUP BY c.name, c.client_type, c.gstin, c.country
     ORDER BY SUM(i.total_amount) DESC`,
    [from, to]
  );
  return rows;
}

export async function receivablesAgeing() {
  const today = todayISO();
  const { rows } = await q(
    undefined,
    `SELECT id, invoice_number, client_name, invoice_date, due_date, total_amount, outstanding_amount,
            CASE
              WHEN due_date IS NULL OR due_date >= $1 THEN 'current'
              WHEN $1 - due_date <= 30 THEN '1_30'
              WHEN $1 - due_date <= 60 THEN '31_60'
              WHEN $1 - due_date <= 90 THEN '61_90'
              ELSE '90_plus'
            END AS bucket
     FROM finance_invoices
     WHERE invoice_status IN ('finalized','sent') AND outstanding_amount > 0
     ORDER BY due_date NULLS LAST`,
    [today]
  );
  const buckets = { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90_plus: 0 };
  for (const row of rows) {
    const amt = toCents(row.outstanding_amount);
    if (row.bucket === 'current') buckets.current += amt;
    else if (row.bucket === '1_30') buckets.d1_30 += amt;
    else if (row.bucket === '31_60') buckets.d31_60 += amt;
    else if (row.bucket === '61_90') buckets.d61_90 += amt;
    else buckets.d90_plus += amt;
  }
  return {
    buckets: {
      current: fromCents(buckets.current),
      '1_30': fromCents(buckets.d1_30),
      '31_60': fromCents(buckets.d31_60),
      '61_90': fromCents(buckets.d61_90),
      '90_plus': fromCents(buckets.d90_plus),
    },
    rows,
  };
}

export async function gstSummary(from: string, to: string) {
  const output = await q<{ taxable: string; cgst: string; sgst: string; igst: string }>(
    undefined,
    `SELECT COALESCE(SUM(taxable_amount),0)::text AS taxable, COALESCE(SUM(cgst),0)::text AS cgst,
            COALESCE(SUM(sgst),0)::text AS sgst, COALESCE(SUM(igst),0)::text AS igst
     FROM finance_invoices
     WHERE invoice_date BETWEEN $1 AND $2 AND invoice_status IN ('finalized','sent')`,
    [from, to]
  );
  const input = await q<{ taxable: string; cgst: string; sgst: string; igst: string }>(
    undefined,
    `SELECT COALESCE(SUM(taxable_amount),0)::text AS taxable, COALESCE(SUM(cgst),0)::text AS cgst,
            COALESCE(SUM(sgst),0)::text AS sgst, COALESCE(SUM(igst),0)::text AS igst
     FROM finance_expenses
     WHERE expense_date BETWEEN $1 AND $2 AND status='recorded'`,
    [from, to]
  );
  return {
    disclaimer: 'Summary of recorded GST amounts only. This module does not file GST returns.',
    output: output.rows[0],
    input: input.rows[0],
  };
}

export async function tdsSummary(from: string, to: string) {
  const receivable = await q(
    undefined,
    `SELECT payment_date, tds_type, tds_section, tds_rate, tds_deducted, transaction_reference, invoice_id
     FROM finance_invoice_payments
     WHERE payment_date BETWEEN $1 AND $2 AND status='active' AND tds_deducted > 0
     ORDER BY payment_date`,
    [from, to]
  );
  const payable = await q(
    undefined,
    `SELECT payment_date, tds_type, tds_section, tds_rate, tds_amount, transaction_reference, expense_id
     FROM finance_expense_payments
     WHERE payment_date BETWEEN $1 AND $2 AND status='active' AND tds_amount > 0
     ORDER BY payment_date`,
    [from, to]
  );
  const recSum = receivable.rows.reduce((s, r) => s + toCents(r.tds_deducted), 0);
  const paySum = payable.rows.reduce((s, r) => s + toCents(r.tds_amount), 0);
  return {
    disclaimer: 'TDS amounts as recorded. Statutory sections are not inferred automatically.',
    tdsReceivable: fromCents(recSum),
    tdsPayable: fromCents(paySum),
    clientPayments: receivable.rows,
    vendorPayments: payable.rows,
  };
}

export async function monthlyPnl(from: string, to: string) {
  const { rows } = await q<{ month: string; invoiced: string; received: string; receipts: string }>(
    undefined,
    `SELECT m.month, COALESCE(inv.v,0)::text AS invoiced, COALESCE(inc.v,0)::text AS received, COALESCE(exp.v,0)::text AS receipts
     FROM (SELECT to_char(d,'YYYY-MM') AS month FROM generate_series($1::date, $2::date, interval '1 month') d) m
     LEFT JOIN (
       SELECT to_char(invoice_date,'YYYY-MM') AS month, SUM(total_amount) AS v
       FROM finance_invoices WHERE invoice_status IN ('finalized','sent') AND invoice_date BETWEEN $1 AND $2 GROUP BY 1
     ) inv ON inv.month = m.month
     LEFT JOIN (
       SELECT to_char(payment_date,'YYYY-MM') AS month, SUM(amount_received) AS v
       FROM finance_invoice_payments WHERE status='active' AND payment_date BETWEEN $1 AND $2 GROUP BY 1
     ) inc ON inc.month = m.month
     LEFT JOIN (
       SELECT to_char(payment_date,'YYYY-MM') AS month, SUM(amount_paid) AS v
       FROM finance_expense_payments WHERE status='active' AND payment_date BETWEEN $1 AND $2 GROUP BY 1
     ) exp ON exp.month = m.month
     ORDER BY m.month`,
    [from, to]
  );
  return rows.map((r) => ({
    month: r.month,
    invoiced: r.invoiced,
    received: r.received,
    receipts: r.receipts,
    net: fromCents(toCents(r.received) - toCents(r.receipts)),
  }));
}

export async function salarySummary(from: string, to: string) {
  const { rows } = await q(
    undefined,
    `SELECT e.full_name AS employee_name, e.employee_code, e.department, e.designation,
            p.payroll_month, p.payroll_year, p.financial_year, p.payslip_date, p.uploaded_at, p.original_filename
     FROM finance_employee_payslips p
     JOIN finance_employees e ON e.id = p.employee_id
     WHERE COALESCE(p.payslip_date, MAKE_DATE(p.payroll_year, p.payroll_month, 1)) BETWEEN $1 AND $2
     ORDER BY p.payroll_year, p.payroll_month, e.full_name`,
    [from, to]
  );
  return rows;
}

export async function transactionRegister(from: string, to: string) {
  const { rows } = await q(
    undefined,
    `SELECT t.transaction_date, t.transaction_type, t.reference_type, t.reference_id,
            CASE WHEN t.party_type='client' THEN c.name WHEN t.party_type='vendor' THEN v.vendor_name END AS party_name,
            t.description, t.money_in, t.money_out, t.payment_mode, t.bank_account, t.transaction_reference, t.status
     FROM finance_transactions t
     LEFT JOIN ops_clients c ON t.party_type='client' AND c.id = t.party_id
     LEFT JOIN finance_vendors v ON t.party_type='vendor' AND v.id = t.party_id
     WHERE t.transaction_date BETWEEN $1 AND $2
     ORDER BY t.transaction_date, t.created_at`,
    [from, to]
  );
  return rows;
}

export async function vendorExpenseReport(from: string, to: string) {
  const { rows } = await q(
    undefined,
    `SELECT v.vendor_name, v.gstin, COUNT(*)::int AS bills, COALESCE(SUM(e.total_amount),0)::text AS total,
            COALESCE(SUM(e.amount_paid),0)::text AS paid, COALESCE(SUM(e.balance_amount),0)::text AS outstanding
     FROM finance_expenses e
     JOIN finance_vendors v ON v.id = e.vendor_id
     WHERE e.expense_date BETWEEN $1 AND $2 AND e.status='recorded'
     GROUP BY v.vendor_name, v.gstin
     ORDER BY SUM(e.total_amount) DESC`,
    [from, to]
  );
  return rows;
}

export async function categoryExpenseReport(from: string, to: string) {
  const { rows } = await q(
    undefined,
    `SELECT COALESCE(c.category_name,'Uncategorised') AS category_name, COALESCE(SUM(e.total_amount),0)::text AS total
     FROM finance_expenses e
     LEFT JOIN finance_expense_categories c ON c.id = e.category_id
     WHERE e.expense_date BETWEEN $1 AND $2 AND e.status='recorded'
     GROUP BY c.category_name
     ORDER BY SUM(e.total_amount) DESC`,
    [from, to]
  );
  return rows;
}

export const receiptRegister = expenseRegister;
export const vendorPaymentSummary = vendorExpenseReport;
export const receiptCategorySummary = categoryExpenseReport;
export const payslipSummary = salarySummary;
