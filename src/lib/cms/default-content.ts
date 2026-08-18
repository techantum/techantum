import {
  featuredProjects,
  industries,
  industryProjectGroups,
} from '@/lib/portfolio-data';
import { defaultServicesPageContent } from '@/lib/services-data';
import { testimonialsList, homepageTestimonials } from '@/lib/testimonials-data';
import { defaultContactPageContent } from '@/lib/contact-data';
import { defaultAboutPageContent } from '@/lib/about-data';
import { blogArticles } from '@/lib/blog-data';
import {
  defaultAboutOverview,
  defaultAboutUsp,
  defaultCredentialsContent,
  defaultIndustriesServed,
  defaultLeadPreferences,
  defaultMarketingAssets,
  defaultSeoMarketingInputs,
  defaultWebsiteGoals,
} from '@/lib/techantum-defaults';
import type { CmsEntry, SiteBranding, SiteSeo } from './types';

export const defaultBranding: SiteBranding = {
  company_name: 'Techantum Solutions',
  tagline: 'Website, Web App & Mobile Development',
  logo_url: null,
  footer_logo_url: null,
  favicon_url: null,
  logo_letter: 'T',
  phone: '+91 40 0000 0000',
  phone_href: '+914000000000',
  whatsapp: '+91 90000 00000',
  whatsapp_href: '919000000000',
  whatsapp_widget_message: 'Hello! I would like to inquire about Techantum Solutions IT services.',
  email: 'info@techantum.com',
  address: 'Hyderabad, India',
  footer_description:
    'Techantum Solutions delivers websites, web applications, and mobile apps — designed, built, and launched for businesses ready to grow.',
  copyright_text: '© 2026 Techantum Solutions. All rights reserved.',
};

const BRANDING_TEXT_KEYS: (keyof SiteBranding)[] = [
  'company_name',
  'tagline',
  'logo_letter',
  'phone',
  'phone_href',
  'whatsapp',
  'whatsapp_href',
  'whatsapp_widget_message',
  'email',
  'address',
  'footer_description',
  'copyright_text',
];

/** DB nulls must not override defaults — keeps form inputs controlled with strings. */
export function normalizeSiteBranding(data?: Partial<SiteBranding> | null): SiteBranding {
  const merged = { ...defaultBranding, ...data };
  for (const key of BRANDING_TEXT_KEYS) {
    if (merged[key] == null) {
      merged[key] = defaultBranding[key] as SiteBranding[typeof key];
    }
  }
  return merged;
}

export const defaultSeo: SiteSeo = {
  site_title: 'Techantum Solutions | Website, Web App & Mobile Development',
  title_template: '%s | Techantum Solutions',
  description:
    'Techantum Solutions specializes in website development, custom web applications, and mobile apps for businesses in India, Germany, and the United States.',
  keywords: [
    'website development',
    'web application development',
    'mobile app development',
    'custom software development',
    'SaaS development',
    'IT services',
    'Techantum Solutions',
  ],
  site_url: process.env.NEXT_PUBLIC_SITE_URL || 'https://techantum.com',
  og_image_url: '/videos/hero-bg-poster.jpg',
  twitter_handle: '@techantum',
  google_verification: '',
  canonical_host: 'non-www',
  index_site: true,
  follow_site: true,
  header_scripts: '',
  footer_scripts: '',
  gtm_id: '',
  ga4_id: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '',
  bing_verification: '',
  facebook_pixel_id: '',
  linkedin_partner_id: '',
  facebook_app_id: '',
  facebook_url: '',
  instagram_url: '',
  linkedin_url: 'https://www.linkedin.com/company/techantum',
  youtube_url: '',
  twitter_url: '',
};

const SEO_TEXT_KEYS: (keyof SiteSeo)[] = [
  'site_title',
  'title_template',
  'description',
  'site_url',
  'og_image_url',
  'twitter_handle',
  'google_verification',
  'header_scripts',
  'footer_scripts',
  'gtm_id',
  'ga4_id',
  'bing_verification',
  'facebook_pixel_id',
  'linkedin_partner_id',
  'facebook_app_id',
  'facebook_url',
  'instagram_url',
  'linkedin_url',
  'youtube_url',
  'twitter_url',
];

