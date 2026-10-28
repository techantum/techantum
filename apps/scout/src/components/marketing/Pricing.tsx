'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import { GHOST, H2, SHELL } from './layout';
import { formatInr } from '@/lib/saas/money';

export type PublicPackage = {
  id: string;
  name: string;
  price_monthly: number;
  price_yearly: number | null;
  highlight: boolean;
  short_description?: string;
  description_html: string;
  features: { name: string; description: string }[];
};

function Check({ children, onDark = false }: { children: string; onDark?: boolean }) {
  return (
    <li className={`flex items-center gap-2.5 text-[13.5px] ${onDark ? 'text-white' : 'text-slate-600'}`}>
      <span className={`inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full ${onDark ? 'bg-white/20 text-white' : 'bg-violet-100 text-violet-600'}`}>
        <Icon name="CheckIcon" size={11} />
      </span>
      {children}
    </li>
  );
}

export default function Pricing({ packages = [], signedIn = false }: { packages?: PublicPackage[]; signedIn?: boolean }) {
  const [yearly, setYearly] = useState(false);

  const cards = useMemo(() => packages.slice(0, 3), [packages]);

  return (
    <section id="pricing" className={`${SHELL} pb-24`}>
      <p className="flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-500">
        <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
        Simple, transparent pricing
      </p>
      <h2 className={`${H2} mx-auto mt-3 max-w-xl text-center`}>A plan for every stage of your growth.</h2>
      <div className="mt-6 flex items-center justify-center gap-3 text-sm font-medium text-slate-500">
        <button type="button" onClick={() => setYearly(false)} className={!yearly ? 'text-slate-900' : ''}>Monthly</button>
        <button type="button" onClick={() => setYearly(true)} className={yearly ? 'text-slate-900' : ''}>Yearly</button>
        <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700">{yearly ? 'Billed yearly · ₹' : 'Billed monthly · ₹'}</span>
      </div>
      <div className="mt-12 grid items-stretch gap-6 md:grid-cols-3">
        {cards.map((item) => {
          const onDark = item.highlight;
          const amount = yearly && item.price_yearly ? item.price_yearly : item.price_monthly;
          const cycle = yearly && item.price_yearly ? 'yearly' : 'monthly';
          return (
            <article
              key={item.id}
              className={`relative flex flex-col rounded-[28px] p-8 ${
                onDark
                  ? 'bg-gradient-to-b from-[#E879F9] to-[#6D28D9] text-white shadow-[0_28px_60px_rgba(168,85,247,0.45)] md:-translate-y-4 md:py-10'
                  : 'bg-white shadow-[0_16px_50px_rgba(15,23,42,0.06)] ring-1 ring-slate-100'
              }`}
            >
              {onDark ? (
                <span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#6D28D9] px-3 py-1 text-[11px] font-semibold text-white shadow">
                  Most popular
                </span>
              ) : null}
              <p className={`text-sm font-medium ${onDark ? 'text-white/80' : 'text-slate-500'}`}>{item.name}</p>
              <p className="mt-5 font-bricolage text-[48px] font-bold leading-none">
                {formatInr(amount)}
                <span className={`text-base font-medium ${onDark ? 'text-white/70' : 'text-slate-400'}`}>{cycle === 'yearly' ? '/year' : '/month'}</span>
              </p>
              {item.short_description ? (
                <p className={`mt-3 text-sm ${onDark ? 'text-white/75' : 'text-slate-500'}`}>{item.short_description}</p>
              ) : null}
              <ul className="mt-8 flex-1 space-y-3">
                {item.features.map((feature) => (
                  <Check key={feature.name} onDark={onDark}>{feature.name}</Check>
                ))}
              </ul>
              <Link
                href={signedIn ? `/trial?package=${item.id}` : `/signup?package=${item.id}`}
                className={onDark ? 'mt-8 inline-flex h-11 w-full items-center justify-center rounded-full bg-white text-sm font-semibold text-violet-700' : `${GHOST} mt-8 w-full rounded-full`}
              >
                {onDark ? 'Start 14-day trial' : 'Start 14-day trial'}
              </Link>
              <p className={`mt-2 text-center text-[11px] ${onDark ? 'text-white/70' : 'text-slate-400'}`}>Autopay required</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
