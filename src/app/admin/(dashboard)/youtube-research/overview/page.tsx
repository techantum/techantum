'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useYoutubePageBase } from '@/components/admin/youtube/YoutubeFrame';

export default function OverviewRedirect() {
  const router = useRouter();
  const base = useYoutubePageBase();
  useEffect(() => {
    router.replace(`${base}/channels`);
  }, [base, router]);
  return <p className="text-sm text-slate-500">Opening project channels...</p>;
}
