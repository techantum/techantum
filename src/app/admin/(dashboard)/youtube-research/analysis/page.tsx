'use client';

import { Suspense } from 'react';
import AiAnalysisWizard from '@/components/admin/youtube/AiAnalysisWizard';
import { ProjectRequired } from '@/components/admin/youtube/YoutubeFrame';

export default function Page() {
  return (
    <ProjectRequired>
      <Suspense fallback={<p className="text-sm text-slate-500">Loading analysis...</p>}>
        <AiAnalysisWizard />
      </Suspense>
    </ProjectRequired>
  );
}
