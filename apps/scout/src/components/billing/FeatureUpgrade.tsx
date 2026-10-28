import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';
import { formatInr } from '@/lib/saas/money';

export default function FeatureUpgrade({
  name,
  plans,
}: {
  name: string;
  plans: { name: string; price_monthly: number }[];
}) {
  const plan = plans[0];
  const names = plans.map((item) => item.name);
  return (
    <div className="mx-auto flex min-h-[68vh] w-full max-w-lg items-center">
      <section className="relative w-full overflow-hidden rounded-[28px] border border-violet-100 bg-white px-8 py-10 text-center shadow-[0_24px_70px_-36px_rgba(124,58,237,0.55)] animate-[upgrade-in_0.45s_ease-out]">
        <span className="pointer-events-none absolute -left-10 top-8 h-28 w-28 rounded-full bg-fuchsia-300/50 blur-2xl animate-[create-float_5.5s_ease-in-out_infinite]" />
        <span className="pointer-events-none absolute -right-8 bottom-6 h-32 w-32 rounded-full bg-sky-300/50 blur-2xl animate-[create-float_6.4s_ease-in-out_infinite]" />
        <span className="pointer-events-none absolute right-12 top-10 h-2.5 w-2.5 rounded-full bg-amber-300 animate-[create-float_3.4s_ease-in-out_infinite]" />
        <span className="pointer-events-none absolute left-14 top-16 h-2 w-2 rounded-full bg-violet-300 animate-[create-float_4.8s_ease-in-out_infinite]" />
        <div className="relative">
          <span className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-orange-300 text-white shadow-lg shadow-violet-200 animate-[create-float_4.2s_ease-in-out_infinite]">
            <Icon name="SparklesIcon" size={28} />
          </span>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-violet-500">{name}</p>
          <h1 className="mt-2 font-bricolage text-3xl font-bold text-slate-900">Upgrade to use this feature</h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-500">
            {names.length
              ? `${name} is included with ${names.join(' and ')}. It is not part of your current plan.`
              : `${name} is not included in your current plan.`}
          </p>
          {plan ? <p className="mt-4 text-sm font-semibold text-violet-700">From {formatInr(plan.price_monthly)} / month</p> : null}
          <Link href="/billing" className="btn-primary mt-6">View plans</Link>
        </div>
      </section>
    </div>
  );
}
