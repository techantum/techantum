'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function InboxDetailRedirect() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  useEffect(() => {
    router.replace('/inbox');
  }, [id, router]);

  return <p className="text-slate-500">Opening inbox…</p>;
}
