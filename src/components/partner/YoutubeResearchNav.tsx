'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { youtubePageBase } from '@/components/admin/youtube/YoutubeFrame';

export function youtubeChildNavClass(active: boolean) {
  return `side-nav-item block rounded-md px-3 py-1.5 text-[13px] leading-snug ${
    active
      ? 'border-l-2 border-secondary bg-transparent font-semibold text-secondary'
      : 'border-l-2 border-transparent text-slate-500 hover:bg-white/80 hover:text-secondary'
  }`;
}

export default function YoutubeResearchNav() {
  const pathname = usePathname() || '';
  const base = youtubePageBase(pathname);
  const onDashboard = pathname === base || pathname === `${base}/`;
  const onSettings = pathname.startsWith(`${base}/settings`);
  const onProjects = !onDashboard && !onSettings && pathname.startsWith(base);

  return (
    <div className="mt-1 space-y-0.5">
      <Link href={base} className={youtubeChildNavClass(onDashboard)}>
        Dashboard
      </Link>
      <Link href={`${base}/projects`} className={youtubeChildNavClass(onProjects)}>
        Projects
      </Link>
    </div>
  );
}
