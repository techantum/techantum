'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PageLoader from '@/components/admin/youtube/PageLoader';
import { useYoutubePageBase } from '@/components/admin/youtube/YoutubeFrame';

function RedirectToAnalysis() {
  const router = useRouter();
  const base = useYoutubePageBase();
  const search = useSearchParams();
  const id = search?.get('id') || '';
  useEffect(() => {
    router.replace(id ? `${base}/channel-compare?id=${id}` : `${base}/channel-compare`);
  }, [base, id, router]);
  return <PageLoader label="Opening analysis…" />;
}

export default function Page() {
  return (
    <Suspense fallback={<PageLoader label="Opening analysis…" />}>
      <RedirectToAnalysis />
    </Suspense>
  );
}
