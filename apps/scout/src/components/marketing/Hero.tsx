import EmailCapture from './EmailCapture';
import { SHELL } from './layout';

const AVATARS = ['/marketing/avatar-1.jpg', '/marketing/avatar-2.jpg', '/marketing/avatar-3.jpg', '/marketing/avatar-4.jpg'];

function Stars() {
  return (
    <span className="flex text-[#F5B301]" aria-label="5 stars">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor">
          <path d="M10 1.8 12.4 7l5.6.8-4 3.9.9 5.6L10 14.7 4.9 17.3l.9-5.6-4-3.9L7.6 7 10 1.8Z" />
        </svg>
      ))}
    </span>
  );
}

export default function Hero() {
  return (
    <div className="relative overflow-hidden bg-white">
      <div className="pointer-events-none absolute -right-32 -top-40 h-[34rem] w-[34rem] rounded-full bg-[#EBD7FF]" />
      <div className="pointer-events-none absolute right-24 top-28 h-72 w-72 rounded-full bg-[#F7D6FF] blur-2xl" />
      <div className="pointer-events-none absolute bottom-0 right-[28%] h-48 w-72 rounded-[100%] bg-[#E9D5FF] blur-xl" />
      <section className={`${SHELL} relative grid items-center gap-10 pb-16 pt-8 lg:grid-cols-[0.92fr_1.08fr] lg:gap-8 lg:pb-20 lg:pt-6`}>
        <div className="max-w-[520px]">
          <h1 className="font-bricolage text-[2.75rem] font-bold leading-[1.05] tracking-tight text-slate-900 sm:text-[3.6rem]">
            Uncover your competitors’
            <span className="block text-[#D946EF]">marketing secrets</span>
          </h1>
          <p className="mt-5 max-w-[26rem] text-[15px] leading-7 text-slate-500">
            Turn public data from YouTube, Instagram, Facebook, Ads and more into actionable insights. See what works, then recreate winning content, faster.
          </p>
          <div className="mt-8">
            <EmailCapture />
          </div>
          <div className="mt-5 flex items-center gap-3">
            <div className="flex -space-x-2">
              {AVATARS.map((src) => (
                <img key={src} src={src} alt="" className="h-8 w-8 rounded-full object-cover ring-2 ring-white" />
              ))}
            </div>
            <Stars />
            <p className="text-[12px] text-slate-500">Loved by research teams</p>
          </div>
        </div>
        <img
          src="/marketing/hero-dashboard.jpg"
          alt="Revealeo workspace preview"
          className="w-full rounded-[24px] object-cover shadow-[0_40px_90px_rgba(91,33,182,0.18)] ring-1 ring-white/80"
        />
      </section>
    </div>
  );
}
