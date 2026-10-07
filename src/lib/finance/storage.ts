import { randomUUID } from 'crypto';
import { createReadStream } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { FinanceValidationError } from './errors';

const MAX_BYTES = 12 * 1024 * 1024;
const ALLOWED: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
};

function financeRoot() {
  if (process.env.FINANCE_UPLOAD_DIR) return path.resolve(process.env.FINANCE_UPLOAD_DIR);
  return path.join(process.cwd(), 'storage', 'finance');
}

function extOf(name: string) {
  const ext = path.extname(name || '').toLowerCase();
  return ext === '.jpeg' ? '.jpg' : ext;
}

function sniffMime(buf: Buffer): string | null {
  if (buf.length >= 4 && buf.subarray(0, 4).toString('ascii') === '%PDF') return 'application/pdf';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return 'image/png';
  }
  return null;
}

export function absoluteFinancePath(storagePath: string) {
  const root = path.resolve(financeRoot());
  const full = path.resolve(root, storagePath);
  if (full !== root && !full.startsWith(`${root}${path.sep}`)) {
    throw new FinanceValidationError('Invalid storage path');
  }
  return full;
}

export async function saveFinanceFile(
  file: File,
  folder: string,
  options?: { pdfOnly?: boolean; displayName?: string }
) {
  const original = (file.name || 'document').replace(/[/\\]/g, '_');
  const ext = extOf(original);
  const declared = (file.type || '').toLowerCase();
  if (file.size > MAX_BYTES) throw new FinanceValidationError('File is larger than 12 MB');
  const buffer = Buffer.from(await file.arrayBuffer());
  const sniffed = sniffMime(buffer);
  const mime = sniffed || declared;
  if (options?.pdfOnly && mime !== 'application/pdf') {
    throw new FinanceValidationError('Only PDF files are allowed');
  }
  const allowedExts = ALLOWED[mime];
  if (!allowedExts || !allowedExts.includes(ext === '.jpg' && mime === 'image/jpeg' ? ext : ext)) {
    throw new FinanceValidationError('Only PDF, JPG and PNG files are allowed');
  }
  if (!sniffed) throw new FinanceValidationError('File contents do not match the declared type');
  const stored = `${randomUUID()}${ext === '.jpeg' ? '.jpg' : ext}`;
  const year = String(new Date().getFullYear());
  const rel = path.posix.join(folder, year, stored);
  const full = absoluteFinancePath(rel);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, buffer);
  return {
    original_filename: original,
    stored_filename: options?.displayName || stored,
    storage_path: rel,
    mime_type: mime,
    file_size: buffer.length,
  };
}

export async function saveFinanceBuffer(
  buffer: Buffer,
  folder: string,
  originalName: string,
  mime: string
) {
  const ext = extOf(originalName) || (mime === 'application/pdf' ? '.pdf' : mime === 'image/png' ? '.png' : '.jpg');
  const stored = `${randomUUID()}${ext}`;
  const year = String(new Date().getFullYear());
  const rel = path.posix.join(folder, year, stored);
  const full = absoluteFinancePath(rel);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, buffer);
  return {
    original_filename: originalName,
    stored_filename: stored,
    storage_path: rel,
    mime_type: mime,
    file_size: buffer.length,
  };
}

export function openFinanceFile(storagePath: string) {
  return createReadStream(absoluteFinancePath(storagePath));
}

export function sanitizeFilename(name: string) {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/_+/g, '_').slice(0, 120);
  return cleaned || 'document';
}
