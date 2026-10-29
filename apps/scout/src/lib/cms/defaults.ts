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
  rows?: number;
  /** Show this field without opening Advanced. */
  always?: boolean;
};

export type CmsSectionDef = {
  key: string;
  label: string;
  description: string;
  fields: CmsField[];
  /** Public page this section edits. */
  href?: string;
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
  {
    key: 'privacy',
    label: 'Privacy Policy',
    description: 'Privacy policy page.',
    href: '/privacy-policy',
    fields: [
      { key: 'title', label: 'Page title', type: 'text' },
      { key: 'description', label: 'Intro', type: 'textarea', rows: 4 },
      { key: 'updated', label: 'Last updated', type: 'text', always: true },
      { key: 'body', label: 'Page content', type: 'textarea', rows: 18, always: true },
    ],
  },
  {
    key: 'terms',
    label: 'Terms and Conditions',
    description: 'Terms and conditions page.',
    href: '/terms',
    fields: [
      { key: 'title', label: 'Page title', type: 'text' },
      { key: 'description', label: 'Intro', type: 'textarea', rows: 4 },
      { key: 'updated', label: 'Last updated', type: 'text', always: true },
      { key: 'body', label: 'Page content', type: 'textarea', rows: 18, always: true },
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
  privacy: {
    title: 'Privacy Policy',
    description: 'This policy explains what Hookooh collects, how we use it, and the choices you have.',
    updated: 'October 29, 2026',
    body: `# Information we collect
When you create an account we collect your name, email address, phone number, and company details you choose to share.

When you subscribe we receive payment status from our payment provider. We do not store your full card or UPI details.

When you use the product we store the projects, searches, comparisons, notes, and exports you create, plus basic usage such as sign-in time and pages you open.

# Public research data
YouTube research uses public video data such as titles, thumbnails, view counts, likes, comments, and publish dates. Lead discovery uses business listings from Google Places. That data comes from those public sources, not from private accounts.

# How we use information
We use your information to run your account, provide research tools, process subscriptions, send service messages, and improve Hookooh.

We do not sell your personal information.

# Sharing
We share information with providers that host the app, send email or WhatsApp messages, and process payments, and when the law requires it.

# Cookies
We use cookies to keep you signed in and to remember basic site preferences. You can control cookies in your browser.

# How long we keep data
We keep account and billing records for as long as your account is open and for as long as we need them for tax, security, or legal reasons. You can ask us to delete your account.

# Your choices
You can update your profile in the workspace and cancel a subscription from Billing. To ask for a copy or deletion of your personal information, contact us using the email on this website.

# Changes
When we change this policy we update the date on this page.`,
  },
  terms: {
    title: 'Terms and Conditions',
    description: 'These terms cover your Hookooh account, trial, subscription, and use of the research tools.',
    updated: 'October 29, 2026',
    body: `# Your account
You must give accurate account details and keep your login private. You are responsible for activity under your account and for the people you add to a workspace.

# Trial and subscription
Plans, prices, and included seats are shown on the website and in Billing. A trial starts after Autopay is authorized. The subscription charge begins when the trial ends unless you cancel before then.

Payments are processed by our payment provider. Failed payments can pause access until the charge succeeds.

# Cancellation
You can cancel from Billing. Access continues until the end of the current paid period unless we say otherwise on that screen. Fees already charged are not refunded except where the law requires it.

# Acceptable use
Use Hookooh for your own marketing research. Do not scrape the product, share your login, overload the service, or use it to break the law or another service’s rules.

Research results are based on public sources and can be incomplete or out of date. They are not a guarantee of campaign results.

# Your content and ours
You keep the projects and notes you create. Hookooh and its name, design, and software stay ours. You may not copy the product or resell access.

# Availability
We may change, pause, or remove features. We try to keep the service available, but we do not promise it will be uninterrupted.

# Liability
To the extent the law allows, Hookooh is not liable for indirect or lost-profit damages, and our total liability for a claim is limited to the fees you paid for the service in the three months before the claim.

# Changes
We may update these terms. The date on this page changes when we do. Continuing to use Hookooh after an update means you accept the new terms.

# Contact
Questions about these terms can be sent to the email address shown on this website.`,
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
