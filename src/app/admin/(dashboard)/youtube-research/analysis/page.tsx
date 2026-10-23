'use client';

import AiAnalysisWizard from '@/components/admin/youtube/AiAnalysisWizard';
import { ProjectRequired } from '@/components/admin/youtube/YoutubeFrame';

export default function Page() {
  return (
    <ProjectRequired>
      <AiAnalysisWizard />
    </ProjectRequired>
  );
}
