import { writeFinanceAudit } from './audit';
import { q, type DbClient } from './db';
import { FinanceNotFoundError } from './errors';
import { financialYearFromDate, todayISO } from './fy';
import { saveFinanceFile, sanitizeFilename } from './storage';

export type DocumentType =
  | 'client_invoice'
  | 'vendor_bill'
  | 'vendor_invoice'
  | 'receipt'
  | 'expense_receipt'
  | 'payslip'
  | 'salary_document'
  | 'bank_statement'
  | 'tax_document'
  | 'other';

export const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: 'client_invoice', label: 'Client Invoices' },
  { value: 'vendor_bill', label: 'Vendor Bills' },
  { value: 'receipt', label: 'Receipts' },
  { value: 'payslip', label: 'Payslips' },
  { value: 'bank_statement', label: 'Bank Statements' },
  { value: 'tax_document', label: 'Tax Documents' },
  { value: 'other', label: 'Other Documents' },
];

export async function registerDocument(
  client: DbClient | undefined,
  input: {
    documentType: DocumentType;
    referenceType?: string | null;
    referenceId?: string | null;
    documentDate?: string | null;
    originalFilename: string;
    storedFilename: string;
    storagePath: string;
    mimeType: string;
    fileSize: number;
    notes?: string | null;
    userId: string;
  }
) {
  const fy = input.documentDate ? financialYearFromDate(input.documentDate).label : financialYearFromDate(todayISO()).label;
  const { rows } = await q(
    client,
    `INSERT INTO finance_documents (
       document_type, reference_type, reference_id, document_date, financial_year,
       original_filename, stored_filename, storage_path, mime_type, file_size, notes, uploaded_by, created_by
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$12)
     RETURNING *`,
    [
      input.documentType,
      input.referenceType || null,
      input.referenceId || null,
      input.documentDate || null,
      fy,
      input.originalFilename,
      input.storedFilename,
      input.storagePath,
      input.mimeType,
      input.fileSize,
      input.notes || null,
      input.userId,
    ]
  );
  await writeFinanceAudit(client, {
    userId: input.userId,
    action: 'Document Uploaded',
    entityType: 'finance_document',
    entityId: rows[0].id,
    next: rows[0],
  });
  return rows[0];
}

export async function uploadAndRegister(
  file: File,
  input: {
    documentType: DocumentType;
    folder: string;
    referenceType?: string | null;
    referenceId?: string | null;
    documentDate?: string | null;
    notes?: string | null;
    userId: string;
    client?: DbClient;
  }
) {
  const stored = await saveFinanceFile(file, input.folder);
  return registerDocument(input.client, {
    documentType: input.documentType,
    referenceType: input.referenceType,
    referenceId: input.referenceId,
    documentDate: input.documentDate,
    notes: input.notes,
    userId: input.userId,
    originalFilename: stored.original_filename,
    storedFilename: stored.stored_filename,
    storagePath: stored.storage_path,
    mimeType: stored.mime_type,
    fileSize: stored.file_size,
  });
}

export async function listDocuments(params: {
  q?: string;
  documentType?: string;
  referenceType?: string;
  referenceId?: string;
  fy?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize || 25));
  const where: string[] = [];
  const values: unknown[] = [];
  if (params.documentType) {
    values.push(params.documentType);
    where.push(`document_type = $${values.length}`);
  }
  if (params.referenceType) {
    values.push(params.referenceType);
    where.push(`reference_type = $${values.length}`);
  }
  if (params.referenceId) {
    values.push(params.referenceId);
    where.push(`reference_id = $${values.length}`);
  }
  if (params.fy) {
    values.push(params.fy);
    where.push(`financial_year = $${values.length}`);
  }
  if (params.from) {
    values.push(params.from);
    where.push(`document_date >= $${values.length}`);
  }
  if (params.to) {
    values.push(params.to);
    where.push(`document_date <= $${values.length}`);
  }
  if (params.q) {
    values.push(`%${params.q}%`);
    where.push(`(original_filename ILIKE $${values.length} OR notes ILIKE $${values.length})`);
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const { rows } = await q(
    undefined,
    `SELECT id, document_type, reference_type, reference_id, document_date, financial_year,
            original_filename, mime_type, file_size, notes, uploaded_by, uploaded_at
     FROM finance_documents ${clause}
     ORDER BY uploaded_at DESC
     LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
    values
  );
  const count = await q<{ count: string }>(undefined, `SELECT COUNT(*)::text AS count FROM finance_documents ${clause}`, values);
  return { rows, total: Number(count.rows[0]?.count || 0), page, pageSize };
}

export async function getDocument(id: string) {
  const { rows } = await q(undefined, 'SELECT * FROM finance_documents WHERE id = $1', [id]);
  if (!rows[0]) throw new FinanceNotFoundError('Document not found');
  return rows[0];
}

export function downloadName(doc: { original_filename: string; stored_filename: string }) {
  return sanitizeFilename(doc.original_filename || doc.stored_filename);
}
