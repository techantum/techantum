'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function PerformanceRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin/youtube-research/videos');
  }, [router]);
  return <p className="text-sm text-slate-500">Opening Videos...</p>;
}
