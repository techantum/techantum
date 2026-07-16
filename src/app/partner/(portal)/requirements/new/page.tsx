'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import RequirementWizard from '@/components/partner/RequirementWizard';

function NewRequirementContent() {
  const searchParams = useSearchParams();
  return (
    <RequirementWizard
      initialCategoryId={searchParams?.get('category') ?? undefined}
      initialPackageId={searchParams?.get('package') ?? undefined}
      initialRequirementId={searchParams?.get('draft') ?? undefined}
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
