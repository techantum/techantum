export type DivisionSlug =
  | 'website-development'
  | 'web-application-development'
  | 'mobile-application-development';

export type WebsitePlanSlug = 'launch' | 'growth' | 'enterprise';
export type WebAppPlanSlug = 'accelerate' | 'scale' | 'transform';
export type MobilePlanSlug = 'launch' | 'growth' | 'enterprise';
export type PlanSlug = WebsitePlanSlug | WebAppPlanSlug | MobilePlanSlug;

export interface ComparisonRow {
  feature: string;
  values: Record<string, string>;
}

export interface ServicePlan {
  slug: PlanSlug;
  name: string;
  tagline: string;
  bestFor: string;
  description: string;
  scope?: string;
  includes?: string[];
  solutions?: string[];
  features?: string[];
  highlighted?: boolean;
  image: string;
  imageAlt: string;
}

export interface ServiceDivision {
  slug: DivisionSlug;
  name: string;
  shortName: string;
  eyebrow: string;
  title: string;
  description: string;
  marketingMessage: string;
  packagesHeadline: string;
  targetAudience: string[];
  benefits: string[];
  icon: string;
  iconClass: string;
  bgClass: string;
  image: string;
  imageAlt: string;
  plans: ServicePlan[];
  comparisonRows: ComparisonRow[];
}

export const digitalTransformationJourney = [
  'Strategy & Consulting',
  'UI/UX Design',
  'Website Development',
  'Web Application Development',
  'Mobile Application Development',
  'Cloud Deployment',
  'Integrations & Automation',
  'Maintenance & Support',
  'Digital Growth & Optimization',
];

export const salesFunnelSteps = [
  { stage: 'Awareness', action: 'Website Visitor' },
  { stage: 'Interest', action: 'Download Company Profile' },
  { stage: 'Consideration', action: 'Book Free Consultation' },
  { stage: 'Evaluation', action: 'Requirement Analysis' },
  { stage: 'Proposal', action: 'Solution Proposal' },
  { stage: 'Presentation', action: 'Technical Presentation' },
  { stage: 'Estimation', action: 'Project Estimation' },
  { stage: 'Decision', action: 'Contract' },
  { stage: 'Delivery', action: 'Development' },
  { stage: 'Retention', action: 'Support & Maintenance' },
];

export const leadGenerationPlan = {
  topOfFunnel: {
    title: 'Top of Funnel — Awareness',
    goal: 'Increase brand visibility and attract qualified traffic.',
    tactics: [
      'SEO-optimized website',
      'Industry-specific landing pages',
      'Google Ads',
      'LinkedIn Ads',
      'Facebook & Instagram campaigns',
      'Case studies',
      'Client testimonials',
      'Technical blogs',
      'Short-form videos',
      'Webinar series',
    ],
  },
  middleOfFunnel: {
    title: 'Middle of Funnel — Consideration',
    goal: 'Educate prospects and build trust.',
    tactics: [
      'Free website audit',
      'Free consultation call',
      'Technology assessment',
      'ROI calculator',
      'Live demos',
      'Industry-specific solution brochures',
      'Email nurturing campaigns',
      'WhatsApp follow-ups',
    ],
  },
  bottomOfFunnel: {
    title: 'Bottom of Funnel — Decision',
    goal: 'Convert opportunities into signed projects.',
    tactics: [
      'Customized proposals',
      'Solution architecture presentations',
      'Pilot or Proof of Concept (PoC)',
      'Client references',
      'Transparent pricing',
      'Project roadmap',
      'Implementation timeline',
    ],
  },
};

