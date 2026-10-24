'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import PageLoader from '@/components/admin/youtube/PageLoader';
import { useYoutubePageBase } from '@/components/admin/youtube/YoutubeFrame';

export default function PerformanceRedirect() {
  const router = useRouter();
  const base = useYoutubePageBase();
  useEffect(() => {
    router.replace(`${base}/videos`);
  }, [router, base]);
  return <PageLoader label="Opening videos…" />;
}
