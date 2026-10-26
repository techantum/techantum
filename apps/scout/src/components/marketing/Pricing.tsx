'use client';

import Link from 'next/link';
import { useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import { GHOST, H2 } from './layout';

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

export default function Pricing() {
  const [yearly, setYearly] = useState(false);
  const starter = yearly ? 23 : 29;
  const growth = yearly ? 79 : 99;
  const scale = yearly ? 199 : 249;

  return (
    <section id="pricing" className="mx-auto w-full max-w-[1180px] px-5 pb-24 sm:px-6">
      <p className="flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-500">
        <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
        Simple, transparent pricing
      </p>
      <h2 className={`${H2} mx-auto mt-3 max-w-xl text-center`}>A plan for every stage of your growth.</h2>
      <div className="mt-6 flex items-center justify-center gap-3 text-sm font-medium text-slate-500">
        <button type="button" onClick={() => setYearly(false)} className={!yearly ? 'text-slate-900' : ''}>
          Monthly
        </button>
        <button type="button" onClick={() => setYearly(true)} className={yearly ? 'text-slate-900' : ''}>
          Yearly
        </button>
        <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700">Save 20%</span>
      </div>
      <div className="mt-12 grid items-stretch gap-6 md:grid-cols-3">
        <article className="flex flex-col rounded-[28px] bg-white p-8 shadow-[0_16px_50px_rgba(15,23,42,0.06)] ring-1 ring-slate-100">
          <p className="text-sm font-medium text-slate-500">Starter</p>
          <p className="mt-5 font-bricolage text-[48px] font-bold leading-none">
            ₹{starter}
            <span className="text-base font-medium text-slate-400">/month</span>
          </p>
          <p className="mt-3 text-sm text-slate-500">Perfect for individuals</p>
          <ul className="mt-8 flex-1 space-y-3">
            <Check>5 projects</Check>
            <Check>1,000 videos/month</Check>
            <Check>CSV / Excel export</Check>
            <Check>Email support</Check>
          </ul>
          <Link href="/signup" className={`${GHOST} mt-8 w-full rounded-full`}>
            Get started
          </Link>
        </article>
        <article className="relative flex flex-col rounded-[28px] bg-gradient-to-b from-[#E879F9] to-[#6D28D9] p-8 text-white shadow-[0_28px_60px_rgba(168,85,247,0.45)] md:-translate-y-4 md:py-10">
          <span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#6D28D9] px-3 py-1 text-[11px] font-semibold text-white shadow">
            Most popular
          </span>
          <p className="text-sm font-medium text-white/80">Growth</p>
          <p className="mt-5 font-bricolage text-[48px] font-bold leading-none">
            ₹{growth}
            <span className="text-base font-medium text-white/70">/month</span>
          </p>
          <p className="mt-3 text-sm text-white/80">For growing marketing teams</p>
          <ul className="mt-8 flex-1 space-y-3">
            <Check onDark>25 projects</Check>
            <Check onDark>10,000 videos/month</Check>
            <Check onDark>YouTube research & reports</Check>
            <Check onDark>2,000 leads / month</Check>
          </ul>
          <Link href="/signup" className="mt-8 inline-flex h-11 w-full items-center justify-center rounded-full bg-white text-sm font-semibold text-violet-700">
            Start free trial
          </Link>
        </article>
        <article className="flex flex-col rounded-[28px] bg-white p-8 shadow-[0_16px_50px_rgba(15,23,42,0.06)] ring-1 ring-slate-100">
          <p className="text-sm font-medium text-slate-500">Scale</p>
          <p className="mt-5 font-bricolage text-[48px] font-bold leading-none">
            ₹{scale}
            <span className="text-base font-medium text-slate-400">/month</span>
          </p>
          <p className="mt-3 text-sm text-slate-500">For agencies & enterprises</p>
          <ul className="mt-8 flex-1 space-y-3">
            <Check>Unlimited projects</Check>
            <Check>50,000 videos/month</Check>
            <Check>10,000 leads / month</Check>
            <Check>20 seats · priority support</Check>
          </ul>
          <Link href="/signup" className={`${GHOST} mt-8 w-full`}>
            Start free trial
          </Link>
        </article>
      </div>
    </section>
  );
}
