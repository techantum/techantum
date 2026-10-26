'use client';

import { useState } from 'react';

const ITEMS = [
  {
    q: 'What platforms are supported?',
    a: 'The live workspace covers YouTube competitor research and Google Places lead discovery. Marks for Instagram, Facebook, Ads, WhatsApp, and LinkedIn on this page show the research workflow — they are not live data connectors yet.',
  },
  {
    q: 'Is the data really from public sources?',
    a: 'Yes. YouTube numbers come from the public Data API only — views, likes, comments, duration, titles, thumbnails, and publish dates. Lead lists come from Google Places. Watch time, retention, and demographics are not shown as facts.',
  },
  {
    q: 'Can I export and share reports?',
    a: 'Yes. Saved comparisons stay on your workspace. Lead runs download as CSV or Excel. Share access through workspace seats on Growth and Scale.',
  },
  {
    q: 'Do I need technical knowledge to use Revealeo?',
    a: 'No. You add public channel URLs or Places searches, then compare and export from the workspace. Optional AI notes use configured prompts — no API setup is required for the trial.',
  },
  {
    q: 'Can I upgrade or downgrade my plan later?',
    a: 'Yes. New workspaces start on a 14-day Growth trial with no card required. Change plans from Billing at any time.',
  },
];

export default function Faq() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="overflow-hidden rounded-[22px] bg-white shadow-[0_16px_40px_rgba(15,23,42,0.05)] ring-1 ring-slate-100">
      {ITEMS.map((item, index) => {
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
