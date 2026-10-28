import { APP_NAME } from '@/lib/brand';

export type RevealeoBranding = {
  company_name: string;
  tagline: string;
  logo_url: string;
  footer_logo_url: string;
  favicon_url: string;
  og_image_url: string;
  email: string;
  phone: string;
  phone_href: string;
  address: string;
  facebook_url: string;
  instagram_url: string;
  linkedin_url: string;
  youtube_url: string;
  twitter_url: string;
  footer_description: string;
  copyright_text: string;
};

export type CmsField = {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'image' | 'list' | 'faq';
};

export type CmsSectionDef = {
  key: string;
  label: string;
  description: string;
  fields: CmsField[];
};

export const DEFAULT_BRANDING: RevealeoBranding = {
  company_name: 'Hookooh',
  tagline: 'Uncover your competitors’ marketing secrets',
  logo_url: '',
  footer_logo_url: '',
  favicon_url: '',
  og_image_url: '',
  email: '',
  phone: '',
  phone_href: '',
  address: '',
  facebook_url: '',
  instagram_url: '',
  linkedin_url: '',
  youtube_url: '',
  twitter_url: '',
  footer_description: 'Turn public data into actionable insights. Uncover your competitors’ secrets and grow faster.',
  copyright_text: 'Hookooh. All rights reserved.',
};

export const CMS_SECTIONS: CmsSectionDef[] = [
  {
    key: 'hero',
    label: 'Hero',
    description: 'Homepage headline, supporting copy, and hero image.',
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'highlight', label: 'Highlight line', type: 'text' },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'image', label: 'Hero image', type: 'image' },
      { key: 'ctaLink', label: 'Link (Optional)', type: 'text' },
      { key: 'cta', label: 'Button Text (Optional)', type: 'text' },
    ],
  },
  {
    key: 'features',
    label: 'Features',
    description: 'Old way vs Hookooh comparison.',
    fields: [
      { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
      { key: 'title', label: 'Title', type: 'textarea' },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'oldWay', label: 'The old way (one per line)', type: 'list' },
      { key: 'withRevealeo', label: 'With Hookooh (one per line)', type: 'list' },
    ],
  },
  {
    key: 'platforms',
    label: 'Platforms',
    description: 'Multi-platform section heading and copy.',
    fields: [
      { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'description', label: 'Description', type: 'textarea' },
    ],
  },
  {
    key: 'workflow',
    label: 'How it works',
    description: 'Step-by-step workflow copy.',
    fields: [
      { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'description', label: 'Description', type: 'textarea' },
    ],
  },
  {
    key: 'ai',
    label: 'AI analysis',
    description: 'AI section copy and supporting image.',
    fields: [
      { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'cta', label: 'Button text', type: 'text' },
      { key: 'image', label: 'Section image', type: 'image' },
    ],
  },
  {
    key: 'compare',
    label: 'Compare',
    description: 'Side-by-side comparison heading.',
    fields: [
      { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'cta', label: 'Button text', type: 'text' },
    ],
  },
  {
    key: 'faq',
    label: 'FAQ',
    description: 'Questions and answers on the homepage.',
    fields: [
      { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
      { key: 'title', label: 'Title', type: 'textarea' },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'items', label: 'Questions', type: 'faq' },
    ],
  },
  {
    key: 'cta',
    label: 'Closing CTA',
    description: 'Bottom trial banner.',
    fields: [
      { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'description', label: 'Description', type: 'textarea' },
    ],
  },
];

