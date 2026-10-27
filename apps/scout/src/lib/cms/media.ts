import { q } from '@/lib/finance/db';

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/x-icon',
  'image/vnd.microsoft.icon',
]);

export function mediaUrl(id: string) {
  return `/api/files/${id}`;
}

function mimeOf(file: Blob, name: string) {
  const fromType = (file.type || '').toLowerCase();
  if (fromType === 'image/jpg') return 'image/jpeg';
  if (fromType && (ALLOWED.has(fromType) || fromType.startsWith('image/'))) return fromType;
  const ext = name.split('.').pop()?.toLowerCase();
  const map: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    ico: 'image/x-icon',
  };
  return map[ext || ''] || 'application/octet-stream';
}

export async function saveRevealeoMedia(file: Blob, folder: string) {
  if (!file.size) throw new Error('No file provided');
  if (file.size > MAX_BYTES) throw new Error('Image must be under 8 MB');
  const fileName = 'name' in file && typeof (file as File).name === 'string' ? (file as File).name : 'upload.bin';
  const mime = mimeOf(file, fileName);
  if (!ALLOWED.has(mime) && !mime.startsWith('image/')) throw new Error('Upload an image file');
  const bytes = Buffer.from(await file.arrayBuffer());
  const inserted = await q<{ id: string }>(
    undefined,
    `INSERT INTO revealeo_media (folder, file_name, mime_type, bytes)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [folder === 'branding' ? 'branding' : 'cms', fileName.slice(-180), mime, bytes]
  );
  const id = inserted.rows[0]?.id;
  if (!id) throw new Error('Could not store the image');
  return { id, url: mediaUrl(id), mime };
}

export async function readRevealeoMedia(id: string) {
  const result = await q<{ mime_type: string; bytes: Buffer }>(
    undefined,
    'SELECT mime_type, bytes FROM revealeo_media WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}
