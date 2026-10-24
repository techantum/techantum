'use client';

import { Suspense } from 'react';
import AiAnalysisWizard from '@/components/admin/youtube/AiAnalysisWizard';
import PageLoader from '@/components/admin/youtube/PageLoader';
import { ProjectRequired } from '@/components/admin/youtube/YoutubeFrame';

export default function Page() {
  return (
    <ProjectRequired>
      <Suspense fallback={<PageLoader label="Loading AI analysis…" />}>
        <AiAnalysisWizard />
      </Suspense>
    </ProjectRequired>
  );
}
