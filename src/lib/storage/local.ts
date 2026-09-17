import { mkdir, unlink, writeFile } from 'fs/promises';
import path from 'path';

/** VPS/local disk storage. Defaults to public/uploads (served as /uploads/...). */
export function getUploadRoot(): string {
  if (process.env.UPLOAD_DIR) {
    return path.resolve(process.env.UPLOAD_DIR);
  }
  return path.join(process.cwd(), 'public', 'uploads');
}

export function getPublicUploadUrl(relativePath: string): string {
  const clean = relativePath.replace(/^\/+/, '');
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.SITE_URL ||
    ''
  ).replace(/\/$/, '');
  const urlPath = clean.startsWith('uploads/') ? `/${clean}` : `/uploads/${clean}`;
  return siteUrl ? `${siteUrl}${urlPath}` : urlPath;
}

export async function saveUploadedFile(
  subdir: string,
  fileName: string,
  file: File | Blob
): Promise<{ relativePath: string; url: string }> {
  const root = getUploadRoot();
  const dir = path.join(root, subdir);
  await mkdir(dir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, fileName), buffer);

  const relativePath = `uploads/${subdir}/${fileName}`;
  return { relativePath, url: getPublicUploadUrl(relativePath) };
}

export async function deleteUploadedFile(urlOrPath: string | null | undefined) {
  if (!urlOrPath) return;
  try {
    const raw = urlOrPath.includes('://') ? new URL(urlOrPath).pathname : urlOrPath;
    const match = raw.match(/^\/?(?:uploads\/)?(recruitment-resumes\/[^/]+)$/);
    if (!match) return;
    const root = path.resolve(path.join(getUploadRoot(), 'recruitment-resumes'));
    const full = path.resolve(path.join(getUploadRoot(), match[1]));
    if (full !== root && !full.startsWith(`${root}${path.sep}`)) return;
    await unlink(full);
  } catch {
    /* missing file is fine */
  }
}
