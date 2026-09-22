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
      <Link
        href="/portal/wa"
        className={
          compact
            ? 'border border-secondary text-secondary px-6 py-2.5 rounded-full font-inter font-medium text-sm hover:bg-secondary hover:text-secondary-foreground transition-colors inline-block'
            : 'border border-secondary text-secondary px-5 py-2.5 rounded-full font-inter font-medium text-sm hover:bg-secondary hover:text-secondary-foreground transition-colors'
        }
      >
        Workspace
      </Link>
    );
  }

  return (
    <Link
      href="/login"
      className={
        compact
          ? 'border border-secondary text-secondary px-6 py-2.5 rounded-full font-inter font-medium text-sm hover:bg-secondary hover:text-secondary-foreground transition-colors inline-block'
          : 'border border-secondary text-secondary px-5 py-2.5 rounded-full font-inter font-medium text-sm hover:bg-secondary hover:text-secondary-foreground transition-colors'
      }
    >
      Sign in
    </Link>
  );
}
