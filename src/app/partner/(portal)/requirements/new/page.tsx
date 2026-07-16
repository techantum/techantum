'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import RequirementWizard from '@/components/partner/RequirementWizard';

function NewRequirementContent() {
  const searchParams = useSearchParams();
  return (
    <RequirementWizard
      initialDivision={searchParams?.get('division') ?? undefined}
      initialPlan={searchParams?.get('plan') ?? undefined}
      initialCategoryId={searchParams?.get('category') ?? undefined}
      initialPackageId={searchParams?.get('package') ?? undefined}
      initialRequirementId={searchParams?.get('draft') ?? undefined}
      initialEngagement={searchParams?.get('engagement') ?? undefined}
    />
  );
}

export default function NewRequirementPage() {
  return (
    <Suspense fallback={<p className="text-slate-500">Loading wizard…</p>}>
      <NewRequirementContent />
    </Suspense>
  );
}
