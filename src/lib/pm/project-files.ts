import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { writePmAudit } from './audit';
import { q } from '@/lib/finance/db';
import { FinanceNotFoundError, FinanceValidationError } from '@/lib/finance/errors';
import { absoluteFinancePath } from '@/lib/finance/storage';

const MAX_BYTES = 12 * 1024 * 1024;

function sniff(buf: Buffer, ext: string) {
  if (buf.length >= 4 && buf.subarray(0, 4).toString('ascii') === '%PDF' && ext === '.pdf') return 'application/pdf';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff && (ext === '.jpg' || ext === '.jpeg')) return 'image/jpeg';
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 && ext === '.png') return 'image/png';
  const gif = buf.length >= 6 && (buf.subarray(0, 6).toString('ascii') === 'GIF87a' || buf.subarray(0, 6).toString('ascii') === 'GIF89a');
  if (gif && ext === '.gif') return 'image/gif';
  if (buf.length >= 12 && buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP' && ext === '.webp') return 'image/webp';
  return null;
}

export async function listProjectFiles(projectId: string) {
  const { rows } = await q(
    undefined,
    `SELECT id, project_id, kind, label, external_url, original_filename, mime_type, file_size, created_at
     FROM project_management_project_files WHERE project_id=$1 ORDER BY created_at DESC`,
    [projectId]
  );
  return rows;
}

export async function addProjectUrl(projectId: string, rawUrl: string, userId: string) {
  let parsed: URL;
  try {
    parsed = new URL(String(rawUrl || '').trim());
  } catch {
    throw new FinanceValidationError('Enter a valid requirement URL');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new FinanceValidationError('Requirement links must start with http or https');
  const { rows: project } = await q(undefined, `SELECT id FROM project_management_projects WHERE id=$1`, [projectId]);
  if (!project[0]) throw new FinanceNotFoundError('Project not found');
  const { rows } = await q(
    undefined,
    `INSERT INTO project_management_project_files (project_id, kind, label, external_url, created_by)
     VALUES ($1,'url',$2,$3,$4) RETURNING id, project_id, kind, label, external_url, original_filename, mime_type, file_size, created_at`,
    [projectId, parsed.hostname, parsed.toString(), userId]
  );
  await writePmAudit(undefined, { userId, entityType: 'project_file', entityId: rows[0].id, projectId, action: 'Requirement Link Added', next: rows[0] });
  return rows[0];
}

export async function addProjectFile(projectId: string, file: File, userId: string) {
  const { rows: project } = await q(undefined, `SELECT id FROM project_management_projects WHERE id=$1`, [projectId]);
  if (!project[0]) throw new FinanceNotFoundError('Project not found');
  if (file.size > MAX_BYTES) throw new FinanceValidationError('File is larger than 12 MB');
  const original = (file.name || 'document').replace(/[/\\]/g, '_');
  const ext = path.extname(original).toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());
  const mime = sniff(buffer, ext);
  if (!mime) throw new FinanceValidationError('Only PDF and image files are allowed');
  const stored = `${randomUUID()}${ext === '.jpeg' ? '.jpg' : ext}`;
  const rel = path.posix.join('pm-evidence', String(new Date().getFullYear()), stored);
  await mkdir(path.dirname(absoluteFinancePath(rel)), { recursive: true });
  await writeFile(absoluteFinancePath(rel), buffer);
  const { rows } = await q(
    undefined,
    `INSERT INTO project_management_project_files
      (project_id, kind, label, storage_path, original_filename, mime_type, file_size, created_by)
     VALUES ($1,'file',$2,$3,$4,$5,$6,$7)
     RETURNING id, project_id, kind, label, external_url, original_filename, mime_type, file_size, created_at`,
    [projectId, original, rel, original, mime, buffer.length, userId]
  );
  await writePmAudit(undefined, { userId, entityType: 'project_file', entityId: rows[0].id, projectId, action: 'Requirement File Added', next: rows[0] });
  return rows[0];
}

export async function projectFile(id: string) {
  const { rows } = await q(undefined, `SELECT * FROM project_management_project_files WHERE id=$1`, [id]);
  if (!rows[0] || rows[0].kind !== 'file' || !rows[0].storage_path) throw new FinanceNotFoundError('File not found');
  return { path: absoluteFinancePath(String(rows[0].storage_path)), row: rows[0] };
}

export async function removeProjectFile(id: string, userId: string) {
  const { rows } = await q(undefined, `DELETE FROM project_management_project_files WHERE id=$1 RETURNING *`, [id]);
  if (!rows[0]) throw new FinanceNotFoundError('Requirement item not found');
  await writePmAudit(undefined, { userId, entityType: 'project_file', entityId: id, projectId: rows[0].project_id, action: 'Requirement Item Removed', previous: rows[0] });
  return { ok: true };
}