export const serviceDivisions: ServiceDivision[] = [
  {
    slug: 'website-development',
    name: 'Website Development',
    shortName: 'Websites',
    eyebrow: 'Website Development',
    title: 'Professional Websites That Convert Visitors Into Customers',
    description:
      'Build credibility, improve Google visibility, and generate leads with fast, mobile-optimized, SEO-ready websites.',
    marketingMessage: 'Professional websites that convert visitors into customers.',
    packagesHeadline: 'Launch → Growth → Enterprise',
    targetAudience: [
      'Small Businesses',
      'Educational Institutions',
      'Hospitals',
      'Builders',
      'Restaurants',
      'Manufacturers',
      'Consultants',
    ],
    benefits: [
      'Build credibility',
      'Improve Google visibility',
      'Generate leads',
      'Faster loading',
      'Mobile optimized',
      'SEO ready',
    ],
    icon: 'ComputerDesktopIcon',
    iconClass: 'text-primary',
    bgClass: 'bg-primary/10',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f',
    imageAlt: 'Modern responsive business website on laptop and mobile',
    plans: [
      {
        slug: 'launch',
        name: 'Launch',
        tagline: 'Establish your online presence',
        bestFor: 'Startups',
        description:
          'Ideal for startups establishing a professional online presence with a focused CMS website.',
        scope: 'Up to 5 CMS Pages',
        includes: [
          'Up to 5 CMS Pages',
          'Custom UI/UX',
          'Responsive Design',
          'Contact Forms',
          'Image Gallery',
          'Basic SEO Setup',
          'Performance Optimization',
          'Core Web Vitals',
          'Analytics Integration',
          'Admin User Roles',
          'Standard Security Hardening',
          'Training',
          '30 Days Support',
        ],
        image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085',
        imageAlt: 'Startup business website launch on laptop',
      },
      {
        slug: 'growth',
        name: 'Growth',
        tagline: 'Generate leads and grow online',
        bestFor: 'SMEs',
        description:
          'For growing SMEs that need content tools, advanced SEO, and selective integrations to scale leads.',
        scope: 'Up to 10 CMS Pages',
        includes: [
          'Up to 10 CMS Pages',
          'Custom UI/UX',
          'Responsive Design',
          'Contact Forms',
          'Image Gallery',
          'Blog Management',
          'Dynamic Services',
          'Multi-language (Optional)',
          'Advanced SEO Setup',
          'Performance Optimization',
          'Core Web Vitals',
          'Analytics Integration',
          'CRM Integration (Optional)',
          'Limited Third-party APIs',
          'Limited Custom Modules',
          'Admin User Roles',
          'Advanced Security Hardening',
          'Training',
          '60 Days Support',
        ],
        highlighted: true,
        image: 'https://images.unsplash.com/photo-1551650975-87deedd944c3',
        imageAlt: 'Growth-focused website with lead capture forms',
      },
      {
        slug: 'enterprise',
        name: 'Enterprise',
        tagline: 'Scalable digital platforms',
        bestFor: 'Large Enterprises',
        description:
          'For large enterprises needing unlimited pages, multi-language, CRM, and enterprise-grade SEO and security.',
        scope: 'Unlimited CMS Pages',
        includes: [
          'Unlimited CMS Pages',
          'Custom UI/UX',
          'Responsive Design',
          'Contact Forms',
          'Image Gallery',
          'Blog Management',
          'Dynamic Services',
          'Multi-language',
          'Enterprise SEO Setup',
          'Performance Optimization',
          'Core Web Vitals',
          'Analytics Integration',
          'CRM Integration',
          'Unlimited Third-party APIs',
          'Unlimited Custom Modules',
          'Multi-role Users',
          'Enterprise Security Hardening',
          'Training',
          '90 Days Support',
        ],
        image: 'https://images.unsplash.com/photo-1547658719-da2b51169166',
        imageAlt: 'Enterprise website platform dashboard',
      },
    ],
    comparisonRows: [
      { feature: 'Best For', values: { launch: 'Startups', growth: 'SMEs', enterprise: 'Large Enterprises' } },
      { feature: 'CMS Pages', values: { launch: 'Up to 5', growth: 'Up to 10', enterprise: 'Unlimited' } },
      { feature: 'Custom UI/UX', values: { launch: '✓', growth: '✓', enterprise: '✓' } },
      { feature: 'Responsive Design', values: { launch: '✓', growth: '✓', enterprise: '✓' } },
      { feature: 'Contact Forms', values: { launch: '✓', growth: '✓', enterprise: '✓' } },
      { feature: 'Image Gallery', values: { launch: '✓', growth: '✓', enterprise: '✓' } },
      { feature: 'Blog Management', values: { launch: '—', growth: '✓', enterprise: '✓' } },
      { feature: 'Dynamic Services', values: { launch: '—', growth: '✓', enterprise: '✓' } },
      { feature: 'Multi-language', values: { launch: '—', growth: 'Optional', enterprise: '✓' } },
      { feature: 'SEO Setup', values: { launch: 'Basic', growth: 'Advanced', enterprise: 'Enterprise' } },
      { feature: 'Performance Optimization', values: { launch: '✓', growth: '✓', enterprise: '✓' } },
      { feature: 'Core Web Vitals', values: { launch: '✓', growth: '✓', enterprise: '✓' } },
      { feature: 'Analytics Integration', values: { launch: '✓', growth: '✓', enterprise: '✓' } },
      { feature: 'CRM Integration', values: { launch: '—', growth: 'Optional', enterprise: '✓' } },
      { feature: 'Third-party APIs', values: { launch: '—', growth: 'Limited', enterprise: 'Unlimited' } },
      { feature: 'Custom Modules', values: { launch: '—', growth: 'Limited', enterprise: 'Unlimited' } },
      { feature: 'User Roles', values: { launch: 'Admin', growth: 'Admin', enterprise: 'Multi-role' } },
      { feature: 'Security Hardening', values: { launch: 'Standard', growth: 'Advanced', enterprise: 'Enterprise' } },
      { feature: 'Training', values: { launch: '✓', growth: '✓', enterprise: '✓' } },
      { feature: 'Support', values: { launch: '30 Days', growth: '60 Days', enterprise: '90 Days' } },
    ],
  },
  {
    slug: 'web-application-development',
    name: 'Web Application Development',
    shortName: 'Web Applications',
    eyebrow: 'Web Application Development',
    title: 'Automate Operations. Eliminate Manual Work. Scale Your Business.',
    description:
      'Custom web applications engineered for process automation, centralized data, and real-time reporting.',
    marketingMessage: 'Automate operations. Eliminate manual work. Scale your business.',
    packagesHeadline: 'Accelerate → Scale → Transform',
    targetAudience: [
      'SMEs',
      'Enterprises',
      'Manufacturing',
      'Healthcare',
      'Education',
      'Logistics',
      'Retail',
    ],
    benefits: [
      'Process automation',
      'Centralized data',
      'Productivity improvement',
      'Real-time reporting',
      'Cost reduction',
      'Better decision making',
    ],
    icon: 'CodeBracketIcon',
    iconClass: 'text-secondary',
    bgClass: 'bg-secondary/10',
    image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c',
    imageAlt: 'Developer building custom web application',
    plans: [
      {
        slug: 'accelerate',
        name: 'Accelerate',
        tagline: 'Build fast and validate ideas',
        bestFor: 'MVP / Startup',
        description:
          'Designed for startups launching MVPs quickly with core auth, dashboard, and basic automation.',
        features: [
          'Requirement Analysis',
          'Standard UI/UX Design',
          'Up to 3 User Roles',
          'Authentication',
          'Dashboard',
          'Admin Panel',
          'Basic Reports',
          'Basic Workflow Automation',
          'Up to 3 API Integrations',
          'Payment Gateway (Optional)',
          'Email & SMS',
          'Push Notifications',
          'Medium Scalability',
          'Standard Security',
          'Standard Testing',
          'Cloud Deployment',
          '2 Months Maintenance',
        ],
        image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71',
        imageAlt: 'MVP web application dashboard for startups',
      },
      {
        slug: 'scale',
        name: 'Scale',
        tagline: 'Automate multiple departments',
        bestFor: 'SMEs',
        description:
          'For SMEs automating operations with advanced workflows, payments, documents, and multi-branch support.',
        features: [
          'Requirement Analysis',
          'Advanced UI/UX Design',
          'Up to 10 User Roles',
          'Authentication',
          'Dashboard',
          'Admin Panel',
          'Advanced Reports',
          'Advanced Workflow Automation',
          'Up to 10 API Integrations',
          'Payment Gateway',
          'Email & SMS',
          'Push Notifications',
          'Document Management',
          'Multi-branch Support',
          'Approval Workflows',
          'ERP/CRM Integration (Optional)',
          'AI Features (Optional)',
          'High Scalability',
          'Advanced Security',
          'Advanced Testing',
          'Cloud Deployment',
          '3 Months Maintenance',
        ],
        highlighted: true,
        image: 'https://images.unsplash.com/photo-1551434678-e076c223a692',
        imageAlt: 'Business automation web application interface',
      },
      {
        slug: 'transform',
        name: 'Transform',
        tagline: 'Enterprise-grade platforms',
        bestFor: 'Enterprise',
        description:
          'Enterprise platforms with unlimited roles and APIs, custom BI, AI features, and enterprise security.',
        features: [
          'Requirement Analysis',
          'Premium UI/UX Design',
          'Unlimited User Roles',
          'Authentication',
          'Dashboard',
          'Admin Panel',
          'Custom BI Reports',
          'Enterprise Workflow Automation',
          'Unlimited API Integrations',
          'Payment Gateway',
          'Email & SMS',
          'Push Notifications',
          'Document Management',
          'Multi-branch Support',
          'Approval Workflows',
          'ERP/CRM Integration',
          'AI Features',
          'Enterprise Scalability',
          'Enterprise Security',
          'Enterprise Testing',
          'Cloud Deployment',
          '3 Months Maintenance',
        ],
        image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa',
        imageAlt: 'Enterprise digital transformation platform',
      },
    ],
    comparisonRows: [
      { feature: 'Best For', values: { accelerate: 'MVP / Startup', scale: 'SMEs', transform: 'Enterprise' } },
      { feature: 'Requirement Analysis', values: { accelerate: '✓', scale: '✓', transform: '✓' } },
      { feature: 'UI/UX Design', values: { accelerate: 'Standard', scale: 'Advanced', transform: 'Premium' } },
      { feature: 'User Roles', values: { accelerate: 'Up to 3', scale: 'Up to 10', transform: 'Unlimited' } },
      { feature: 'Authentication', values: { accelerate: '✓', scale: '✓', transform: '✓' } },
      { feature: 'Dashboard', values: { accelerate: '✓', scale: '✓', transform: '✓' } },
      { feature: 'Admin Panel', values: { accelerate: '✓', scale: '✓', transform: '✓' } },
      { feature: 'Reports', values: { accelerate: 'Basic', scale: 'Advanced', transform: 'Custom BI' } },
      { feature: 'Workflow Automation', values: { accelerate: 'Basic', scale: 'Advanced', transform: 'Enterprise' } },
      { feature: 'API Integrations', values: { accelerate: 'Up to 3', scale: 'Up to 10', transform: 'Unlimited' } },
      { feature: 'Payment Gateway', values: { accelerate: 'Optional', scale: '✓', transform: '✓' } },
      { feature: 'Email & SMS', values: { accelerate: '✓', scale: '✓', transform: '✓' } },
      { feature: 'Push Notifications', values: { accelerate: '✓', scale: '✓', transform: '✓' } },
      { feature: 'Document Management', values: { accelerate: '—', scale: '✓', transform: '✓' } },
      { feature: 'Multi-branch Support', values: { accelerate: '—', scale: '✓', transform: '✓' } },
      { feature: 'Approval Workflows', values: { accelerate: '—', scale: '✓', transform: '✓' } },
      { feature: 'ERP/CRM Integration', values: { accelerate: '—', scale: 'Optional', transform: '✓' } },
      { feature: 'AI Features', values: { accelerate: '—', scale: 'Optional', transform: '✓' } },
      { feature: 'Scalability', values: { accelerate: 'Medium', scale: 'High', transform: 'Enterprise' } },
      { feature: 'Security', values: { accelerate: 'Standard', scale: 'Advanced', transform: 'Enterprise' } },
      { feature: 'Testing', values: { accelerate: 'Standard', scale: 'Advanced', transform: 'Enterprise' } },
      { feature: 'Cloud Deployment', values: { accelerate: '✓', scale: '✓', transform: '✓' } },
      { feature: 'Maintenance', values: { accelerate: '2 Months', scale: '3 Months', transform: '3 Months' } },
    ],
  },
  {
    slug: 'mobile-application-development',
    name: 'Mobile Application Development',
    shortName: 'Mobile Applications',
    eyebrow: 'Mobile Application Development',
    title: "Put Your Business in Your Customers' Pockets",
    description:
      'Native and cross-platform mobile apps for better customer engagement, faster services, and brand loyalty.',
    marketingMessage: "Put your business in your customers' pockets.",
    packagesHeadline: 'Launch Mobile → Growth Mobile → Enterprise Mobile',
    targetAudience: [
      'Product Companies',
      'Startups',
      'Retail',
      'Healthcare',
      'Logistics',
      'Real Estate',
    ],
    benefits: [
      'Better customer engagement',
      'Faster services',
      'Push notifications',
      'Brand loyalty',
      'Mobile workforce',
      'Real-time access',
    ],
    icon: 'DevicePhoneMobileIcon',
    iconClass: 'text-accent',
    bgClass: 'bg-accent/10',
    image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c',
    imageAlt: 'Mobile applications on smartphone devices',
    plans: [
      {
        slug: 'launch',
        name: 'Launch Mobile',
        tagline: 'MVP mobile apps',
        bestFor: 'MVP',
        description: 'Android or iOS MVP apps to validate your product idea and reach early users quickly.',
        features: [
          'Android or iOS',
          'Standard UI/UX',
          'Login & Registration',
          'Dashboard',
          'API Integration',
          'Push Notifications',
          'Payment Gateway (Optional)',
          'Maps & GPS (Optional)',
          'Camera/QR/Barcode (Optional)',
          'Basic Analytics',
          'Admin Panel',
          'App Store Deployment',
          '2 Months Support',
        ],
        image: 'https://images.unsplash.com/photo-1555774698-0c77d0d5c11d',
        imageAlt: 'MVP mobile app on smartphone',
      },
      {
        slug: 'growth',
        name: 'Growth Mobile',
        tagline: 'Cross-platform business apps',
        bestFor: 'Business Apps',
        description:
          'Cross-platform Android and iOS apps with offline mode, payments, maps, and advanced analytics.',
        features: [
          'Android + iOS',
          'Premium UI/UX',
          'Login & Registration',
          'Dashboard',
          'API Integration',
          'Push Notifications',
          'Offline Mode',
          'Payment Gateway',
          'Maps & GPS',
          'Camera/QR/Barcode',
          'Chat (Optional)',
          'Real-time Sync',
          'Advanced Analytics',
          'Biometric Login',
          'Admin Panel',
          'Multi-language (Optional)',
          'AI Features (Optional)',
          'App Store Deployment',
          '3 Months Support',
        ],
        highlighted: true,
        image: 'https://images.unsplash.com/photo-1586717791821-3f44a563fa4c',
        imageAlt: 'Cross-platform business mobile application',
      },
      {
        slug: 'enterprise',
        name: 'Enterprise Mobile',
        tagline: 'Enterprise mobility solutions',
        bestFor: 'Enterprise Mobility',
        description:
          'Enterprise mobility with chat, AI, multi-language, biometric login, and enterprise analytics.',
        features: [
          'Android + iOS',
          'Enterprise UI/UX',
          'Login & Registration',
          'Dashboard',
          'API Integration',
          'Push Notifications',
          'Offline Mode',
          'Payment Gateway',
          'Maps & GPS',
          'Camera/QR/Barcode',
          'Chat',
          'Real-time Sync',
          'Enterprise Analytics',
          'Biometric Login',
          'Admin Panel',
          'Multi-language',
          'AI Features',
          'App Store Deployment',
          '3 Months Support',
        ],
        image: 'https://images.unsplash.com/photo-1516116216624-53e697fedbea',
        imageAlt: 'Enterprise mobile application ecosystem',
      },
    ],
    comparisonRows: [
      { feature: 'Best For', values: { launch: 'MVP', growth: 'Business Apps', enterprise: 'Enterprise Mobility' } },
      { feature: 'Platforms', values: { launch: 'Android or iOS', growth: 'Android + iOS', enterprise: 'Android + iOS' } },
      { feature: 'UI/UX', values: { launch: 'Standard', growth: 'Premium', enterprise: 'Enterprise' } },
      { feature: 'Login & Registration', values: { launch: '✓', growth: '✓', enterprise: '✓' } },
      { feature: 'Dashboard', values: { launch: '✓', growth: '✓', enterprise: '✓' } },
      { feature: 'API Integration', values: { launch: '✓', growth: '✓', enterprise: '✓' } },
      { feature: 'Push Notifications', values: { launch: '✓', growth: '✓', enterprise: '✓' } },
      { feature: 'Offline Mode', values: { launch: '—', growth: '✓', enterprise: '✓' } },
      { feature: 'Payment Gateway', values: { launch: 'Optional', growth: '✓', enterprise: '✓' } },
      { feature: 'Maps & GPS', values: { launch: 'Optional', growth: '✓', enterprise: '✓' } },
      { feature: 'Camera/QR/Barcode', values: { launch: 'Optional', growth: '✓', enterprise: '✓' } },
      { feature: 'Chat', values: { launch: '—', growth: 'Optional', enterprise: '✓' } },
      { feature: 'Real-time Sync', values: { launch: '—', growth: '✓', enterprise: '✓' } },
      { feature: 'Analytics', values: { launch: 'Basic', growth: 'Advanced', enterprise: 'Enterprise' } },
      { feature: 'Biometric Login', values: { launch: '—', growth: '✓', enterprise: '✓' } },
      { feature: 'Admin Panel', values: { launch: '✓', growth: '✓', enterprise: '✓' } },
      { feature: 'Multi-language', values: { launch: '—', growth: 'Optional', enterprise: '✓' } },
      { feature: 'AI Features', values: { launch: '—', growth: 'Optional', enterprise: '✓' } },
      { feature: 'App Store Deployment', values: { launch: '✓', growth: '✓', enterprise: '✓' } },
      { feature: 'Support', values: { launch: '2 Months', growth: '3 Months', enterprise: '3 Months' } },
    ],
  },
];

