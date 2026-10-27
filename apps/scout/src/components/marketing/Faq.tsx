'use client';

import { useState } from 'react';

export default function Faq({ items = [] }: { items?: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="overflow-hidden rounded-[22px] bg-white shadow-[0_16px_40px_rgba(15,23,42,0.05)] ring-1 ring-slate-100">
      {items.map((item, index) => {
        const active = open === index;
        return (
          <button
            key={item.q}
            type="button"
            onClick={() => setOpen(active ? null : index)}
            className="flex w-full items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 text-left last:border-b-0"
          >
            <span className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-violet-300" />
              <span>
                <span className="block text-[14px] font-medium text-slate-800">{item.q}</span>
                {active ? <span className="mt-2 block text-sm leading-6 text-slate-500">{item.a}</span> : null}
              </span>
            </span>
            <span className="mt-0.5 text-lg font-light leading-none text-slate-400">{active ? '–' : '+'}</span>
          </button>
        );
      })}
    </div>
  );
}
