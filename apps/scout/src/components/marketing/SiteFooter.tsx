import Link from 'next/link';
import { SHELL } from './layout';

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

export default function SiteFooter() {
  return (
    <footer className="bg-white text-slate-500">
      <div className={`${SHELL} grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(5,minmax(0,1fr))]`}>
        <div>
          <p className="font-bricolage text-[20px] font-bold text-slate-900">revealeo</p>
          <p className="mt-3 max-w-[240px] text-[13px] leading-6 text-slate-400">
            Turn public data into actionable insights. Uncover your competitors’ secrets and grow faster.
          </p>
          <div className="mt-4 flex gap-3 text-slate-400">
            {['▶', '◎', 'f', 'in', '𝕏'].map((mark) => (
              <span key={mark} className="text-sm font-semibold">
                {mark}
              </span>
            ))}
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
        © {new Date().getFullYear()} Revealeo. All rights reserved.
      </div>
    </footer>
  );
}
