import { NextResponse } from 'next/server';
import { getPublicRequirement } from '@/lib/client-requirements/service';

export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const url = new URL(request.url);
  try {
    return NextResponse.json(await getPublicRequirement(token, url.searchParams.get('password')));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Requirement link is unavailable';
    return NextResponse.json({ error: message }, { status: message === 'Password required' ? 401 : 404 });
  }
}
