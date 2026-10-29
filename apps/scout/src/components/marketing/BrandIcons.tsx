'use client';

import { useId } from 'react';

export function YouTubeMark({ className = 'h-10 w-10' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <rect width="40" height="40" rx="12" fill="#FF0000" />
      <path d="M16.5 13.5v13l12-6.5-12-6.5Z" fill="#fff" />
    </svg>
  );
}

export function InstagramMark({ className = 'h-10 w-10' }: { className?: string }) {
  const fill = `ig-${useId().replace(/:/g, '')}`;
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <defs>
        <linearGradient id={fill} x1="8" y1="36" x2="32" y2="4" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F58529" />
          <stop offset=".5" stopColor="#DD2A7B" />
          <stop offset="1" stopColor="#8134AF" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="12" fill={`url(#${fill})`} />
      <rect x="11" y="11" width="18" height="18" rx="6" fill="none" stroke="#fff" strokeWidth="2.2" />
      <circle cx="20" cy="20" r="5" fill="none" stroke="#fff" strokeWidth="2.2" />
      <circle cx="26.5" cy="14.2" r="1.4" fill="#fff" />
    </svg>
  );
}

export function FacebookMark({ className = 'h-10 w-10' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <rect width="40" height="40" rx="12" fill="#1877F2" />
      <path d="M22.4 31V21.6h3.1l.5-3.5h-3.6v-2.2c0-1 .3-1.7 1.8-1.7h1.9v-3.1c-.3 0-1.5-.1-2.8-.1-2.8 0-4.7 1.7-4.7 4.8v2.3h-3.1v3.5h3.1V31h3.8Z" fill="#fff" />
    </svg>
  );
}

export function MetaAdsMark({ className = 'h-10 w-10' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <rect width="40" height="40" rx="12" fill="#0081FB" />
      <path d="M10 26c2.6-6.4 5.2-10 8-10 1.8 0 3 1.4 4.8 5.4C24.4 25.6 25.8 28 28 28c2.4 0 4.4-3.2 6-8" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M12 26c1.4-4.8 3.4-8 6.2-8 2.6 0 3.8 2.6 5.8 8" fill="none" stroke="#66B3FF" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function WhatsAppMark({ className = 'h-10 w-10' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <rect width="40" height="40" rx="12" fill="#25D366" />
      <path d="M20 11.2c-4.9 0-8.8 3.9-8.8 8.8 0 1.5.4 3 1.1 4.3L11 29l4.8-1.3c1.2.7 2.6 1 4.2 1 4.9 0 8.8-3.9 8.8-8.8s-3.9-8.7-8.8-8.7Zm5 12.3c-.2.5-1.1 1-1.6 1.1-.4.1-.9.1-1.5-.1-.3-.1-.8-.3-1.4-.6-2.4-1.1-4-3.6-4.1-3.8-.1-.2-1-1.3-1-2.5s.6-1.8.9-2 .5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 1.9c.1.2.1.4 0 .6l-.4.6c-.1.2-.3.4-.1.6.1.3.6 1 1.3 1.6.9.8 1.6 1 1.9 1.1.2.1.4.1.6-.1l.9-1.2c.2-.2.4-.2.6-.1l2 .9c.2.1.4.2.4.4 0 .2 0 1.2-.5 1.7Z" fill="#fff" />
    </svg>
  );
}

export function LinkedInMark({ className = 'h-10 w-10' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <rect width="40" height="40" rx="12" fill="#0A66C2" />
      <path d="M13.2 16.8h3.5V27h-3.5V16.8ZM15 12.4a2 2 0 1 1 0 4 2 2 0 0 1 0-4ZM18.8 16.8h3.3v1.4h.1c.5-.9 1.6-1.8 3.3-1.8 3.5 0 4.1 2.3 4.1 5.3V27h-3.5v-4.6c0-1.1 0-2.5-1.5-2.5s-1.8 1.2-1.8 2.4V27h-3.5V16.8Z" fill="#fff" />
    </svg>
  );
}

