import { NextResponse } from 'next/server';
import { savePublicRequirement } from '@/lib/client-requirements/service';

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  try {
    const body = await request.json();
    const requirement = await savePublicRequirement({
      token,
      password: body.password,
      requirementId: body.requirementId,
      answers: body.answers ?? {},
      currentSectionSlug: body.currentSectionSlug,
    });
    return NextResponse.json(requirement);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Save failed' }, { status: 400 });
  }
}
