'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function HeaderAuthLink({ compact = false }: { compact?: boolean }) {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setSignedIn(Boolean(data.user)));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session?.user));
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (signedIn) {
    return (
      <Link href="/portal/wa" className={`btn-secondary ${compact ? 'inline-block' : ''}`}>
        My Dashboard
      </Link>
    );
  }

  return (
    <Link href="/login" className={`btn-secondary ${compact ? 'inline-block' : ''}`}>
      Sign in
    </Link>
  );
}
