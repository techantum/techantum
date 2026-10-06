import { NextResponse } from 'next/server';
import { requirePartnerNav } from '@/lib/partner/auth';
import { listPartnerProposalDocuments } from '@/lib/partner/requirements';

export async function GET() {
  const auth = await requirePartnerNav('documents');
  if ('error' in auth) return auth.error;

  const documents = await listPartnerProposalDocuments(auth.partner.id);
  return NextResponse.json(documents);
}
