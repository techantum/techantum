import { mkdir, mkdtemp, readFile, rm } from 'fs/promises';
import os from 'os';
import path from 'path';
import { writeFinanceAudit } from './audit';
import { q } from './db';
import { buildSheet } from './excel';
import { parseFinancialYear, resolvePeriod, todayISO } from './fy';
import {
  salesRegister,
  expenseRegister,
  invoicePaymentRegister,
  salarySummary,
  transactionRegister,
  gstSummary,
  tdsSummary,
} from './reports';
import { getFinanceSettings } from './settings';
import { absoluteFinancePath, sanitizeFilename } from './storage';
import { writeZipFile, type ZipEntry } from './zip';

const SALES_COLS = [
  { header: 'Invoice Date', key: 'invoice_date', width: 14 },
  { header: 'Invoice Number', key: 'invoice_number', width: 18 },
  { header: 'Client Name', key: 'client_name', width: 28 },
  { header: 'Client GSTIN', key: 'client_gstin', width: 18 },
  { header: 'State', key: 'client_state', width: 16 },
  { header: 'Place of Supply', key: 'place_of_supply', width: 16 },
  { header: 'Project', key: 'project_name', width: 22 },
  { header: 'Description', key: 'description', width: 28 },
  { header: 'SAC/HSN', key: 'sac_hsn', width: 12 },
  { header: 'Taxable Value', key: 'taxable_amount', width: 14 },
  { header: 'CGST', key: 'cgst', width: 12 },
  { header: 'SGST', key: 'sgst', width: 12 },
  { header: 'IGST', key: 'igst', width: 12 },
  { header: 'Invoice Total', key: 'total_amount', width: 14 },
  { header: 'TDS Deducted', key: 'tds_deducted', width: 14 },
  { header: 'Amount Received', key: 'amount_received', width: 16 },
  { header: 'Outstanding', key: 'outstanding_amount', width: 14 },
  { header: 'Payment Date', key: 'payment_date', width: 14 },
  { header: 'Transaction Reference', key: 'transaction_reference', width: 20 },
  { header: 'Status', key: 'payment_status', width: 14 },
];

const RECEIPT_COLS = [
  { header: 'Receipt Date', key: 'expense_date', width: 14 },
  { header: 'Receipt ID', key: 'receipt_number', width: 18 },
  { header: 'Vendor Name', key: 'vendor_name', width: 24 },
  { header: 'Vendor GSTIN', key: 'vendor_gstin', width: 18 },
  { header: 'Vendor Invoice Number', key: 'vendor_invoice_number', width: 20 },
  { header: 'Vendor Invoice Date', key: 'vendor_invoice_date', width: 16 },
  { header: 'Category', key: 'category_name', width: 22 },
  { header: 'Description', key: 'description', width: 32 },
  { header: 'Taxable Amount', key: 'taxable_amount', width: 14 },
  { header: 'CGST', key: 'cgst', width: 12 },
  { header: 'SGST', key: 'sgst', width: 12 },
  { header: 'IGST', key: 'igst', width: 12 },
  { header: 'Total GST', key: 'total_gst', width: 12 },
  { header: 'Invoice Total', key: 'total_amount', width: 14 },
  { header: 'TDS', key: 'tds_amount', width: 12 },
  { header: 'Amount Paid', key: 'amount_paid', width: 14 },
  { header: 'Payment Date', key: 'payment_date', width: 14 },
  { header: 'Payment Mode', key: 'payment_mode', width: 14 },
  { header: 'Transaction Reference', key: 'transaction_reference', width: 20 },
  { header: 'Document Available', key: 'has_document', width: 16 },
  { header: 'Document Filename', key: 'document_filename', width: 28 },
  { header: 'Notes', key: 'notes', width: 24 },
];

