/** Shared TechAntum defaults for CMS seed content. */

export const TECHANTUM_SERVICE_SLUGS = [
  'website-development',
  'web-application-development',
  'mobile-application-development',
] as const;

export const defaultIndustriesServed = {
  title: 'Industries We Serve',
  description:
    'TechAntum partners with organizations across sectors that need reliable websites, web applications, and mobile products.',
  industries: [
    { id: 'ind_saas', name: 'SaaS & Technology', icon: 'CodeBracketIcon', description: 'Product websites, customer portals, and admin dashboards for software companies.' },
    { id: 'ind_ecommerce', name: 'E-Commerce & Retail', icon: 'ShoppingBagIcon', description: 'Online stores, catalog platforms, and order management systems.' },
    { id: 'ind_fintech', name: 'FinTech & Finance', icon: 'BanknotesIcon', description: 'Secure web apps, reporting dashboards, and customer-facing platforms.' },
    { id: 'ind_healthcare', name: 'Healthcare', icon: 'HeartIcon', description: 'Patient portals, booking systems, and compliant digital experiences.' },
    { id: 'ind_logistics', name: 'Logistics & Operations', icon: 'TruckIcon', description: 'Tracking tools, internal workflows, and field-ready mobile apps.' },
    { id: 'ind_professional', name: 'Professional Services', icon: 'BuildingOffice2Icon', description: 'Corporate websites and lead-generation platforms for B2B firms.' },
  ],
};

export const defaultCredentialsContent = {
  title: 'Credentials & Recognition',
  description: 'Trusted by growing businesses for quality engineering and dependable delivery.',
  clientLogos: [] as { id: string; name: string; logo: string }[],
  majorClients: [] as { id: string; name: string; industry: string }[],
  awards: [] as { id: string; title: string; year: string; description: string }[],
  caseStudies: [] as { id: string; title: string; summary: string; href: string }[],
};

export const defaultWebsiteGoals = {
  primaryObjective: 'Generate qualified digital project enquiries and showcase TechAntum service capabilities.',
  targetAudience: 'Business owners, product teams, and decision-makers seeking website, web app, or mobile development.',
  geographicRegions: 'India, Germany, and the United States.',
  primaryBusinessGoals: 'Increase project enquiries, communicate service expertise, and highlight portfolio work.',
  expectedActions: ['Submit enquiry form', 'Request consultation', 'Email sales', 'Schedule a call'],
  specialFeatures: 'Lead management, service detail pages, portfolio showcase, CMS-backed content management.',
};

export const defaultSeoMarketingInputs = {
  targetKeywords: [
    'website development company',
    'custom web application development',
    'mobile app development',
    'Next.js development agency',
    'React development services',
    'TechAntum',
  ],
  targetRegions: 'India, Germany, United States',
  competitorWebsites: '',
  existingWebsiteUrl: '',
  googleBusinessProfile: '',
  analyticsNotes: 'Configure GA4 and Search Console in SEO settings once access is provided.',
};

export const defaultLeadPreferences = {
  notificationEmails: 'info@techantum.com',
  mandatoryFields: ['name', 'email', 'phone', 'service', 'country'],
  optionalFields: ['company', 'timeline', 'message'],
  workflowNotes:
    'New leads appear in Admin → Leads. Mark as Contacted when followed up, Closed when converted or resolved.',
  departmentRouting: 'Sales & Delivery Team',
};

export const defaultMarketingAssets = {
  checklistNotes:
    'Upload images via Site Content section editors. Store brochures and videos as URLs or upload to media library.',
  materials: [
    { id: 'mat_profile', label: 'Company Profile', status: 'pending' },
    { id: 'mat_brochure', label: 'Corporate Brochure', status: 'pending' },
    { id: 'mat_service_brochures', label: 'Service Brochures', status: 'pending' },
    { id: 'mat_portfolio', label: 'Portfolio Case Studies', status: 'pending' },
    { id: 'mat_project_screens', label: 'Project Screenshots', status: 'pending' },
    { id: 'mat_office', label: 'Office Photographs', status: 'pending' },
    { id: 'mat_team', label: 'Team Photographs', status: 'pending' },
    { id: 'mat_video', label: 'Corporate Videos', status: 'pending' },
    { id: 'mat_references', label: 'Reference Websites (design inspiration)', status: 'pending' },
  ],
  referenceWebsites: '',
};

export const defaultAboutOverview = {
  introTitle: 'About TechAntum',
  introDescription:
    'TechAntum is a digital development partner specializing in websites, web applications, and mobile apps for businesses in India, Germany, and the United States.',
  visionTitle: 'Our Vision',
  visionDescription:
    'To help organizations build dependable digital products that improve customer experience, streamline operations, and support long-term growth.',
  historyTitle: 'Our Story',
  historyDescription:
    'Founded to bridge business goals and modern engineering, TechAntum has grown into a focused team delivering end-to-end digital solutions from discovery through launch and support.',
};

export const defaultAboutUsp = {
  title: 'Why Choose TechAntum',
  description: 'What sets us apart as a software development partner.',
  differentiators: [
    { id: 'usp_1', title: 'Service-Focused Delivery', description: 'Clear scope, structured milestones, and dedicated communication throughout each engagement.' },
    { id: 'usp_2', title: 'Modern Engineering Stack', description: 'React, Next.js, TypeScript, Node.js, and cloud-native architecture chosen for performance and maintainability.' },
    { id: 'usp_3', title: 'Business-Aligned Design', description: 'Interfaces and workflows designed around conversion, usability, and operational efficiency.' },
    { id: 'usp_4', title: 'End-to-End Support', description: 'From strategy and design to development, deployment, and post-launch maintenance.' },
  ],
  experienceYears: '8+',
  achievements: [
    '150+ digital projects delivered',
    'Clients across India, Germany, and the United States',
    'Dedicated teams for websites, web apps, and mobile applications',
  ],
};
