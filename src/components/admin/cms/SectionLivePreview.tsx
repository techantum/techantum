'use client';

import Link from 'next/link';
import CmsRichText from '@/components/cms/CmsRichText';
import SafeImage from '@/components/ui/SafeImage';

export default function SectionLivePreview({
  title,
  description,
  primaryCta,
  primaryHref,
  secondaryCta,
  secondaryHref,
  image,
  companyName,
}: {
  title: string;
  description: string;
  primaryCta?: string;
  primaryHref?: string;
  secondaryCta?: string;
  secondaryHref?: string;
  image?: string;
  companyName?: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <p className="text-sm font-semibold text-slate-800">Live Preview</p>
        <div className="flex gap-2 text-slate-400">
          <span className="rounded-md border border-slate-200 px-2 py-1 text-[10px]">Desktop</span>
        </div>
      </div>
      <div className="bg-slate-50 p-3">
        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-bold text-slate-900">{companyName || 'Site'}</p>
            <div className="hidden gap-3 text-[11px] text-slate-500 sm:flex">
              <span>Home</span>
              <span>About</span>
              <span>Services</span>
            </div>
            <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-semibold text-white">Get Started</span>
          </div>
          <div className="grid gap-4 p-4 lg:grid-cols-2 lg:items-center">
            <div>
              <h3 className="font-bricolage text-2xl font-bold leading-tight text-slate-900">{title || 'Section title'}</h3>
              <div className="mt-2 text-sm text-slate-600">
                {description ? <CmsRichText html={description} /> : <p>Section description appears here.</p>}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {primaryCta ? (
                  <Link href={primaryHref || '#'} className="rounded-md bg-secondary px-3 py-2 text-xs font-semibold text-white">
                    {primaryCta}
                  </Link>
                ) : null}
                {secondaryCta ? (
                  <Link href={secondaryHref || '#'} className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">
                    {secondaryCta}
                  </Link>
                ) : null}
              </div>
            </div>
            <div className="overflow-hidden rounded-xl bg-slate-100">
              {image ? (
                <SafeImage src={image} alt="" className="h-44 w-full object-cover" fallback={<div className="flex h-44 items-center justify-center text-xs text-slate-400">Hero image</div>} />
              ) : (
                <div className="flex h-44 items-center justify-center text-xs text-slate-400">Hero image</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
