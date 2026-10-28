import Link from 'next/link';
import { SHELL } from './layout';
import type { RevealeoBranding } from '@/lib/cms/defaults';
import { APP_NAME } from '@/lib/brand';
import SafeImage from '@/components/ui/SafeImage';

const COLS = [
  {
    title: 'Product',
    links: [
      { href: '/#features', label: 'Features' },
      { href: '/#product', label: 'Platforms' },
      { href: '/#pricing', label: 'Pricing' },
      { href: '/#how-it-works', label: "What's new" },
    ],
  },
  {
    title: 'Platforms',
    links: [
      { href: '/#product', label: 'YouTube' },
      { href: '/#product', label: 'Instagram' },
      { href: '/#product', label: 'Facebook' },
      { href: '/#product', label: 'Meta Ads' },
      { href: '/#product', label: 'WhatsApp' },
      { href: '/#product', label: 'LinkedIn' },
      { href: '/#product', label: 'Google Ads' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { href: '/#faq', label: 'Blog' },
      { href: '/#faq', label: 'Guides' },
      { href: '/#faq', label: 'Case studies' },
      { href: '/#faq', label: 'Help center' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/#faq', label: 'About' },
      { href: '/signup', label: 'Careers' },
      { href: '/signup', label: 'Contact' },
      { href: '/#faq', label: 'Press' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/#faq', label: 'Privacy policy' },
      { href: '/#faq', label: 'Terms of service' },
      { href: '/#faq', label: 'Cookie policy' },
    ],
  },
];

export default function SiteFooter({ branding }: { branding?: RevealeoBranding | null }) {
  const social = [
    { href: branding?.youtube_url, mark: '▶' },
    { href: branding?.instagram_url, mark: '◎' },
    { href: branding?.facebook_url, mark: 'f' },
    { href: branding?.linkedin_url, mark: 'in' },
    { href: branding?.twitter_url, mark: '𝕏' },
  ].filter((item) => item.href);
  return (
    <footer className="bg-white text-slate-500">
      <div className={`${SHELL} grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(5,minmax(0,1fr))]`}>
        <div>
          {branding?.footer_logo_url || branding?.logo_url ? (
            <SafeImage
              src={branding.footer_logo_url || branding.logo_url}
              alt={branding.company_name}
              className="h-12 w-auto max-w-[240px] object-contain object-left sm:h-14 sm:max-w-[280px]"
              fallback={<p className="font-bricolage text-[22px] font-bold text-slate-900">{branding?.company_name || APP_NAME}</p>}
            />
          ) : (
            <p className="font-bricolage text-[20px] font-bold text-slate-900">{branding?.company_name || APP_NAME}</p>
          )}
          <p className="mt-3 max-w-[240px] text-[13px] leading-6 text-slate-400">
            {branding?.footer_description || 'Turn public data into actionable insights. Uncover your competitors’ secrets and grow faster.'}
          </p>
          {(branding?.address || branding?.phone || branding?.email) ? (
            <div className="mt-3 space-y-1 text-[12px] leading-5 text-slate-400">
              {branding.address ? <p>{branding.address}</p> : null}
              {branding.phone ? (
                <p>
                  <a href={branding.phone_href ? `tel:${branding.phone_href}` : undefined}>{branding.phone}</a>
                </p>
              ) : null}
              {branding.email ? (
                <p>
                  <a href={`mailto:${branding.email}`}>{branding.email}</a>
                </p>
              ) : null}
            </div>
          ) : null}
          <div className="mt-4 flex gap-3 text-slate-400">
            {(social.length ? social : [{ href: '#', mark: '▶' }, { href: '#', mark: '◎' }, { href: '#', mark: 'f' }, { href: '#', mark: 'in' }, { href: '#', mark: '𝕏' }]).map((item) =>
              item.href && item.href !== '#' ? (
                <a key={item.mark} href={item.href} target="_blank" rel="noreferrer" className="text-sm font-semibold hover:text-slate-700">
                  {item.mark}
                </a>
              ) : (
                <span key={item.mark} className="text-sm font-semibold">
                  {item.mark}
                </span>
              )
            )}
          </div>
        </div>
        {COLS.map((col) => (
          <div key={col.title}>
            <p className="text-[13px] font-semibold text-slate-900">{col.title}</p>
            <ul className="mt-4 space-y-2.5 text-[13px]">
              {col.links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-slate-500 hover:text-slate-900">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className={`${SHELL} border-t border-slate-100 py-6 text-[12px] text-slate-400`}>
        © {new Date().getFullYear()} {branding?.copyright_text || `${APP_NAME}. All rights reserved.`}
      </div>
    </footer>
  );
}
