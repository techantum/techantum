'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ChannelManagementBoard from '@/components/admin/youtube/ChannelManagementBoard';
import PageLoader from '@/components/admin/youtube/PageLoader';
import { ProjectRequired, useYoutubePageBase } from '@/components/admin/youtube/YoutubeFrame';

function Channels() {
  const base = useYoutubePageBase();
  const search = useSearchParams();
  const from = search?.get('from') || 'research';
  const add = search?.get('add') === 'own' || search?.get('add') === 'competitor' ? search.get('add') as 'own' | 'competitor' : '';
  const backHref = from === 'analysis' ? `${base}/channel-compare` : `${base}/videos`;
  return <ChannelManagementBoard backHref={backHref} initialAdding={add} />;
}

export default function ChannelsPage() {
  return (
    <ProjectRequired>
      <Suspense fallback={<PageLoader label="Loading channels…" />}>
        <Channels />
      </Suspense>
    </ProjectRequired>
  );
}
