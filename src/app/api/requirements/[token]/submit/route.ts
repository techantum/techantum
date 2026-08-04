import { NextResponse } from 'next/server';
import { submitPublicRequirement } from '@/lib/client-requirements/service';

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  try {
    const body = await request.json();
    const requirement = await submitPublicRequirement({
      token,
      password: body.password,
      requirementId: body.requirementId,
      answers: body.answers ?? {},
      confirmedAccuracy: Boolean(body.confirmedAccuracy),
    });
    return NextResponse.json(requirement);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Submit failed' }, { status: 400 });
  }
}
