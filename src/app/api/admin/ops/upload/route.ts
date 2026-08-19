import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { saveUploadedFile } from '@/lib/storage/local';

const MAX_PDF_BYTES = 15 * 1024 * 1024;

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const isPdf = file.type === 'application/pdf' || ext === 'pdf';
    if (!isPdf) return NextResponse.json({ error: 'Only PDF files are allowed.' }, { status: 400 });
    if (file.size > MAX_PDF_BYTES) return NextResponse.json({ error: 'PDF must be under 15 MB.' }, { status: 400 });
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(-80);
    const { url } = await saveUploadedFile('ops-scope', `scope-${Date.now()}-${safeName}`, file);
    return NextResponse.json({ url });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Upload failed' }, { status: 500 });
  }
}