async function salesRows(from: string, to: string) {
  const invoices = await salesRegister(from, to);
  const items = await q(
    undefined,
    `SELECT it.invoice_id, it.description, it.sac_hsn, p.payment_date, p.transaction_reference
     FROM finance_invoice_items it
     JOIN finance_invoices i ON i.id = it.invoice_id
     LEFT JOIN LATERAL (
       SELECT payment_date, transaction_reference FROM finance_invoice_payments
       WHERE invoice_id = i.id AND status='active' ORDER BY payment_date DESC LIMIT 1
     ) p ON TRUE
     WHERE i.invoice_date BETWEEN $1 AND $2 AND i.invoice_status IN ('finalized','sent') AND it.line_no = 1`,
    [from, to]
  );
  const byId = new Map(items.rows.map((r) => [r.invoice_id, r]));
  return invoices.map((inv) => {
    const match = byId.get(inv.id);
    return {
      ...inv,
      description: match?.description || '',
      sac_hsn: match?.sac_hsn || '',
      payment_date: match?.payment_date || '',
      transaction_reference: match?.transaction_reference || '',
    };
  });
}

export async function buildCaWorkbook(kind: string, from: string, to: string) {
  if (kind === 'sales' || kind === 'invoices') return buildSheet('Invoice Register', SALES_COLS, await salesRows(from, to));
  if (kind === 'invoice-payments' || kind === 'payments') {
    return buildSheet(
      'Invoice Payment Register',
      [
        { header: 'Payment Date', key: 'payment_date', width: 14 },
        { header: 'Invoice Number', key: 'invoice_number', width: 18 },
        { header: 'Client', key: 'client_name', width: 28 },
        { header: 'Amount Received', key: 'amount_received', width: 16 },
        { header: 'TDS', key: 'tds_deducted', width: 12 },
        { header: 'Other Deduction', key: 'other_deduction', width: 14 },
        { header: 'Mode', key: 'payment_mode', width: 14 },
        { header: 'Bank Account', key: 'bank_account', width: 18 },
        { header: 'Transaction Reference', key: 'transaction_reference', width: 22 },
        { header: 'Currency', key: 'currency', width: 10 },
      ],
      await invoicePaymentRegister(from, to)
    );
  }
  if (kind === 'expenses' || kind === 'receipts') {
    const rows = await expenseRegister(from, to);
    const docs = await q(undefined, `SELECT reference_id, original_filename FROM finance_documents WHERE document_type IN ('expense_receipt','receipt','vendor_invoice','vendor_bill')`);
    const byRef = new Map(docs.rows.map((d) => [d.reference_id, d.original_filename]));
    return buildSheet(
      'Receipt Register',
      RECEIPT_COLS,
      rows.map((r) => ({
        ...r,
        has_document: r.has_document ? 'Yes' : 'No',
        document_filename: byRef.get(r.id) || '',
        payment_date: '',
      }))
    );
  }
  if (kind === 'salary' || kind === 'payslips') {
    return buildSheet(
      'Salary Summary',
      [
        { header: 'Employee', key: 'employee_name' },
        { header: 'Employee ID', key: 'employee_code' },
        { header: 'Department', key: 'department' },
        { header: 'Designation', key: 'designation' },
        { header: 'Month', key: 'payroll_month' },
        { header: 'Year', key: 'payroll_year' },
        { header: 'Financial Year', key: 'financial_year' },
        { header: 'Payslip Date', key: 'payslip_date' },
        { header: 'Uploaded', key: 'uploaded_at' },
        { header: 'File', key: 'original_filename' },
      ],
      await salarySummary(from, to)
    );
  }
  if (kind === 'transactions') {
    return buildSheet(
      'Transactions',
      [
        { header: 'Date', key: 'transaction_date' },
        { header: 'Type', key: 'transaction_type' },
        { header: 'Reference Type', key: 'reference_type' },
        { header: 'Client / Vendor', key: 'party_name', width: 24 },
        { header: 'Description', key: 'description', width: 32 },
        { header: 'Money In', key: 'money_in' },
        { header: 'Money Out', key: 'money_out' },
        { header: 'Mode', key: 'payment_mode' },
        { header: 'Bank', key: 'bank_account' },
        { header: 'Reference', key: 'transaction_reference' },
        { header: 'Status', key: 'status' },
      ],
      await transactionRegister(from, to)
    );
  }
  if (kind === 'gst') {
    const gst = await gstSummary(from, to);
    return buildSheet(
      'GST Summary',
      [
        { header: 'Side', key: 'side' },
        { header: 'Taxable', key: 'taxable' },
        { header: 'CGST', key: 'cgst' },
        { header: 'SGST', key: 'sgst' },
        { header: 'IGST', key: 'igst' },
      ],
      [
        { side: 'Output (Invoices)', ...gst.output },
        { side: 'Input (Receipts)', ...gst.input },
        { side: gst.disclaimer, taxable: '', cgst: '', sgst: '', igst: '' },
      ]
    );
  }
  if (kind === 'tds') {
    const tds = await tdsSummary(from, to);
    return buildSheet(
      'TDS Summary',
      [
        { header: 'Kind', key: 'kind' },
        { header: 'Date', key: 'payment_date' },
        { header: 'Type', key: 'tds_type' },
        { header: 'Section', key: 'tds_section' },
        { header: 'Rate', key: 'tds_rate' },
        { header: 'Amount', key: 'amount' },
        { header: 'Reference', key: 'transaction_reference' },
      ],
      [
        ...tds.clientPayments.map((r) => ({ kind: 'Client (receivable)', amount: r.tds_deducted, ...r })),
        ...tds.vendorPayments.map((r) => ({ kind: 'Vendor (payable)', amount: r.tds_amount, ...r })),
      ]
    );
  }
  throw new Error('Unknown export kind');
}

