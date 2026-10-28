import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  kicker?: string;
  backHref?: string;
  backLabel?: string;
}

export default function AdminPageHeader({
  title,
  action,
  backHref,
  backLabel = 'Back',
}: AdminPageHeaderProps) {
  return (
    <div className="flex w-full items-center justify-between gap-3">
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
