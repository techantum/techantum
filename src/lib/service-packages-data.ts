export type DivisionSlug =
  | 'website-development'
  | 'web-application-development'
  | 'mobile-application-development';

export type WebsitePlanSlug = 'launch' | 'growth' | 'enterprise';
export type WebAppPlanSlug = 'accelerate' | 'scale' | 'transform';
export type MobilePlanSlug = 'launch' | 'growth' | 'enterprise';
export type PlanSlug = WebsitePlanSlug | WebAppPlanSlug | MobilePlanSlug;

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
  targetAudience: string[];
  benefits: string[];
  icon: string;
  iconClass: string;
  bgClass: string;
  image: string;
  imageAlt: string;
  plans: ServicePlan[];
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
        name: 'Launch Website',
        tagline: 'Establish your online presence',
        bestFor: 'Startups & Small Businesses',
        description:
          'Ideal for businesses establishing their online presence with a professional, CMS-powered website.',
        scope: 'Up to 5 CMS Pages',
        includes: [
          'Up to 5 Pages',
          'CMS',
          'Mobile Responsive',
          'Contact Forms',
          'Basic SEO Setup',
          'Speed Optimization',
          'SSL Ready',
          'Google Analytics',
          'Social Media Integration',
          'Training',
        ],
        image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085',
        imageAlt: 'Startup business website launch on laptop',
      },
      {
        slug: 'growth',
        name: 'Growth Website',
        tagline: 'Generate leads and grow online',
        bestFor: 'Growing Businesses',
        description:
          'For companies looking to generate leads and improve their online presence with content and conversion tools.',
        scope: 'Up to 10 CMS Pages',
        includes: [
          'Everything in Launch',
          'Up to 10 Pages',
          'Blog',
          'Portfolio',
          'Testimonials',
          'Service Landing Pages',
          'Lead Capture',
          'Enhanced SEO',
          'Performance Optimization',
          'Advanced Forms',
          'Marketing Integrations',
        ],
        highlighted: true,
        image: 'https://images.unsplash.com/photo-1551650975-87deedd944c3',
        imageAlt: 'Growth-focused website with lead capture forms',
      },
      {
        slug: 'enterprise',
        name: 'Enterprise Website',
        tagline: 'Scalable digital platforms',
        bestFor: 'Large Organizations',
        description:
          'For organizations requiring scalable digital platforms with integrations, compliance, and dedicated support.',
        scope: 'Custom Enterprise Website Platform',
        includes: [
          'Unlimited Pages',
          'Custom CMS',
          'Multi-language',
          'Multi-location',
          'Custom Modules',
          'CRM Integration',
          'ERP Integration',
          'HRMS Integration',
          'Workflow Automation',
          'API Integrations',
          'Security Compliance',
          'Analytics Dashboard',
          'High Availability',
          'Advanced SEO',
          'Dedicated Support',
        ],
        image: 'https://images.unsplash.com/photo-1547658719-da2b51169166',
        imageAlt: 'Enterprise website platform dashboard',
      },
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
        bestFor: 'MVP & Startup Products',
        description:
          'Designed for startups and businesses launching digital products quickly to validate ideas in the market.',
        solutions: [
          'Customer Portal',
          'Booking System',
          'CRM Lite',
          'Inventory',
          'Dashboard',
          'Appointment System',
          'Workflow Automation',
          'Admin Panel',
        ],
        features: [
          'Authentication',
          'Role Management',
          'Reports',
          'Email Notifications',
          'Basic Integrations',
          'Cloud Deployment',
        ],
        image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71',
        imageAlt: 'MVP web application dashboard for startups',
      },
      {
        slug: 'scale',
        name: 'Scale',
        tagline: 'Automate multiple departments',
        bestFor: 'Growing Businesses',
        description:
          'For businesses automating multiple departments with approval workflows, payments, and integrations.',
        solutions: [
          'ERP Modules',
          'HRMS',
          'School Management',
          'Healthcare Systems',
          'Property Management',
          'Logistics',
          'Manufacturing',
          'Finance Systems',
        ],
        features: [
          'Multi Roles',
          'Approval Workflows',
          'API Integration',
          'Payment Gateway',
          'Reports',
          'Dashboards',
          'Audit Logs',
          'Automation',
        ],
        highlighted: true,
        image: 'https://images.unsplash.com/photo-1551434678-e076c223a692',
        imageAlt: 'Business automation web application interface',
      },
      {
        slug: 'transform',
        name: 'Transform',
        tagline: 'Enterprise-grade platforms',
        bestFor: 'Enterprise Digital Transformation',
        description:
          'Enterprise-grade platforms for large-scale digital transformation with microservices and high availability.',
        solutions: [
          'SaaS Platforms',
          'Enterprise ERP',
          'Banking',
          'Telecom',
          'Insurance',
          'Government Portals',
          'AI Automation',
          'Workflow Engines',
          'Data Analytics',
        ],
        features: [
          'High Scalability',
          'Microservices',
          'Multi-Tenant',
          'Enterprise Security',
          'SSO',
          'API Gateway',
          'AI Integration',
          'DevOps',
          'High Availability',
          'Disaster Recovery',
        ],
        image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa',
        imageAlt: 'Enterprise digital transformation platform',
      },
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
        bestFor: 'MVP Apps',
        description: 'Android or iOS MVP apps to validate your product idea and reach early users quickly.',
        features: [
          'Android or iOS',
          'Login',
          'Dashboard',
          'Push Notifications',
          'APIs',
          'Admin Panel',
          'App Store Deployment',
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
          'Cross-platform Android and iOS apps with payments, offline support, and CRM integrations.',
        features: [
          'Android + iOS',
          'Cross Platform',
          'Offline Support',
          'Payments',
          'Maps',
          'QR Scanner',
          'Reports',
          'CRM Integration',
          'Analytics',
        ],
        highlighted: true,
        image: 'https://images.unsplash.com/photo-1586717791821-3f44a563fa4c',
        imageAlt: 'Cross-platform business mobile application',
      },
      {
        slug: 'enterprise',
        name: 'Enterprise Mobile',
        tagline: 'Large-scale mobile ecosystems',
        bestFor: 'Enterprise Mobility',
        description:
          'Enterprise mobile solutions with biometric auth, IoT integration, MDM support, and high performance.',
        features: [
          'Enterprise Security',
          'Biometric Authentication',
          'Offline Sync',
          'AI Features',
          'IoT Integration',
          'ERP Integration',
          'Multi-language',
          'Multi-region',
          'Analytics',
          'MDM Support',
          'High Performance',
        ],
        image: 'https://images.unsplash.com/photo-1516116216624-53e697fedbea',
        imageAlt: 'Enterprise mobile application ecosystem',
      },
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
      params.set('service', `Website Development — ${plan.name.replace(' Website', '')}`);
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
