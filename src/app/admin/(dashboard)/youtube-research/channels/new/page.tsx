'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function NewChannelPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin/youtube-research/channels');
  }, [router]);
  return <p className="text-sm text-slate-500">Opening project channels...</p>;
}
