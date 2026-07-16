import {
  featuredProjects,
  industries,
  industryProjectGroups,
} from '@/lib/portfolio-data';
import { defaultServicesPageContent } from '@/lib/services-data';
import { testimonialsList } from '@/lib/testimonials-data';
import { defaultContactPageContent } from '@/lib/contact-data';
import { defaultAboutPageContent } from '@/lib/about-data';
import { blogArticles } from '@/lib/blog-data';
import type { CmsEntry, SiteBranding, SiteSeo } from './types';

export const defaultBranding: SiteBranding = {
  company_name: 'TechAntum',
  tagline: 'Digital Solutions',
  logo_url: null,
  footer_logo_url: null,
  favicon_url: null,
  logo_letter: 'T',
  phone: '+91 40 40268570',
  phone_href: '+914040268570',
  whatsapp: '+91 70329 23474',
  whatsapp_href: '917032923474',
  whatsapp_widget_message: 'Hello! I would like to inquire about your services.',
  email: 'info@techantum.com',
  address:
    'Plot no 118, 3rd Floor, Brundavanam, Road no 3 Kakatiya Hills, Guttala_Begumpet Madhapur, Jubilee Hills, Hyderabad, Telangana - 500033',
  footer_description:
    'We build websites, web applications, and mobile apps that help businesses grow in the digital world.',
  copyright_text: '© 2026 TechAntum. All rights reserved.',
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
  site_title: 'TechAntum | Websites, Web Apps & Mobile App Development',
  title_template: '%s | TechAntum',
  description:
    'TechAntum is an IT company specializing in website development, custom web applications, and mobile app development. We build digital products that help businesses grow.',
  keywords: [
    'web development',
    'website development',
    'web application development',
    'mobile app development',
    'React development',
    'Next.js development',
    'TechAntum',
    'software development company',
    'custom software',
  ],
  site_url: process.env.NEXT_PUBLIC_SITE_URL || 'https://techantum.com',
  og_image_url: '/assets/images/Hollandse-1771785992532.jpg',
  twitter_handle: '@techantum',
  google_verification: '84fEzKK3VJyDEiImbSG47IfCyMdkEGZlbFIo-QeHi6U',
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
      badge: 'Available for new projects',
      eyebrow: 'IT Services Company',
      titleLine1: 'Build Your Digital',
      titleLine2: 'Future With Us',
      description:
        'TechAntum delivers custom websites, web applications, and mobile apps for businesses ready to grow online. From idea to launch — we handle it all.',
      primaryCta: 'Start Your Project',
      primaryCtaHref: '/contact',
      secondaryCta: 'View Services',
      secondaryCtaHref: '/services',
      cardTitle: 'How can we help you?',
      serviceOptions: [
        'Website Development — Launch',
        'Website Development — Growth',
        'Website Development — Enterprise',
        'Web Application — Accelerate',
        'Web Application — Scale',
        'Web Application — Transform',
        'Mobile App — Launch',
        'Mobile App — Growth',
        'Mobile App — Enterprise',
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
          description: 'Businesses across industries worldwide',
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
        { id: 'tech_react', name: 'React', icon: '⚛️' },
        { id: 'tech_nextjs', name: 'Next.js', icon: '▲' },
        { id: 'tech_typescript', name: 'TypeScript', icon: 'TS' },
        { id: 'tech_node', name: 'Node.js', icon: '🟢' },
        { id: 'tech_reactnative', name: 'React Native', icon: '📱' },
        { id: 'tech_flutter', name: 'Flutter', icon: '🦋' },
        { id: 'tech_aws', name: 'AWS', icon: '☁️' },
        { id: 'tech_supabase', name: 'Supabase', icon: '⚡' },
      ],
    },
  },
  {
    entry_key: 'homepage.testimonials',
    entry_group: 'homepage',
    label: 'Homepage Testimonials',
    content: {
      eyebrow: 'Client Reviews',
      title: 'Trusted by Businesses Worldwide',
      description:
        'See what our clients say about working with TechAntum on their digital projects.',
      testimonials: [
        {
          id: 'test_1',
          name: 'Marcus Schmidt',
          country: 'Germany',
          company: 'Schmidt Digital GmbH',
          rating: 5,
          text: 'TechAntum rebuilt our corporate website from scratch. The new site loads fast, looks professional, and our lead inquiries increased by 40% within the first month.',
          service: 'Websites',
        },
        {
          id: 'test_2',
          name: 'Isabella Rodrigues',
          country: 'Brazil',
          company: 'AgroTech Solutions',
          rating: 5,
          text: 'They developed a custom web application for our inventory management. The team was responsive, delivered on time, and the app has streamlined our entire operation.',
          service: 'Web Applications',
        },
        {
          id: 'test_3',
          name: 'Ahmed El-Mansouri',
          country: 'Morocco',
          company: 'Atlas Logistics',
          rating: 5,
          text: 'Our mobile app for delivery tracking was built flawlessly. TechAntum handled everything from UI design to App Store deployment. Highly recommended.',
          service: 'Mobile Applications',
        },
        {
          id: 'test_4',
          name: 'Sophie Dubois',
          country: 'Belgium',
          company: 'EcoHeat Solutions',
          rating: 5,
          text: 'We needed a SaaS dashboard for our clients and TechAntum delivered beyond expectations. Clean code, great UX, and excellent post-launch support.',
          service: 'Web Applications',
        },
      ],
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
          question: 'What services does TechAntum offer?',
          answer:
            'We specialize in three core areas: Websites (corporate sites, landing pages, e-commerce, CMS-powered sites), Web Applications (custom apps, SaaS platforms, admin dashboards, API development), and Mobile Applications (native iOS/Android and cross-platform apps with React Native and Flutter).',
        },
        {
          question: 'How do I start a project with TechAntum?',
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
      title: 'Digital Solutions That Drive Business Growth',
      description:
        'Three divisions. Nine packages. From Launch to Enterprise — Techantum delivers websites, web applications, and mobile apps that convert visitors, automate operations, and engage customers.',
    },
  },
  {
    entry_key: 'about.hero',
    entry_group: 'about',
    label: 'About Hero',
    content: {
      eyebrow: 'About TechAntum',
      title: 'Building Digital Products Since 2018',
      description:
        'TechAntum is an IT company specializing in website development, custom web applications, and mobile app development. We partner with businesses worldwide to turn ideas into scalable digital products.',
      description2:
        'From startups launching their first product to enterprises modernizing legacy systems, we deliver scalable, user-focused digital solutions with transparent communication and agile delivery.',
      image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c',
      imageAlt: 'TechAntum team collaborating on software development project',
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
      title: 'TechAntum Blog',
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
      title: 'Trusted by Businesses Worldwide',
      description:
        'Read what our clients say about working with TechAntum on websites, web apps, and mobile applications.',
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
