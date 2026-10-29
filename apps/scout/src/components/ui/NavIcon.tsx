'use client';

import Icon from '@/components/ui/AppIcon';

const TONES: Record<string, string> = {
  '/home': 'bg-violet-50 text-violet-600',
  '/youtube': 'bg-rose-50 text-rose-500',
  '/projects': 'bg-rose-50 text-rose-500',
  '/superadmin': 'bg-violet-50 text-violet-600',
  '/admin': 'bg-violet-50 text-violet-600',
  '/leads': 'bg-sky-50 text-sky-600',
  '/subscriptions': 'bg-amber-50 text-amber-600',
  '/cms': 'bg-emerald-50 text-emerald-600',
  '/branding': 'bg-fuchsia-50 text-fuchsia-600',
  '/settings': 'bg-slate-100 text-slate-600',
  '/billing': 'bg-indigo-50 text-indigo-600',
  '/team': 'bg-blue-50 text-blue-600',
  '/profile': 'bg-violet-50 text-violet-600',
  youtube_research: 'bg-rose-50 text-rose-500',
  lead_discovery: 'bg-sky-50 text-sky-600',
  team_management: 'bg-blue-50 text-blue-600',
  videos: 'bg-rose-50 text-rose-500',
  'channel-compare': 'bg-violet-50 text-violet-600',
  reports: 'bg-amber-50 text-amber-600',
  overview: 'bg-sky-50 text-sky-600',
  content: 'bg-emerald-50 text-emerald-600',
  engagement: 'bg-rose-50 text-rose-500',
  audience: 'bg-violet-50 text-violet-600',
  seo: 'bg-amber-50 text-amber-600',
  insights: 'bg-fuchsia-50 text-fuchsia-600',
  subscribers: 'bg-sky-50 text-sky-600',
  features: 'bg-emerald-50 text-emerald-600',
  packages: 'bg-violet-50 text-violet-600',
  product: 'bg-violet-50 text-violet-600',
  solutions: 'bg-sky-50 text-sky-600',
  resources: 'bg-amber-50 text-amber-600',
  pricing: 'bg-rose-50 text-rose-500',
  profile: 'bg-violet-50 text-violet-600',
  website: 'bg-sky-50 text-sky-600',
  logout: 'bg-rose-50 text-rose-500',
  notes: 'bg-amber-50 text-amber-600',
  basic: 'bg-sky-50 text-sky-600',
  description: 'bg-amber-50 text-amber-600',
  display: 'bg-fuchsia-50 text-fuchsia-600',
  open: 'bg-violet-50 text-violet-600',
  rename: 'bg-amber-50 text-amber-600',
  duplicate: 'bg-sky-50 text-sky-600',
  archive: 'bg-rose-50 text-rose-500',
  restore: 'bg-emerald-50 text-emerald-600',
  select: 'bg-indigo-50 text-indigo-600',
  copy: 'bg-slate-100 text-slate-600',
  youtube: 'bg-rose-50 text-rose-500',
};

export function navTone(href?: string, key?: string) {
  if (key && TONES[key]) return TONES[key];
  if (!href) return 'bg-violet-50 text-violet-600';
  const match = Object.keys(TONES)
    .filter((item) => item.startsWith('/'))
    .sort((a, b) => b.length - a.length)
    .find((item) => href === item || href.startsWith(`${item}/`) || href.startsWith(`${item}?`));
  return (match && TONES[match]) || 'bg-violet-50 text-violet-600';
}

export default function NavIcon({
  name,
  href,
  itemKey,
  delay = 0,
  size = 16,
  locked = false,
  className = 'h-8 w-8 rounded-xl',
}: {
  name: string;
  href?: string;
  itemKey?: string;
  delay?: number;
  size?: number;
  locked?: boolean;
  className?: string;
}) {
  const tone = locked ? 'bg-slate-100 text-slate-300' : navTone(href, itemKey);
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${className} ${tone}`}
      style={locked ? undefined : { animation: `nav-bob 2.6s ease-in-out ${delay}ms infinite` }}
    >
      <Icon name={name} size={size} />
    </span>
  );
}
