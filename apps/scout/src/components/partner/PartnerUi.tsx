import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';

export const partnerBtnPrimary = 'btn-primary';

export const partnerBtnSecondary = 'btn-secondary';

export const partnerBtnGhost = 'btn-ghost';

export const partnerInput =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:bg-slate-50 disabled:text-slate-500';

export const partnerCard = 'rounded-2xl border border-slate-200 bg-white';

export const partnerTableHead = 'px-5 py-2 text-left text-xs font-medium text-slate-400';

export const partnerTableRow = 'border-t border-slate-50 hover:bg-slate-50/60';

export const STAT_TONES = {
  sky: { card: 'bg-sky-50', icon: 'text-sky-600' },
  rose: { card: 'bg-rose-50', icon: 'text-rose-500' },
  blue: { card: 'bg-blue-50', icon: 'text-blue-600' },
  amber: { card: 'bg-amber-50', icon: 'text-amber-600' },
  emerald: { card: 'bg-emerald-50', icon: 'text-emerald-600' },
  teal: { card: 'bg-teal-50', icon: 'text-teal-600' },
  violet: { card: 'bg-violet-50', icon: 'text-violet-600' },
} as const;

export type PartnerStatTone = keyof typeof STAT_TONES;

export function PartnerPageHero({
  title,
  action,
  backHref,
  backLabel = 'Back',
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  eyebrow?: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-r from-orange-50 via-amber-50 to-rose-50 px-6 py-6 sm:px-8">
      <div className="pointer-events-none absolute -right-16 top-0 h-48 w-64 rounded-full bg-white/50 blur-2xl" />
      <div className="pointer-events-none absolute right-24 -bottom-16 h-40 w-40 rounded-full bg-orange-100/80 blur-2xl" />
      <div className="relative flex items-center justify-between gap-3">
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
    </section>
  );
}

export function PartnerStatTile({
  label,
  value,
  icon,
  href,
  tone = 'sky',
}: {
  label: string;
  value: React.ReactNode;
  icon: string;
  href?: string;
  tone?: PartnerStatTone;
}) {
  const colors = STAT_TONES[tone];
  const content = (
    <>
      <Icon name={icon} size={22} className={colors.icon} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-medium text-slate-500">{label}</p>
        <p className="font-bricolage text-2xl font-bold leading-none text-slate-900">{value}</p>
      </div>
      {href ? <Icon name="ChevronRightIcon" size={16} className="text-slate-300" /> : null}
    </>
  );
  const className = `flex items-center gap-3 rounded-2xl ${colors.card} px-4 py-3.5 transition hover:brightness-[0.98]`;
  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }
  return <div className={className}>{content}</div>;
}

export function PartnerCard({
  children,
  className = '',
  title,
  action,
  padded = true,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  action?: React.ReactNode;
  padded?: boolean;
}) {
  return (
    <div className={`${partnerCard} overflow-hidden ${className}`}>
      {title ? (
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="font-semibold text-slate-900">{title}</h2>
          {action}
        </div>
      ) : null}
      <div className={padded ? (title ? 'px-5 pb-5' : 'p-5') : ''}>{children}</div>
    </div>
  );
}

export function PartnerEmpty({
  icon = 'InboxIcon',
  title,
  description,
  action,
}: {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={`${partnerCard} px-6 py-12 text-center`}>
      <Icon name={icon} size={40} className="mx-auto mb-3 text-slate-300" />
      <p className="font-medium text-slate-700">{title}</p>
      {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function PartnerAlert({
  variant = 'info',
  children,
}: {
  variant?: 'info' | 'success' | 'error' | 'warning';
  children: React.ReactNode;
}) {
  const styles = {
    info: 'border-sky-100 bg-sky-50 text-sky-800',
    success: 'border-emerald-100 bg-emerald-50 text-emerald-800',
    error: 'border-rose-100 bg-rose-50 text-rose-800',
    warning: 'border-amber-100 bg-amber-50 text-amber-800',
  };
  return <div className={`rounded-2xl border px-4 py-3 text-sm ${styles[variant]}`}>{children}</div>;
}

export function PartnerLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-xs font-semibold text-secondary hover:underline">
      {children}
    </Link>
  );
}
