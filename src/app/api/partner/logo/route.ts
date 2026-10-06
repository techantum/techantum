import { NextResponse } from 'next/server';
import { requirePartner, requirePartnerAdmin } from '@/lib/partner/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { saveUploadedFile } from '@/lib/storage/local';
import { optimizeUploadedImage } from '@/lib/image/optimize';

const MAX_BYTES = 4 * 1024 * 1024;
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif']);

function contentTypeFor(file: File, ext: string) {
  if (file.type) return file.type;
  const map: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    svg: 'image/svg+xml',
  };
  return map[ext] ?? 'application/octet-stream';
}

export async function GET() {
  const auth = await requirePartner();
  if ('error' in auth) return auth.error;
  return NextResponse.json({
    company_name: auth.partner.company_name,
    logo_url: auth.partner.logo_url ?? null,
    partner_code: auth.partner.partner_code,
  });
}

export async function POST(request: Request) {
  const auth = await requirePartnerAdmin();
  if ('error' in auth) return auth.error;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Logo must be under 4 MB' }, { status: 400 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
    const contentType = contentTypeFor(file, ext);
    if (!IMAGE_TYPES.has(contentType)) {
      return NextResponse.json({ error: 'Upload a PNG, JPG, WEBP, GIF, or SVG logo' }, { status: 400 });
    }

    const fileName = `logo-${auth.partner.id}-${Date.now()}`;
    let saveName = `${fileName}.${ext}`;
    let fileToSave: File | Blob = file;

    if (contentType !== 'image/svg+xml' && contentType !== 'image/gif') {
      const buffer = Buffer.from(await file.arrayBuffer());
      const optimized = await optimizeUploadedImage(buffer, contentType);
      saveName = `${fileName}.${optimized.ext}`;
      fileToSave = new Blob([optimized.buffer], { type: optimized.contentType });
    }

    const { url } = await saveUploadedFile('partner-logos', saveName, fileToSave as File);
    const supabase = createAdminClient();
    const { error } = await supabase.from('partners').update({ logo_url: url }).eq('id', auth.partner.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      url,
      company_name: auth.partner.company_name,
      partner_code: auth.partner.partner_code,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Upload failed' }, { status: 500 });
  }
}

export async function DELETE() {
  const auth = await requirePartnerAdmin();
  if ('error' in auth) return auth.error;

  const supabase = createAdminClient();
  const { error } = await supabase.from('partners').update({ logo_url: null }).eq('id', auth.partner.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ url: null });
}
