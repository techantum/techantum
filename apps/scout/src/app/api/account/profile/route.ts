import { NextResponse } from 'next/server';
import { currentProfile, saveProfile, saveProfilePhoto } from '@/lib/saas/profile';
import { getPlatformActor } from '@/lib/saas/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  const profile = await currentProfile();
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(profile);
}

export async function PUT(request: Request) {
  const actor = await getPlatformActor();
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      const name = String(form.get('name') || '');
      const file = form.get('file');
      if (name) await saveProfile(actor.userId, { name });
      if (file instanceof Blob && file.size) await saveProfilePhoto(actor.userId, file);
      return NextResponse.json(await currentProfile());
    }
    const body = await request.json().catch(() => ({}));
    const profile = await saveProfile(actor.userId, { name: body.name, avatarUrl: body.avatarUrl });
    return NextResponse.json(profile);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not save profile' }, { status: 400 });
  }
}
