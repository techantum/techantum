import { NextResponse } from 'next/server';
import { requirePartner } from '@/lib/partner/auth';
import {
  listPartnerRequirements,
  saveRequirementDraft,
  duplicateRequirement,
} from '@/lib/partner/requirements';

export async function GET() {
  const auth = await requirePartner();
  if ('error' in auth) return auth.error;

  const data = await listPartnerRequirements(auth.partner.id);
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const auth = await requirePartner();
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json();

    if (body.action === 'duplicate' && body.sourceId) {
      const dup = await duplicateRequirement(body.sourceId, auth.partner.id, auth.partnerUser.id);
      return NextResponse.json(dup);
    }

    const requirement = await saveRequirementDraft({
      id: body.id,
      partnerId: auth.partner.id,
      partnerUserId: auth.partnerUser.id,
      serviceCategoryId: body.serviceCategoryId,
      packageId: body.packageId,
      divisionSlug: body.divisionSlug,
      planSlug: body.planSlug,
      engagementType: body.engagementType,
      projectName: body.projectName,
      industry: body.industry,
      country: body.country,
      budgetRange: body.budgetRange,
      timeline: body.timeline,
      priority: body.priority,
      businessData: body.businessData,
      projectData: body.projectData,
      modulesData: body.modulesData,
      answers: body.answers,
      partnerNotes: body.partnerNotes,
    });

    return NextResponse.json(requirement);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Save failed' },
      { status: 500 }
    );
  }
}
