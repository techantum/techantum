'use client';

import { useEffect, useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import {
  fetchOverlayBoxLabel,
  fetchOverlayEyebrow,
  fetchOverlayNote,
  fetchOverlaySteps,
  fetchOverlayTitle,
  platformCopy,
} from '@/lib/research/platforms';

function analysisSteps(copy: ReturnType<typeof platformCopy>) {
  return [
    'Reading titles, media and public counts',
    `Comparing ${copy.contentPlural} against your goal`,
    `Applying ${copy.label} packaging standards`,
    'Writing the next actions',
  ];
}

function reportSteps(copy: ReturnType<typeof platformCopy>) {
  return [
    `Collecting the selected public ${copy.content} fields`,
    'Laying out the comparison snapshot',
    'Writing the downloadable report',
    'Saving it to Reports',
  ];
}

const ORBIT = [
  { icon: 'PlayCircleIcon', tint: 'from-[#FF4D4D] to-[#FF0000]', delay: '0s', x: '-7.5rem', y: '-4.5rem' },
  { icon: 'SparklesIcon', tint: 'from-[#F59E0B] to-[#F97316]', delay: '0.4s', x: '7.2rem', y: '-5.2rem' },
  { icon: 'HeartIcon', tint: 'from-[#EC4899] to-[#F43F5E]', delay: '0.8s', x: '8.4rem', y: '1.6rem' },
  { icon: 'ChatBubbleLeftRightIcon', tint: 'from-[#38BDF8] to-[#2563EB]', delay: '1.2s', x: '-8.2rem', y: '1.2rem' },
  { icon: 'ChartBarIcon', tint: 'from-[#34D399] to-[#059669]', delay: '0.6s', x: '0.2rem', y: '-7.4rem' },
  { icon: 'HashtagIcon', tint: 'from-[#A78BFA] to-[#7C3AED]', delay: '1s', x: '-1.5rem', y: '6.4rem' },
];

const CARDS = [
  { title: 'Top performing cut', color: 'from-[#FF6B6B] to-[#FF8E53]', delay: '0s' },
  { title: 'Competitor short', color: 'from-[#4FACFE] to-[#00F2FE]', delay: '0.45s' },
  { title: 'How-to video', color: 'from-[#43E97B] to-[#38F9D7]', delay: '0.9s' },
  { title: 'Brand story', color: 'from-[#FA709A] to-[#FEE140]', delay: '1.35s' },
];

export default function FetchVideosOverlay({
  mode = 'fetch',
  title,
  platform,
}: {
  mode?: 'fetch' | 'analysis' | 'report';
  title?: string;
  platform?: string | null;
}) {
  const copy = platformCopy(platform);
  const analysis = mode === 'analysis';
  const report = mode === 'report';
  const steps = report ? reportSteps(copy) : analysis ? analysisSteps(copy) : fetchOverlaySteps(copy);
  const heading = title
    || (report ? 'Please wait while we generate the report' : analysis ? 'Please wait while we run the analysis' : fetchOverlayTitle(copy));
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setStep((current) => (current + 1) % steps.length), 1800);
    return () => window.clearInterval(timer);
  }, [steps.length]);

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center overflow-hidden bg-[#0B1020]/80 p-4 backdrop-blur-md" role="status" aria-live="polite" aria-label={heading}>
      <style>{`
        @keyframes fetch-float {
          0%, 100% { transform: translateY(0) rotate(-6deg); }
          50% { transform: translateY(-10px) rotate(6deg); }
        }
        @keyframes fetch-pop {
          0% { opacity: 0; transform: translate(-50%, 42px) scale(.7) rotate(-8deg); }
          18% { opacity: 1; }
          100% { opacity: 0; transform: translate(var(--fly-x), -168px) scale(1) rotate(8deg); }
        }
        @keyframes fetch-orbit {
          0%, 100% { transform: translate(var(--ox), var(--oy)) scale(1); }
          50% { transform: translate(var(--ox), calc(var(--oy) - 12px)) scale(1.08); }
        }
        @keyframes fetch-lid {
          0%, 100% { transform: rotate(-18deg) translateY(0); }
          50% { transform: rotate(-28deg) translateY(-6px); }
        }
        @keyframes fetch-glow {
          0%, 100% { opacity: .45; transform: scale(1); }
          50% { opacity: .9; transform: scale(1.08); }
        }
        @keyframes fetch-shimmer {
          0% { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-violet-500/25 blur-3xl" />
        <div className="absolute left-[20%] top-[18%] h-40 w-40 rounded-full bg-rose-500/20 blur-3xl" />
        <div className="absolute right-[16%] bottom-[18%] h-48 w-48 rounded-full bg-sky-400/20 blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg rounded-[32px] border border-white/15 bg-white/10 px-6 py-10 text-center shadow-[0_30px_80px_rgba(0,0,0,.35)] backdrop-blur-xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-200">{fetchOverlayEyebrow(copy)}</p>
        <h2 className="mt-2 font-bricolage text-3xl font-bold text-white">{heading}</h2>
        <p className="mt-2 text-sm text-slate-200">{steps[step]}</p>

        <div className="relative mx-auto mt-8 h-64 w-72">
          <div className="absolute left-1/2 top-8 h-40 w-40 -translate-x-1/2 rounded-full bg-gradient-to-r from-violet-400 via-fuchsia-400 to-amber-300 blur-2xl" style={{ animation: 'fetch-glow 2.4s ease-in-out infinite' }} />

          {ORBIT.map((item) => (
            <span
              key={item.icon}
              className={`absolute left-1/2 top-1/2 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${item.tint} text-white shadow-lg`}
              style={{ animation: `fetch-orbit 2.6s ease-in-out infinite`, animationDelay: item.delay, ['--ox' as string]: item.x, ['--oy' as string]: item.y }}
            >
              <Icon name={item.icon} size={20} />
            </span>
          ))}

          {CARDS.map((card, index) => (
            <article
              key={card.title}
              className={`absolute left-1/2 top-[7.5rem] w-28 overflow-hidden rounded-xl bg-gradient-to-br ${card.color} p-2 text-left shadow-xl`}
              style={{ animation: 'fetch-pop 2.4s ease-in infinite', animationDelay: card.delay, ['--fly-x' as string]: `${index % 2 ? 48 : -56}px` }}
            >
              <span className="mb-1 flex h-10 items-center justify-center rounded-lg bg-black/20 text-white">
                <Icon name="PlayIcon" size={16} />
              </span>
              <span className="block truncate text-[10px] font-semibold text-white">{card.title}</span>
            </article>
          ))}

          <div className="absolute bottom-2 left-1/2 w-40 -translate-x-1/2">
            <div
              className="absolute -top-5 left-2 h-6 w-36 origin-bottom-left rounded-md bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 shadow-md"
              style={{ animation: 'fetch-lid 1.6s ease-in-out infinite' }}
            />
            <div className="relative h-24 overflow-hidden rounded-2xl bg-gradient-to-br from-[#7C3AED] via-[#DB2777] to-[#F59E0B] shadow-[0_18px_40px_rgba(124,58,237,.45)]">
              <div className="absolute inset-x-0 top-0 h-2 bg-white/30" />
              <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent,rgba(255,255,255,.35),transparent)] bg-[length:200%_100%]" style={{ animation: 'fetch-shimmer 1.4s linear infinite' }} />
              <div className="absolute inset-x-6 top-8 flex justify-center gap-1.5">
                {['#fff', '#FDE68A', '#A5F3FC', '#F9A8D4'].map((color) => (
                  <span key={color} className="h-7 w-5 rounded-md shadow-sm" style={{ background: color, animation: 'fetch-float 1.5s ease-in-out infinite' }} />
                ))}
              </div>
              <p className="absolute inset-x-0 bottom-2 text-center text-[10px] font-bold tracking-wide text-white">{report ? 'REPORT' : analysis ? 'ANALYSIS' : fetchOverlayBoxLabel(copy)}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-center gap-1.5">
          {steps.map((label, index) => (
            <span key={label} className={`h-1.5 rounded-full transition-all ${index === step ? 'w-6 bg-white' : 'w-1.5 bg-white/30'}`} />
          ))}
        </div>
        <p className="mt-4 text-xs text-slate-300">{report ? `This can take a moment for a multi-${copy.content} snapshot.` : analysis ? 'This can take a minute for a thorough comparison.' : fetchOverlayNote(copy)}</p>
      </div>
    </div>
  );
}
