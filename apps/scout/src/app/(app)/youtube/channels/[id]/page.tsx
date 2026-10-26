'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageLoader from '@/components/admin/youtube/PageLoader';
import { useYoutubePageBase } from '@/components/admin/youtube/YoutubeFrame';

export default function ChannelDetailRedirect() {
  const router = useRouter();
  const base = useYoutubePageBase();
  useEffect(() => {
    router.replace(`${base}/channels?from=research`);
  }, [base, router]);
  return <PageLoader label="Opening channel management…" />;
}
