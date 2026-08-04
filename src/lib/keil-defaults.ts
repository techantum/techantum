/** Shared KEIL placeholder defaults for CMS seed content. */

export const KEIL_SERVICE_SLUGS = [
  'warehouse-godowns',
  'industrial-sheds',
  'ec-poultry-sheds',
  'convention-centers',
] as const;

export const defaultIndustriesServed = {
  title: 'Industries We Serve',
  description:
    'KEIL delivers pre-engineered building solutions across diverse sectors that need durable, cost-effective infrastructure.',
  industries: [
    { id: 'ind_manufacturing', name: 'Manufacturing', icon: 'CogIcon', description: 'Factory buildings, production sheds, and storage facilities.' },
    { id: 'ind_logistics', name: 'Logistics & Warehousing', icon: 'TruckIcon', description: 'Godowns, distribution centers, and cold storage structures.' },
    { id: 'ind_agriculture', name: 'Agriculture', icon: 'SparklesIcon', description: 'Poultry sheds, farm storage, and agri-processing buildings.' },
    { id: 'ind_food', name: 'Food Processing', icon: 'ShoppingBagIcon', description: 'Hygienic processing units and temperature-controlled facilities.' },
    { id: 'ind_cold', name: 'Cold Storage', icon: 'CloudIcon', description: 'Insulated warehouses and cold chain infrastructure.' },
    { id: 'ind_commercial', name: 'Commercial Infrastructure', icon: 'BuildingOffice2Icon', description: 'Convention centers, exhibition halls, and commercial complexes.' },
  ],
};

export const defaultCredentialsContent = {
  title: 'Credentials & Recognition',
  description: 'Trusted by leading organizations for quality construction and on-time delivery.',
  clientLogos: [] as { id: string; name: string; logo: string }[],
  majorClients: [] as { id: string; name: string; industry: string }[],
  awards: [] as { id: string; title: string; year: string; description: string }[],
  caseStudies: [] as { id: string; title: string; summary: string; href: string }[],
};

export const defaultWebsiteGoals = {
  primaryObjective: 'Generate qualified construction project enquiries and showcase KEIL capabilities.',
  targetAudience: 'Industrial businesses, logistics operators, poultry farmers, and event/convention organizers.',
  geographicRegions: 'Pan-India with focus on South and Central India.',
  primaryBusinessGoals: 'Increase project enquiries, build brand credibility, and highlight portfolio.',
  expectedActions: ['Submit enquiry form', 'Request quote', 'Phone call', 'WhatsApp message'],
  specialFeatures: 'Lead management, project portfolio gallery, service detail pages, Google Maps integration.',
};

export const defaultSeoMarketingInputs = {
  targetKeywords: [
    'pre-engineered buildings',
    'industrial sheds manufacturer',
    'warehouse construction',
    'poultry shed construction',
    'convention center construction',
    'PEB structures India',
  ],
  targetRegions: 'Hyderabad, Telangana, Andhra Pradesh, Karnataka, Maharashtra',
  competitorWebsites: '',
  existingWebsiteUrl: '',
  googleBusinessProfile: '',
  analyticsNotes: 'Configure GA4 and Search Console in SEO settings once access is provided.',
};

export const defaultLeadPreferences = {
  notificationEmails: 'enquiries@keil.in',
  mandatoryFields: ['name', 'phone', 'service', 'location'],
  optionalFields: ['email', 'company', 'projectTimeline', 'message'],
  workflowNotes:
    'New leads appear in Admin → Leads. Mark as Contacted when followed up, Closed when converted or resolved.',
  departmentRouting: 'Sales & Estimation Team',
};

export const defaultMarketingAssets = {
  checklistNotes:
    'Upload images via Site Content section editors. Store brochures and videos as URLs or upload to media library.',
  materials: [
    { id: 'mat_profile', label: 'Company Profile', status: 'pending' },
    { id: 'mat_brochure', label: 'Corporate Brochure', status: 'pending' },
    { id: 'mat_service_brochures', label: 'Service Brochures', status: 'pending' },
    { id: 'mat_portfolio', label: 'Project Portfolio', status: 'pending' },
    { id: 'mat_project_photos', label: 'High-resolution Project Photos', status: 'pending' },
    { id: 'mat_office', label: 'Office Photographs', status: 'pending' },
    { id: 'mat_team', label: 'Team Photographs', status: 'pending' },
    { id: 'mat_equipment', label: 'Machinery & Equipment Images', status: 'pending' },
    { id: 'mat_drone', label: 'Drone Images / Videos', status: 'pending' },
    { id: 'mat_video', label: 'Corporate Videos', status: 'pending' },
    { id: 'mat_references', label: 'Reference Websites (design inspiration)', status: 'pending' },
  ],
  referenceWebsites: '',
};

export const defaultAboutOverview = {
  introTitle: 'About KEIL',
  introDescription:
    'KEIL is a trusted name in pre-engineered building (PEB) solutions, delivering warehouses, industrial sheds, poultry structures, and convention centers built to last.',
  visionTitle: 'Our Vision',
  visionDescription:
    'To be the most trusted partner for pre-engineered infrastructure — setting benchmarks in quality, speed, and customer satisfaction across India.',
  historyTitle: 'Our Story',
  historyDescription:
    'Built on decades of engineering expertise, KEIL has grown from a regional shed manufacturer to a full-service PEB contractor serving industrial, agricultural, and commercial clients nationwide.',
};

export const defaultAboutUsp = {
  title: 'Why Choose KEIL',
  description: 'What sets us apart in pre-engineered building construction.',
  differentiators: [
    { id: 'usp_1', title: 'Engineering Excellence', description: 'In-house design team using advanced PEB software and proven structural standards.' },
    { id: 'usp_2', title: 'Quality Materials', description: 'Premium-grade steel and components sourced from certified suppliers.' },
    { id: 'usp_3', title: 'Fast Execution', description: 'Pre-fabricated components enable rapid on-site assembly and shorter project timelines.' },
    { id: 'usp_4', title: 'End-to-End Service', description: 'From design and fabrication to erection and handover — single-point accountability.' },
  ],
  experienceYears: '25+',
  achievements: [
    '500+ projects delivered across India',
    'ISO-certified quality management processes',
    'Experienced erection teams with safety-first protocols',
  ],
};
