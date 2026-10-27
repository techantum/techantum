import { NextResponse } from 'next/server';
import { readRevealeoMedia } from '@/lib/cms/media';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const row = await readRevealeoMedia(id);
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const bytes = Buffer.isBuffer(row.bytes) ? row.bytes : Buffer.from(row.bytes as ArrayBuffer);
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      'Content-Type': row.mime_type || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
