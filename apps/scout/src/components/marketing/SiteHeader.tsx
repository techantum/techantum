'use client';

import Link from 'next/link';
import { useState } from 'react';
import { SHELL } from './layout';
import type { RevealeoBranding } from '@/lib/cms/defaults';
import SafeImage from '@/components/ui/SafeImage';
import NavIcon from '@/components/ui/NavIcon';

const LINKS = [
  { href: '/#product', label: 'Product', icon: 'SparklesIcon', key: 'product' },
  { href: '/#features', label: 'Features', icon: 'Squares2X2Icon', key: 'features' },
  { href: '/#solutions', label: 'Solutions', icon: 'LightBulbIcon', key: 'solutions' },
  { href: '/#faq', label: 'Resources', icon: 'BookOpenIcon', key: 'resources' },
  { href: '/#pricing', label: 'Pricing', icon: 'CreditCardIcon', key: 'pricing' },
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
              priority
            />
          ) : (
            branding?.company_name || 'revealeo'
          )}
        </Link>
        <nav className="hidden items-center gap-6 text-[13.5px] font-medium text-slate-500 lg:flex">
          {LINKS.map((link, index) => (
            <Link key={link.href} href={link.href} className="inline-flex items-center gap-1.5 hover:text-slate-900">
              <NavIcon name={link.icon} itemKey={link.key} delay={index * 120} className="h-7 w-7 rounded-lg" size={14} />
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
        <button type="button" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 lg:hidden" onClick={() => setOpen(!open)}>
          <NavIcon name={open ? 'XMarkIcon' : 'Bars3Icon'} itemKey="product" className="h-8 w-8 rounded-xl" size={16} />
          Menu
        </button>
      </div>
      {open ? (
        <div className="border-t border-slate-100 bg-white py-4 lg:hidden">
          <div className={`${SHELL} flex flex-col gap-3 text-sm font-medium text-slate-700`}>
            {LINKS.map((link, index) => (
              <Link key={link.href} href={link.href} className="inline-flex items-center gap-2" onClick={() => setOpen(false)}>
                <NavIcon name={link.icon} itemKey={link.key} delay={index * 120} className="h-7 w-7 rounded-lg" size={14} />
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