export function TwitterMark({ className = 'h-10 w-10' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <rect width="40" height="40" rx="12" fill="#0F1419" />
      <path d="M22.6 18.4 31 9h-2l-7.3 8.2L15.7 9H9l9 12.8L9 31h2l7.8-8.8L24.3 31H31L22.6 18.4Zm-2.7 3.1-.9-1.3-7.2-10h3.1l5.8 8.1.9 1.3 7.5 10.5h-3.1l-6.1-8.6Z" fill="#fff" />
    </svg>
  );
}

export function PlatformLogo({ platform, className = 'h-8 w-8' }: { platform?: string | null; className?: string }) {
  const id = String(platform || 'youtube').toLowerCase();
  if (id === 'facebook') return <FacebookMark className={className} />;
  if (id === 'instagram') return <InstagramMark className={className} />;
  if (id === 'linkedin') return <LinkedInMark className={className} />;
  if (id === 'twitter' || id === 'x') return <TwitterMark className={className} />;
  if (id === 'google' || id === 'google_ads') return <GoogleAdsMark className={className} />;
  return <YouTubeMark className={className} />;
}

export function GoogleAdsMark({ className = 'h-10 w-10' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <rect width="40" height="40" rx="12" fill="#F8FAFC" />
      <path d="M20 11c4.9 0 8.9 3.3 9.8 8H24.4c-.7-1.8-2.4-3-4.4-3-2.7 0-4.9 2.2-4.9 5s2.2 5 4.9 5c2 0 3.7-1.2 4.4-3h5.4c-.9 4.7-4.9 8-9.8 8-5.5 0-10-4.5-10-10s4.5-10 10-10Z" fill="#4285F4" />
      <path d="M11.2 16.2 14.6 19c.7-2 2.5-3.5 4.6-3.8V11c-3.2.4-6 2.2-8 5.2Z" fill="#EA4335" />
      <path d="M20 29c2.6 0 5-1 6.8-2.6L23.4 23c-.9.6-2.1 1-3.4 1-2 0-3.7-1.1-4.5-2.8L11.4 24C13.2 27 16.4 29 20 29Z" fill="#34A853" />
      <path d="M29.8 19H20v4h5.6c-.3 1.2-1 2.2-2 2.9l4.4 3.3c2.6-2.4 3.8-6 3.8-10.2 0-.3 0-.7-.1-1Z" fill="#FBBC05" />
    </svg>
  );
}

const PLATFORM_MARKS = [
  { name: 'YouTube', blurb: 'Video research, trending content', Icon: YouTubeMark },
  { name: 'Instagram', blurb: 'Posts, reels, creator content', Icon: InstagramMark },
  { name: 'Facebook', blurb: 'Page analysis, public posts', Icon: FacebookMark },
  { name: 'Meta Ads', blurb: 'Ad library, creative analysis', Icon: MetaAdsMark },
  { name: 'WhatsApp', blurb: 'Business content and updates', Icon: WhatsAppMark },
  { name: 'LinkedIn', blurb: 'Company posts, thought leadership', Icon: LinkedInMark },
  { name: 'Google Ads', blurb: 'Ad creatives and keywords', Icon: GoogleAdsMark },
];

export function PlatformMarksGrid() {
  return (
    <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
      {PLATFORM_MARKS.map(({ name, blurb, Icon: Mark }) => (
        <div key={name} className="flex flex-col items-center rounded-[22px] bg-white px-3 py-6 text-center shadow-[0_14px_40px_rgba(15,23,42,0.06)] ring-1 ring-slate-100">
          <Mark className="h-12 w-12" />
          <p className="mt-3 text-[14px] font-bold text-slate-800">{name}</p>
          <p className="mt-1 text-[11px] leading-4 text-slate-500">{blurb}</p>
        </div>
      ))}
    </div>
  );
}
