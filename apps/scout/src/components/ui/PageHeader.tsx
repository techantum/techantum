import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';
import type { ReactNode } from 'react';

export default function PageHeader({
  title,
  backHref,
  backLabel = 'Back',
  action,
}: {
  title: ReactNode;
  backHref?: string;
  backLabel?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h1 className="min-w-0 font-bricolage text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
      {action || backHref ? (
        <div className="flex shrink-0 items-center gap-2">
          {action}
          {backHref ? (
            <Link href={backHref} className="btn-secondary">
              <Icon name="ArrowLeftIcon" size={16} /> {backLabel}
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
