'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function WhatsAppChatRedirect() {
  const id = String(useParams()?.id || '');
  const router = useRouter();
  useEffect(() => {
    router.replace(id ? `/admin/whatsapp/inbox?id=${id}` : '/admin/whatsapp/leads');
  }, [id, router]);
  return <p className="p-4 text-sm text-slate-500">Opening conversation…</p>;
}
