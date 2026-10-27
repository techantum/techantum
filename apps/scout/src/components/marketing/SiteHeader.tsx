'use client';

import Link from 'next/link';
import { useState } from 'react';
import { SHELL } from './layout';
import type { RevealeoBranding } from '@/lib/cms/defaults';
import SafeImage from '@/components/ui/SafeImage';

const LINKS = [
  { href: '/#product', label: 'Product' },
  { href: '/#features', label: 'Features' },
  { href: '/#solutions', label: 'Solutions' },
  { href: '/#faq', label: 'Resources' },
  { href: '/#pricing', label: 'Pricing' },
];

export default function SiteHeader({ solid = false, branding }: { solid?: boolean; branding?: RevealeoBranding | null }) {
  const [open, setOpen] = useState(false);
  return (
    <>
    <header className={`fixed inset-x-0 top-0 z-50 bg-white/95 shadow-sm backdrop-blur ${solid ? 'border-b border-slate-100' : 'border-b border-slate-100/80'}`}>
      <div className={`${SHELL} flex h-20 items-center justify-between`}>
        <Link href="/" className="flex shrink-0 items-center font-bricolage text-[22px] font-bold tracking-tight text-slate-900">
          {branding?.logo_url ? (
            <SafeImage
              src={branding.logo_url}
              alt={branding.company_name || 'revealeo'}
              className="h-12 w-auto max-w-[220px] object-contain object-left sm:h-14 sm:max-w-[260px]"
              fallback={branding?.company_name || 'revealeo'}
            />
          ) : (
            branding?.company_name || 'revealeo'
          )}
        </Link>
        <nav className="hidden items-center gap-8 text-[13.5px] font-medium text-slate-500 lg:flex">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-slate-900">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2.5 lg:flex">
          <Link
            href="/login"
            className="inline-flex h-10 items-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:border-slate-300"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="inline-flex h-10 items-center rounded-full bg-[#6D28D9] px-4 text-sm font-semibold text-white hover:bg-[#5B21B6]"
          >
            Start free trial
          </Link>
        </div>
        <button type="button" className="text-sm font-semibold text-slate-700 lg:hidden" onClick={() => setOpen(!open)}>
          Menu
        </button>
      </div>
      {open ? (
        <div className="border-t border-slate-100 bg-white py-4 lg:hidden">
          <div className={`${SHELL} flex flex-col gap-3 text-sm font-medium text-slate-700`}>
            {LINKS.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>
                {link.label}
              </Link>
            ))}
            <Link href="/login" onClick={() => setOpen(false)}>
              Sign in
            </Link>
            <Link href="/signup" className="rounded-full bg-[#6D28D9] px-4 py-2 text-center font-semibold text-white" onClick={() => setOpen(false)}>
              Start free trial
            </Link>
          </div>
        </div>
      ) : null}
    </header>
    <div className="h-20" aria-hidden />
    </>
  );
}
