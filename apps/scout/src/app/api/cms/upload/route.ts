import { NextResponse } from 'next/server';
import { requireCmsAdmin } from '@/lib/cms/auth';
import { saveRevealeoMedia } from '@/lib/cms/media';
import { attachBrandingImage, attachCmsImage } from '@/lib/cms/site';
import { DEFAULT_BRANDING } from '@/lib/cms/defaults';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const auth = await requireCmsAdmin();
  if ('error' in auth && auth.error) return auth.error;

  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof Blob) || !file.size) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const folder = String(form.get('folder') || 'cms');
    const field = String(form.get('field') || '');
    const section = String(form.get('section') || '');
    const saved = await saveRevealeoMedia(file, folder);

    if (field && field in DEFAULT_BRANDING) {
      await attachBrandingImage(field, saved.url);
    } else if (section && field) {
      await attachCmsImage(section, field, saved.url);
    }

    return NextResponse.json({ id: saved.id, url: saved.url });
  } catch (err) {
    console.error('[revealeo-cms] upload failed', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Upload failed' }, { status: 500 });
  }
}
