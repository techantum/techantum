import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { saveUploadedFile } from '@/lib/storage/local';
import { optimizeUploadedImage } from '@/lib/image/optimize';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

const IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
  'image/gif',
]);

const VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);

function resolveContentType(file: File, ext: string): string {
  if (file.type) return file.type;
  const map: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
  };
  return map[ext] ?? 'application/octet-stream';
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const mediaType = (formData.get('mediaType') as string) || 'image';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const contentType = resolveContentType(file, ext);
    const isVideo = mediaType === 'video' || VIDEO_TYPES.has(contentType);
    const isImage = mediaType === 'image' || IMAGE_TYPES.has(contentType);

    if (!isVideo && !isImage) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }

    if (isVideo && file.size > MAX_VIDEO_BYTES) {
      return NextResponse.json({ error: 'Video must be under 50 MB' }, { status: 400 });
    }

    if (isImage && file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Image must be under 10 MB' }, { status: 400 });
    }

    const fileName = `${isVideo ? 'video' : 'image'}-${Date.now()}`;
    let saveName = `${fileName}.${ext}`;
    let fileToSave: File | Blob = file;

    if (isImage && contentType !== 'image/svg+xml' && contentType !== 'image/gif') {
      const buffer = Buffer.from(await file.arrayBuffer());
      const optimized = await optimizeUploadedImage(buffer, contentType);
      saveName = `${fileName}.${optimized.ext}`;
      fileToSave = new Blob([optimized.buffer], { type: optimized.contentType });
    }

    const { url } = await saveUploadedFile('cms', saveName, fileToSave as File);

    return NextResponse.json({
      url,
      mediaType: isVideo ? 'video' : 'image',
    });
  } catch (err) {
    console.error('Media upload error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
