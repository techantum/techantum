'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function TrialGuard({ pending, packageId }: { pending: boolean; packageId?: string | null }) {
  const path = usePathname() || '';
  useEffect(() => {
    if (!pending) return;
    if (path.startsWith('/logout')) return;
    const next = packageId ? `/trial?package=${encodeURIComponent(packageId)}` : '/trial';
    window.location.replace(next);
  }, [pending, path, packageId]);
  return null;
}