export async function buildCaPackage(input: { fy?: string; from?: string; to?: string }, userId: string) {
  const period = input.fy
    ? parseFinancialYear(input.fy)
    : resolvePeriod({ kind: 'custom', from: input.from || todayISO(), to: input.to || todayISO() });
  const from = (period as { from?: string; start?: string }).from || (period as { start?: string }).start || '';
  const to = (period as { to?: string; end?: string }).to || (period as { end?: string }).end || '';
  const settings = await getFinanceSettings();
  const fyLabel = input.fy || period.label;
  const company = sanitizeFilename(settings.company_name || 'Techantum');
  const zipName = `${company}_Finance_${fyLabel}.zip`;

  const entries: ZipEntry[] = [];
  const kinds = [
    ['invoices', 'Registers/Invoice_Register.xlsx'],
    ['invoice-payments', 'Registers/Invoice_Payment_Register.xlsx'],
    ['receipts', 'Registers/Receipt_Register.xlsx'],
    ['transactions', 'Registers/Transaction_Register.xlsx'],
    ['payslips', 'Registers/Salary_Summary.xlsx'],
    ['gst', 'Registers/GST_Summary.xlsx'],
    ['tds', 'Registers/TDS_Summary.xlsx'],
  ] as const;

  for (const [kind, name] of kinds) {
    entries.push({ name, data: await buildCaWorkbook(kind, from, to) });
  }

  const docs = await q(
    undefined,
    `SELECT document_type, original_filename, storage_path, reference_id
     FROM finance_documents
     WHERE document_date BETWEEN $1 AND $2 OR (document_date IS NULL AND uploaded_at::date BETWEEN $1 AND $2)`,
    [from, to]
  );

  const folderFor: Record<string, string> = {
    client_invoice: 'Client_Invoices',
    vendor_invoice: 'Vendor_Bills',
    vendor_bill: 'Vendor_Bills',
    expense_receipt: 'Receipts',
    receipt: 'Receipts',
    salary_document: 'Payslips',
    payslip: 'Payslips',
  };

  const used = new Set<string>();
  for (const doc of docs.rows) {
    const folder = folderFor[doc.document_type] || 'Other_Documents';
    let base = sanitizeFilename(doc.original_filename);
    let name = `${folder}/${base}`;
    let n = 1;
    while (used.has(name)) {
      const ext = path.extname(base);
      name = `${folder}/${base.slice(0, -ext.length || undefined)}_${n}${ext}`;
      n += 1;
    }
    used.add(name);
    try {
      entries.push({ name, filePath: absoluteFinancePath(doc.storage_path) });
    } catch {
      /* skip missing */
    }
  }

  const dir = await mkdtemp(path.join(os.tmpdir(), 'techantum-finance-'));
  const zipPath = path.join(dir, zipName);
  try {
    await mkdir(dir, { recursive: true });
    await writeZipFile(zipPath, entries);
    const buffer = await readFile(zipPath);
    await writeFinanceAudit(undefined, {
      userId,
      action: 'CA Export Generated',
      entityType: 'ca_package',
      next: { fy: fyLabel, from, to, files: entries.length, zipName },
    });
    return { buffer, zipName };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}

export { SALES_COLS, RECEIPT_COLS };
