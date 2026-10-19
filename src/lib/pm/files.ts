import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { writePmAudit } from './audit';
import { q } from '@/lib/finance/db';
import { FinanceNotFoundError, FinanceValidationError } from '@/lib/finance/errors';
import { absoluteFinancePath } from '@/lib/finance/storage';

const MAX_BYTES = 12 * 1024 * 1024;
const ENTITIES = new Set([
  'project', 'asset', 'access', 'server', 'supplier', 'software', 'backup', 'incident',
  'vulnerability', 'training', 'joiner_leaver', 'change', 'risk', 'corrective_action', 'control',
]);

function sniff(buf: Buffer, ext: string) {
  if (buf.length >= 4 && buf.subarray(0, 4).toString('ascii') === '%PDF' && ext === '.pdf') return 'application/pdf';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff && (ext === '.jpg' || ext === '.jpeg')) return 'image/jpeg';
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 && ext === '.png') return 'image/png';
  const zip = buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04;
  if (zip && ext === '.docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (zip && ext === '.xlsx') return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const ole = buf.length >= 4 && buf[0] === 0xd0 && buf[1] === 0xcf && buf[2] === 0x11 && buf[3] === 0xe0;
  if (ole && ext === '.doc') return 'application/msword';
  if (ole && ext === '.xls') return 'application/vnd.ms-excel';
  return null;
}

export async function saveEvidence(file: File, input: { entityType: string; entityId?: string | null; description?: string; userId: string }) {
  if (!ENTITIES.has(input.entityType)) throw new FinanceValidationError('Evidence cannot be linked to that record type');
  if (file.size > MAX_BYTES) throw new FinanceValidationError('File is larger than 12 MB');
  const original = (file.name || 'document').replace(/[/\\]/g, '_');
  const ext = path.extname(original).toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());
  const mime = sniff(buffer, ext);
  if (!mime) throw new FinanceValidationError('Only PDF, JPG, PNG, DOC, DOCX, XLS and XLSX files are allowed');
  const stored = `${randomUUID()}${ext === '.jpeg' ? '.jpg' : ext}`;
  const rel = path.posix.join('pm-evidence', String(new Date().getFullYear()), stored);
  const full = absoluteFinancePath(rel);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, buffer);
  const { rows } = await q(
    undefined,
    `INSERT INTO process_evidence
      (document_name, document_type, entity_type, entity_id, description, storage_path, original_filename, mime_type, file_size, uploaded_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id, document_name, document_type, entity_type, entity_id, description, uploaded_at`,
    [original, ext.replace('.', ''), input.entityType, input.entityId || null, input.description || null, rel, original, mime, buffer.length, input.userId]
  );
  await writePmAudit(undefined, { userId: input.userId, entityType: 'evidence', entityId: rows[0].id, action: 'Create', next: rows[0] });
  return rows[0];
}

export async function listEvidence(params: { entityType?: string; entityId?: string; q?: string }) {
  const values: unknown[] = [];
  const where: string[] = [];
  if (params.entityType) {
    values.push(params.entityType);
    where.push(`entity_type = $${values.length}`);
  }
  if (params.entityId) {
    values.push(params.entityId);
    where.push(`entity_id = $${values.length}`);
  }
  if (params.q) {
    values.push(`%${params.q}%`);
    where.push(`document_name ILIKE $${values.length}`);
  }
  const { rows } = await q(
    undefined,
    `SELECT id, document_name, document_type, entity_type, entity_id, description, uploaded_by, uploaded_at, file_size
     FROM process_evidence ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY uploaded_at DESC LIMIT 200`,
    values
  );
  return rows;
}

export async function evidenceFile(id: string) {
  const { rows } = await q(undefined, 'SELECT * FROM process_evidence WHERE id=$1', [id]);
  if (!rows[0]) throw new FinanceNotFoundError('Document not found');
  return { path: absoluteFinancePath(String(rows[0].storage_path)), row: rows[0] };
}
