import { NextResponse } from 'next/server';
import { requireCmsAdmin } from '@/lib/cms/auth';
import { getRevealeoSite, saveRevealeoSection } from '@/lib/cms/site';
import { CMS_SECTIONS } from '@/lib/cms/defaults';

export async function GET() {
  const auth = await requireCmsAdmin();
  if ('error' in auth && auth.error) return auth.error;
  const site = await getRevealeoSite();
  return NextResponse.json({ sections: CMS_SECTIONS, content: site.content });
}

export async function PUT(request: Request) {
  const auth = await requireCmsAdmin();
  if ('error' in auth && auth.error) return auth.error;
  const body = await request.json().catch(() => ({}));
  try {
    if (body.all && body.content && typeof body.content === 'object') {
      const saved: Record<string, Record<string, unknown>> = {};
      for (const section of CMS_SECTIONS) {
        const payload = body.content[section.key];
        if (payload && typeof payload === 'object') {
          saved[section.key] = await saveRevealeoSection(section.key, payload as Record<string, unknown>);
        }
      }
      return NextResponse.json({ content: saved });
    }
    const key = String(body.key || '');
    const content = body.content && typeof body.content === 'object' ? body.content : {};
    const saved = await saveRevealeoSection(key, content);
    return NextResponse.json(saved);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Save failed' }, { status: 400 });
  }
}
