import { NextResponse } from 'next/server';
import { publicRequirement, submitRequirement } from '@/lib/pm/client-updates';
import { financeErrorResponse } from '@/lib/finance/http';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    return NextResponse.json(await publicRequirement(token));
  } catch (err) {
    return financeErrorResponse(err);
  }
}

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    const body = await request.json();
    return NextResponse.json(await submitRequirement(token, body));
  } catch (err) {
    return financeErrorResponse(err);
  }
}
