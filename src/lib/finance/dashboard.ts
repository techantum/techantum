import { q } from './db';
import { resolvePeriod, type PeriodFilter } from './fy';
import { fromCents, toCents } from './money';

export async function getFinanceDashboard(filter: PeriodFilter) {
  const period = resolvePeriod(filter);
  const { from, to } = period;

  const invoiced = await q<{ v: string }>(
    undefined,
    `SELECT COALESCE(SUM(total_amount),0)::text AS v FROM finance_invoices
     WHERE invoice_date BETWEEN $1 AND $2 AND invoice_status IN ('finalized','sent')`,
    [from, to]
  );
  const collected = await q<{ v: string }>(
    undefined,
    `SELECT COALESCE(SUM(amount_received),0)::text AS v FROM finance_invoice_payments
     WHERE payment_date BETWEEN $1 AND $2 AND status='active'`,
    [from, to]
  );
  const outstanding = await q<{ v: string }>(
    undefined,
    `SELECT COALESCE(SUM(outstanding_amount),0)::text AS v FROM finance_invoices
     WHERE invoice_date BETWEEN $1 AND $2 AND invoice_status IN ('finalized','sent')`,
    [from, to]
  );
  const receipts = await q<{ v: string }>(
    undefined,
    `SELECT COALESCE(SUM(total_amount),0)::text AS v
     FROM finance_expenses
     WHERE expense_date BETWEEN $1 AND $2 AND status='recorded'`,
    [from, to]
  );
  const paidReceipts = await q<{ v: string }>(
    undefined,
    `SELECT COALESCE(SUM(amount_paid),0)::text AS v FROM finance_expense_payments
     WHERE payment_date BETWEEN $1 AND $2 AND status='active'`,
    [from, to]
  );

  const totalInvoiced = toCents(invoiced.rows[0]?.v);
  const paymentsReceived = toCents(collected.rows[0]?.v);
  const outstandingAmt = toCents(outstanding.rows[0]?.v);
  const totalReceipts = toCents(receipts.rows[0]?.v);
  const paid = toCents(paidReceipts.rows[0]?.v);
  const netCash = paymentsReceived - paid;

  const recent = await q(
    undefined,
    `SELECT id, transaction_date, transaction_type, description, money_in, money_out, payment_mode, status
     FROM finance_transactions WHERE transaction_date BETWEEN $1 AND $2
     ORDER BY transaction_date DESC, created_at DESC LIMIT 12`,
    [from, to]
  );
  const outstandingInvoices = await q(
    undefined,
    `SELECT id, invoice_number, invoice_date, due_date, client_name, total_amount, outstanding_amount, payment_status
     FROM finance_invoices
     WHERE invoice_status IN ('finalized','sent') AND outstanding_amount > 0
     ORDER BY invoice_date DESC LIMIT 10`
  );
  const overdue = await q(
    undefined,
    `SELECT id, invoice_number, invoice_date, due_date, client_name, total_amount, outstanding_amount, payment_status
     FROM finance_invoices
     WHERE invoice_status IN ('finalized','sent') AND payment_status='overdue'
     ORDER BY due_date ASC NULLS LAST LIMIT 10`
  );
  const missingDocs = await q(
    undefined,
    `SELECT e.id, e.expense_date, e.receipt_number, e.description, e.total_amount, v.vendor_name
     FROM finance_expenses e
     LEFT JOIN finance_vendors v ON v.id = e.vendor_id
     WHERE e.status='recorded'
       AND NOT EXISTS (SELECT 1 FROM finance_documents d WHERE d.reference_type IN ('expense','receipt') AND d.reference_id=e.id)
     ORDER BY e.expense_date DESC LIMIT 10`
  );

  const monthly = await q<{ month: string; invoiced: string; received: string; receipts: string }>(
    undefined,
    `SELECT m.month,
            COALESCE(inv.v,0)::text AS invoiced,
            COALESCE(inc.v,0)::text AS received,
            COALESCE(exp.v,0)::text AS receipts
     FROM (
       SELECT to_char(d, 'YYYY-MM') AS month
       FROM generate_series($1::date, $2::date, interval '1 month') d
     ) m
     LEFT JOIN (
       SELECT to_char(invoice_date,'YYYY-MM') AS month, SUM(total_amount) AS v
       FROM finance_invoices WHERE invoice_status IN ('finalized','sent') AND invoice_date BETWEEN $1 AND $2
       GROUP BY 1
     ) inv ON inv.month = m.month
     LEFT JOIN (
       SELECT to_char(payment_date,'YYYY-MM') AS month, SUM(amount_received) AS v
       FROM finance_invoice_payments WHERE status='active' AND payment_date BETWEEN $1 AND $2
       GROUP BY 1
     ) inc ON inc.month = m.month
     LEFT JOIN (
       SELECT to_char(payment_date,'YYYY-MM') AS month, SUM(amount_paid) AS v
       FROM finance_expense_payments WHERE status='active' AND payment_date BETWEEN $1 AND $2
       GROUP BY 1
     ) exp ON exp.month = m.month
     ORDER BY m.month`,
    [from, to]
  );

  const byCategory = await q<{ name: string; total: string }>(
    undefined,
    `SELECT COALESCE(c.category_name,'Uncategorised') AS name, COALESCE(SUM(e.total_amount),0)::text AS total
     FROM finance_expenses e
     LEFT JOIN finance_expense_categories c ON c.id = e.category_id
     WHERE e.expense_date BETWEEN $1 AND $2 AND e.status='recorded'
     GROUP BY c.category_name
     ORDER BY SUM(e.total_amount) DESC
     LIMIT 12`,
    [from, to]
  );

  return {
    period,
    cards: {
      totalInvoiced: fromCents(totalInvoiced),
      paymentsReceived: fromCents(paymentsReceived),
      outstanding: fromCents(outstandingAmt),
      totalReceipts: fromCents(totalReceipts),
      receiptsPaid: fromCents(paid),
      netCashPosition: fromCents(netCash),
    },
    recentTransactions: recent.rows,
    outstandingInvoices: outstandingInvoices.rows,
    overdueInvoices: overdue.rows,
    receiptsMissingDocs: missingDocs.rows,
    expensesMissingDocs: missingDocs.rows,
    monthly: monthly.rows,
    receiptsByCategory: byCategory.rows,
    expensesByCategory: byCategory.rows,
  };
}