export function getDivision(slug: string): ServiceDivision | undefined {
  return serviceDivisions.find((d) => d.slug === slug);
}

export function getPlan(divisionSlug: string, planSlug: string): ServicePlan | undefined {
  const division = getDivision(divisionSlug);
  return division?.plans.find((p) => p.slug === planSlug);
}

export function getDivisionPath(slug: DivisionSlug): string {
  return `/services/${slug}`;
}

export function getPlanPath(divisionSlug: DivisionSlug, planSlug: PlanSlug): string {
  return `/services/${divisionSlug}/${planSlug}`;
}

export function getContactHref(division: ServiceDivision, plan?: ServicePlan): string {
  const params = new URLSearchParams();
  if (plan) {
    if (division.slug === 'website-development') {
      params.set('service', `Website Development — ${plan.name}`);
    } else if (division.slug === 'web-application-development') {
      params.set('service', `Web Application — ${plan.name}`);
    } else {
      params.set('service', `Mobile App — ${plan.name.replace(' Mobile', '')}`);
    }
  } else {
    params.set('service', division.name);
  }
  return `/contact?${params.toString()}`;
}

export const allDivisionSlugs = serviceDivisions.map((d) => d.slug);

export const allPlanPaths = serviceDivisions.flatMap((division) =>
  division.plans.map((plan) => ({
    division: division.slug,
    plan: plan.slug,
  }))
);

export const seoKeywordsByDivision: Record<DivisionSlug, string[]> = {
  'website-development': [
    'website development company',
    'business website design',
    'CMS website development',
    'SEO website development',
    'corporate website India',
    'small business website',
    'lead generation website',
  ],
  'web-application-development': [
    'custom web application development',
    'ERP development',
    'SaaS development company',
    'business automation software',
    'web app development India',
    'enterprise web application',
  ],
  'mobile-application-development': [
    'mobile app development company',
    'iOS Android app development',
    'cross platform mobile app',
    'enterprise mobile app',
    'MVP mobile app development',
    'React Native development',
  ],
};
