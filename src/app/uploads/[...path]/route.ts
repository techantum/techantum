import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import path from 'path';
import { getUploadRoot } from '@/lib/storage/local';

const MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;
  const relative = segments.join('/');

  if (!relative || relative.includes('..')) {
    return new NextResponse('Not found', { status: 404 });
  }

  const root = path.resolve(getUploadRoot());
  const filePath = path.resolve(root, relative);

  if (!filePath.startsWith(`${root}${path.sep}`) && filePath !== root) {
    return new NextResponse('Not found', { status: 404 });
  }

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      return new NextResponse('Not found', { status: 404 });
    }

    const buffer = await readFile(filePath);
    const ext = relative.split('.').pop()?.toLowerCase() || '';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Length': String(fileStat.size),
      },
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
