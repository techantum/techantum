import { NextResponse } from 'next/server';

export async function requirePartner() {
  return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
}