export const DEFAULT_CONTENT: Record<string, Record<string, unknown>> = {
  hero: {
    title: 'Uncover your competitors’',
    highlight: 'marketing secrets',
    description:
      'Turn public data from YouTube, Instagram, Facebook, Ads and more into actionable insights. See what works, then recreate winning content, faster.',
    image: '/marketing/hero-dashboard.jpg',
    ctaLink: '/signup',
    cta: 'Get Started',
  },
  features: {
    eyebrow: 'From noise to insight',
    title: 'Public data is a goldmine\n— if you know where to look.',
    description:
      'Your competitors are already showing you what works. We turn publicly available content into clear, actionable insights so you can make smarter marketing decisions.',
    oldWay: [
      'Manually check competitor channels',
      'Spend hours watching videos',
      'No easy way to compare',
      'Miss valuable insights',
      'Slow, inconsistent research',
    ],
    withRevealeo: [
      'All platforms in one place',
      'Automated data collection',
      'AI-powered analysis',
      'Compare competitors easily',
      'Export and share insights',
    ],
  },
  platforms: {
    eyebrow: 'Multi-platform intelligence',
    title: 'All your competitor research in one place.',
    description:
      'Create platform-based projects and uncover insights from every major channel. Compare content, analyze what’s working, and find new opportunities across the entire social media landscape.',
  },
  workflow: {
    eyebrow: 'Simple, powerful workflow',
    title: 'From data to insights in minutes.',
    description: 'Get from a competitor’s channel to actionable insights in just a few clicks.',
  },
  ai: {
    eyebrow: 'AI-powered analysis',
    title: 'Deeper insights with AI.',
    description:
      'Our AI analyzes every part of your competitors’ content — from thumbnails and visuals to captions, transcripts and key themes.',
    cta: 'See AI analysis in action →',
    image: '/marketing/ai-california-lake.jpg',
  },
  compare: {
    eyebrow: 'Simple. Find opportunities',
    title: 'Compare content side-by-side.',
    description:
      'Easily compare your competitors’ best performing content, spot trends and find new opportunities for your own strategy.',
    cta: 'Start comparing →',
  },
  faq: {
    eyebrow: 'Frequently asked questions',
    title: 'Got questions?\nWe’ve got answers.',
    description: 'Everything you need to know about Hookooh and how it can help you make better marketing decisions.',
    items: [
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
        q: 'Do I need technical knowledge to use Hookooh?',
        a: 'No. You add public channel URLs or Places searches, then compare and export from the workspace. Optional AI notes use configured prompts — no API setup is required for the trial.',
      },
      {
        q: 'Can I upgrade or downgrade my plan later?',
        a: 'Yes. Choose a package, authorize Razorpay Autopay, then start a 14-day trial of that package. The first charge runs after the trial. Change plans from Billing at any time.',
      },
    ],
  },
  cta: {
    eyebrow: 'Ready to uncover your competitors’ secrets?',
    title: 'Start your free trial today.',
    description: 'Join thousands of marketers who use Hookooh to find opportunities, create better content and stay ahead of the competition.',
  },
};

export function mergeBranding(row?: Partial<RevealeoBranding> | Record<string, unknown> | null): RevealeoBranding {
  const next = { ...DEFAULT_BRANDING };
  for (const key of Object.keys(DEFAULT_BRANDING) as (keyof RevealeoBranding)[]) {
    const value = row?.[key];
    if (value != null && value !== '') next[key] = String(value);
  }
  if (/^revealeo\.?$/i.test(next.company_name)) next.company_name = APP_NAME;
  next.copyright_text = next.copyright_text.replace(/Revealeo/g, APP_NAME);
  return next;
}

function rebrandCopy(value: unknown): unknown {
  if (typeof value === 'string') return value.replace(/Revealeo/g, APP_NAME);
  if (Array.isArray(value)) return value.map(rebrandCopy);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, rebrandCopy(item)]));
  }
  return value;
}

export function mergeContent(stored: Record<string, Record<string, unknown>>): Record<string, Record<string, unknown>> {
  const next: Record<string, Record<string, unknown>> = {};
  for (const section of CMS_SECTIONS) {
    next[section.key] = rebrandCopy({ ...DEFAULT_CONTENT[section.key], ...(stored[section.key] || {}) }) as Record<string, unknown>;
  }
  return next;
}