/** DB nulls must not override defaults — keeps form inputs controlled with strings. */
export function normalizeSiteSeo(data?: Partial<SiteSeo> | null): SiteSeo {
  const merged: SiteSeo = {
    ...defaultSeo,
    ...data,
    keywords: data?.keywords?.length ? data.keywords : defaultSeo.keywords,
  };
  for (const key of SEO_TEXT_KEYS) {
    if (merged[key] == null) {
      (merged as unknown as Record<string, unknown>)[key] = defaultSeo[key];
    }
  }
  if (merged.canonical_host == null) merged.canonical_host = defaultSeo.canonical_host;
  if (merged.index_site == null) merged.index_site = defaultSeo.index_site;
  if (merged.follow_site == null) merged.follow_site = defaultSeo.follow_site;
  return merged;
}

export const defaultCmsEntries: CmsEntry[] = [
  {
    entry_key: 'homepage.hero',
    entry_group: 'homepage',
    label: 'Homepage Hero',
    content: {
      heroVideoUrl: '/videos/hero-bg.mp4',
      heroPosterUrl: '/videos/hero-bg-poster.jpg',
      heroVideoFallbackUrl: 'https://assets.mixkit.co/videos/19639/19639-720.mp4',
      badge: 'Digital Solutions Partner',
      eyebrow: 'Software Development',
      titleLine1: 'Building Your',
      titleLine2: 'Digital Future',
      description:
        'Techantum Solutions delivers websites, web applications, and mobile apps — designed, built, and launched for businesses ready to grow.',
      primaryCta: 'Start Your Project',
      primaryCtaHref: '/contact',
      secondaryCta: 'View Services',
      secondaryCtaHref: '/services',
      cardTitle: 'How can we help you?',
      serviceOptions: [
        'Website Development',
        'Web Applications',
        'Mobile Applications',
        'Multiple Services',
        'Other',
      ],
    },
  },
  {
    entry_key: 'homepage.stats',
    entry_group: 'homepage',
    label: 'Homepage Stats',
    content: {
      stats: [
        {
          id: 'stat_projects',
          icon: 'RocketLaunchIcon',
          value: '150+',
          label: 'Projects Delivered',
          description: 'Websites, web apps, and mobile apps',
        },
        {
          id: 'stat_clients',
          icon: 'UsersIcon',
          value: '80+',
          label: 'Happy Clients',
          description: 'Clients in India, Germany, and the United States',
        },
        {
          id: 'stat_services',
          icon: 'CubeIcon',
          value: '3',
          label: 'Core Services',
          description: 'Websites, web apps, and mobile apps',
        },
        {
          id: 'stat_years',
          icon: 'CheckBadgeIcon',
          value: '8+',
          label: 'Years Experience',
          description: 'Building digital products since 2018',
        },
      ],
    },
  },
  {
    entry_key: 'homepage.services',
    entry_group: 'homepage',
    label: 'Homepage Services',
    content: {
      eyebrow: 'Our Services',
      title: 'Digital Solutions for Every Need',
      description:
        'Whether you need a website, a complex web application, or a mobile app — we have the expertise to bring your vision to life.',
      services: [
        {
          id: 'svc_websites',
          name: 'Website Development',
          description: 'Launch, Growth & Enterprise packages for businesses that need to convert visitors into customers',
          image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f',
          imageAlt: 'Modern responsive website displayed on laptop screen',
          href: '/services/website-development',
          icon: 'ComputerDesktopIcon',
        },
        {
          id: 'svc_webapps',
          name: 'Web Application Development',
          description: 'Accelerate, Scale & Transform packages to automate operations and scale your business',
          image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c',
          imageAlt: 'Developer building a custom web application',
          href: '/services/web-application-development',
          icon: 'CodeBracketIcon',
        },
        {
          id: 'svc_mobile',
          name: 'Mobile Application Development',
          description: 'Launch, Growth & Enterprise mobile packages to put your business in customers\' pockets',
          image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c',
          imageAlt: 'Mobile applications running on smartphone devices',
          href: '/services/mobile-application-development',
          icon: 'DevicePhoneMobileIcon',
        },
      ],
    },
  },
  {
    entry_key: 'homepage.tech_stack',
    entry_group: 'homepage',
    label: 'Tech Stack',
    content: {
      eyebrow: 'Tech Stack',
      title: 'Technologies We Use',
      description:
        'We build with modern, battle-tested technologies to deliver fast, secure, and scalable solutions.',
      technologies: [
        { id: 'tech_react', name: 'React', icon: 'React' },
        { id: 'tech_nextjs', name: 'Next.js', icon: 'Next.js' },
        { id: 'tech_typescript', name: 'TypeScript', icon: 'TypeScript' },
        { id: 'tech_node', name: 'Node.js', icon: 'Node.js' },
        { id: 'tech_reactnative', name: 'React Native', icon: 'React Native' },
        { id: 'tech_flutter', name: 'Flutter', icon: 'Flutter' },
        { id: 'tech_aws', name: 'AWS', icon: 'AWS' },
        { id: 'tech_supabase', name: 'Supabase', icon: 'Supabase' },
      ],
    },
  },
  {
    entry_key: 'homepage.testimonials',
    entry_group: 'homepage',
    label: 'Homepage Testimonials',
    content: {
      eyebrow: 'Client Reviews',
      title: 'Trusted by Our Clients',
      description:
        'See what businesses say about working with Techantum Solutions on their digital projects.',
      testimonials: homepageTestimonials,
    },
  },
  {
    entry_key: 'homepage.faq',
    entry_group: 'homepage',
    label: 'Homepage FAQ',
    content: {
      title: 'Frequently Asked Questions',
      description:
        'Got questions? We have answers. Learn more about our services, process, and how we work.',
      faqs: [
        {
          question: 'What services does Techantum Solutions offer?',
          answer:
            'We specialize in three core areas: Websites (corporate sites, landing pages, e-commerce, CMS-powered sites), Web Applications (custom apps, SaaS platforms, admin dashboards, API development), and Mobile Applications (native iOS/Android and cross-platform apps with React Native and Flutter).',
        },
        {
          question: 'How do I start a project with Techantum Solutions?',
          answer:
            "Reach out through our contact form, email us at info@techantum.com, or call us directly. Share your project idea, goals, and timeline. We'll schedule a free consultation and provide a detailed proposal within 48 hours.",
        },
        {
          question: 'What technologies do you use?',
          answer:
            'We build with modern, industry-standard technologies including React, Next.js, TypeScript, Node.js, React Native, Flutter, and cloud platforms like AWS and Supabase. We choose the best stack for each project based on your requirements.',
        },
        {
          question: 'How long does a typical project take?',
          answer:
            'Timelines vary by scope: a website typically takes 2–6 weeks, a web application 6–16 weeks, and a mobile app 8–20 weeks. We provide a detailed timeline during the proposal phase and keep you updated throughout development.',
        },
        {
          question: 'Do you provide ongoing support after launch?',
          answer:
            "Yes. We offer maintenance and support packages covering bug fixes, security updates, performance monitoring, and feature additions. We're committed to your product's long-term success, not just the initial launch.",
        },
        {
          question: 'Can you work with our existing team or codebase?',
          answer:
            'Absolutely. We frequently collaborate with in-house teams, integrate with existing systems, and take over legacy codebases for modernization. We adapt to your workflow — whether you need a full team or augmentation.',
        },
        {
          question: 'What is your development process?',
          answer:
            "We follow an agile methodology: discovery and planning, UI/UX design, iterative development with regular demos, testing and QA, deployment, and post-launch support. You'll have visibility into progress at every stage.",
        },
        {
          question: 'How much does a project cost?',
          answer:
            'Pricing depends on scope, complexity, and timeline. We offer fixed-price quotes for well-defined projects and flexible engagement for ongoing work. Contact us for a free estimate tailored to your needs.',
        },
      ],
    },
  },
  {
    entry_key: 'homepage.cta',
    entry_group: 'homepage',
    label: 'Homepage CTA',
    content: {
      title: 'Ready to Build Something Great?',
      description:
        'Tell us about your project and get a free consultation. Our team will respond within 24 hours with a tailored plan and estimate.',
      bullets: [
        'Free project consultation',
        'Detailed proposal within 48 hours',
        'Agile development with regular updates',
        'Post-launch support and maintenance',
      ],
      primaryCta: 'Start Your Project',
      primaryCtaHref: '/contact',
      phoneLabel: 'Or call us directly at',
    },
  },
  {
    entry_key: 'services.page',
    entry_group: 'services',
    label: 'Services Page',
    content: defaultServicesPageContent as unknown as Record<string, unknown>,
  },
  {
    entry_key: 'services.hero',
    entry_group: 'services',
    label: 'Services Hero',
    content: {
      eyebrow: 'Our Services',
      title: 'Websites, Web Apps & Mobile Applications',
      description:
        'Website development, custom web applications, and mobile app development — tailored packages from launch to enterprise scale.',
    },
  },
  {
    entry_key: 'about.hero',
    entry_group: 'about',
    label: 'About Hero',
    content: {
      eyebrow: 'About Techantum Solutions',
      title: 'Building Your Digital Future',
      description:
        'Techantum Solutions is a full-service IT company specializing in websites, web applications, and mobile apps for businesses ready to scale.',
      description2:
        'With expertise across modern technologies and agile delivery, we help clients in India, Germany, and the United States turn ideas into reliable digital products.',
      image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c',
      imageAlt: 'Techantum Solutions software development team collaborating',
    },
  },
  {
    entry_key: 'about.page',
    entry_group: 'about',
    label: 'About Page',
    content: defaultAboutPageContent as unknown as Record<string, unknown>,
  },
  {
    entry_key: 'portfolio.hero',
    entry_group: 'portfolio',
    label: 'Portfolio Hero',
    content: {
      eyebrow: 'Our Work',
      title: 'Projects That Drive Results',
      description:
        'Explore our portfolio of websites, web applications, and mobile apps across industries — from startups to enterprise.',
    },
  },
  {
    entry_key: 'portfolio.data',
    entry_group: 'portfolio',
    label: 'Portfolio Projects',
    content: {
      industriesEyebrow: 'Industries We Serve',
      industriesTitle: 'Cross-Industry Expertise',
      industriesDescription:
        'Deep experience delivering digital platforms tailored to the needs of diverse business sectors.',
      featuredEyebrow: 'Featured Projects',
      featuredTitle: 'Flagship Platforms',
      featuredDescription:
        'Scalable, conversion-focused digital products built for real business impact.',
      industries,
      featuredProjects,
      industryProjectGroups,
    },
  },
  {
    entry_key: 'portfolio.cta',
    entry_group: 'portfolio',
    label: 'Portfolio CTA',
    content: {
      title: "Let's Build Something Exceptional",
      description:
        'We help businesses transform ideas into scalable digital platforms — from strategy and design to development and deployment.',
      ctaText: 'Start Your Project',
      ctaHref: '/contact',
    },
  },
  {
    entry_key: 'contact.hero',
    entry_group: 'contact',
    label: 'Contact Hero',
    content: {
      eyebrow: 'Get In Touch',
      title: 'Start Your Project Today',
      description:
        'Have a project in mind? Fill out the form below or reach out directly — we typically respond within 24 hours.',
    },
  },
  {
    entry_key: 'contact.page',
    entry_group: 'contact',
    label: 'Contact Page',
    content: defaultContactPageContent as unknown as Record<string, unknown>,
  },
  {
    entry_key: 'blog.hero',
    entry_group: 'blog',
    label: 'Blog Hero',
    content: {
      eyebrow: 'Insights & Updates',
      title: 'Techantum Solutions Blog',
      description:
        'Articles on web development, mobile apps, technology trends, and digital product strategy.',
    },
  },
  {
    entry_key: 'blog.posts',
    entry_group: 'blog',
    label: 'Blog Posts',
    content: {
      articles: blogArticles,
    },
  },
  {
    entry_key: 'testimonials.page',
    entry_group: 'testimonials',
    label: 'Testimonials Page',
    content: {
      testimonials: testimonialsList,
    },
  },
  {
    entry_key: 'testimonials.hero',
    entry_group: 'testimonials',
    label: 'Testimonials Hero',
    content: {
      eyebrow: 'Client Stories',
      title: 'Trusted by Clients in India, Germany & the United States',
      description:
        'See what businesses say about working with Techantum Solutions on their digital projects.',
    },
  },
  {
    entry_key: 'site.not_found',
    entry_group: 'site',
    label: '404 Page',
    content: {
      code: '404',
      title: 'Page Not Found',
      description: "The page you're looking for doesn't exist or has been moved. Let's get you back on track.",
      primaryCta: 'Back to Home',
      primaryCtaHref: '/',
      secondaryCta: 'Go Back',
      showContactLink: true,
    },
  },
  {
    entry_key: 'about.overview',
    entry_group: 'about',
    label: 'Company Overview',
    content: defaultAboutOverview as unknown as Record<string, unknown>,
  },
  {
    entry_key: 'about.usp',
    entry_group: 'about',
    label: 'Unique Selling Proposition',
    content: defaultAboutUsp as unknown as Record<string, unknown>,
  },
  {
    entry_key: 'industries.served',
    entry_group: 'industries',
    label: 'Industries Served',
    content: defaultIndustriesServed as unknown as Record<string, unknown>,
  },
  {
    entry_key: 'credentials.page',
    entry_group: 'credentials',
    label: 'Credentials & Awards',
    content: defaultCredentialsContent as unknown as Record<string, unknown>,
  },
  {
    entry_key: 'company.website_goals',
    entry_group: 'company',
    label: 'Website Goals',
    content: defaultWebsiteGoals as unknown as Record<string, unknown>,
  },
  {
    entry_key: 'company.seo_marketing',
    entry_group: 'company',
    label: 'SEO & Marketing Inputs',
    content: defaultSeoMarketingInputs as unknown as Record<string, unknown>,
  },
  {
    entry_key: 'company.lead_preferences',
    entry_group: 'company',
    label: 'Lead Management Preferences',
    content: defaultLeadPreferences as unknown as Record<string, unknown>,
  },
  {
    entry_key: 'company.marketing_assets',
    entry_group: 'company',
    label: 'Marketing Collateral Checklist',
    content: defaultMarketingAssets as unknown as Record<string, unknown>,
  },
];

export function getDefaultContentMap(): Record<string, Record<string, unknown>> {
  return defaultCmsEntries.reduce<Record<string, Record<string, unknown>>>((acc, entry) => {
    acc[entry.entry_key] = entry.content;
    return acc;
  }, {});
}

export function getDefaultContent(key: string): Record<string, unknown> {
  const entry = defaultCmsEntries.find((item) => item.entry_key === key);
  return entry?.content ?? {};
}

/** Merge CMS content over defaults, skipping empty values so partial saves don't wipe fields. */
export function mergeCmsContent(
  key: string,
  content?: Record<string, unknown>
): Record<string, unknown> {
  const defaults = getDefaultContent(key);
  if (!content) return defaults;

  const merged = { ...defaults };
  for (const [field, value] of Object.entries(content)) {
    if (value === null || value === undefined) continue;
    if (typeof value === 'string' && value.trim() === '') continue;
    merged[field] = value;
  }
  return merged;
}
