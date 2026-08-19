import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { createOnboarding, listProjects } from '@/lib/ops/service';

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  try {
    const url = new URL(request.url);
    return NextResponse.json(
      await listProjects({
        status: url.searchParams.get('status') ?? undefined,
        search: url.searchParams.get('search') ?? undefined,
        clientId: url.searchParams.get('clientId') ?? undefined,
      })
    );
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to load projects' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  try {
    const body = await request.json();
    const result = await createOnboarding(body, auth.user.id);
    if (result.duplicates.length && !result.project) {
      return NextResponse.json(
        { error: 'A client with similar information already exists.', duplicates: result.duplicates },
        { status: 409 }
      );
    }
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to create project' }, { status: 400 });
  }
}
