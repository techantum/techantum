export type DivisionSlug =
  | 'warehouse-godowns'
  | 'industrial-sheds'
  | 'ec-poultry-sheds'
  | 'convention-centers';

export type PlanSlug = string;

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
  overview: string;
  howItWorks: string;
  keyFeatures: string[];
  categories: string[];
  executionProcess: string[];
  targetAudience: string[];
  benefits: string[];
  industriesServed: string[];
  icon: string;
  iconClass: string;
  bgClass: string;
  image: string;
  imageAlt: string;
  plans: ServicePlan[];
  comparisonRows: ComparisonRow[];
}

export const digitalTransformationJourney = [
  'Site Assessment & Planning',
  'Structural Design & Engineering',
  'Material Fabrication',
  'Foundation & Civil Works',
  'PEB Erection & Assembly',
  'Quality Inspection',
  'Handover & Documentation',
  'After-Sales Support',
];

export const salesFunnelSteps = [
  { stage: 'Awareness', action: 'Website Visitor' },
  { stage: 'Interest', action: 'Browse Services & Portfolio' },
  { stage: 'Consideration', action: 'Request Quote / Enquiry' },
  { stage: 'Evaluation', action: 'Site Visit & Requirement Analysis' },
  { stage: 'Proposal', action: 'Technical & Commercial Proposal' },
  { stage: 'Decision', action: 'Contract & Advance' },
  { stage: 'Execution', action: 'Design, Fabrication & Erection' },
  { stage: 'Delivery', action: 'Project Handover' },
  { stage: 'Retention', action: 'Maintenance & Future Projects' },
];

export const leadGenerationPlan = {
  topOfFunnel: {
    title: 'Top of Funnel — Awareness',
    goal: 'Reach industrial and commercial buyers searching for PEB solutions.',
    tactics: [
      'SEO for warehouse & shed keywords',
      'Google Business Profile optimization',
      'Project portfolio showcase',
      'Industry-specific landing pages',
      'Google Ads for high-intent searches',
      'LinkedIn for B2B visibility',
    ],
  },
  middleOfFunnel: {
    title: 'Middle of Funnel — Consideration',
    goal: 'Educate prospects on PEB benefits and KEIL capabilities.',
    tactics: [
      'Service detail pages with process breakdown',
      'Case studies and project galleries',
      'Free site assessment offer',
      'Brochure downloads',
      'WhatsApp follow-ups',
      'Email nurturing for warm leads',
    ],
  },
  bottomOfFunnel: {
    title: 'Bottom of Funnel — Decision',
    goal: 'Convert enquiries into signed construction contracts.',
    tactics: [
      'Detailed BOQ and technical proposals',
      'Site visits and reference projects',
      'Transparent timelines and pricing',
      'Client testimonials and credentials',
      'Fast response within 24 hours',
    ],
  },
};

export const seoKeywordsByDivision: Record<DivisionSlug, string[]> = {
  'warehouse-godowns': [
    'warehouse construction',
    'godown construction',
    'PEB warehouse',
    'storage shed manufacturer',
  ],
  'industrial-sheds': [
    'industrial shed manufacturer',
    'factory shed construction',
    'pre-engineered industrial building',
    'PEB industrial shed',
  ],
  'ec-poultry-sheds': [
    'poultry shed construction',
    'EC poultry shed',
    'broiler shed manufacturer',
    'poultry farm building',
  ],
  'convention-centers': [
    'convention center construction',
    'exhibition hall PEB',
    'large span building',
    'commercial PEB structure',
  ],
};

export const serviceDivisions: ServiceDivision[] = [
  {
    slug: 'warehouse-godowns',
    name: 'Warehouse / Godowns',
    shortName: 'Warehouses',
    eyebrow: 'Storage Solutions',
    title: 'Warehouse & Godown Construction',
    description:
      'Durable, cost-effective pre-engineered warehouses and godowns designed for logistics, manufacturing, and bulk storage operations.',
    marketingMessage: 'Spacious, structurally sound storage buildings delivered on schedule.',
    packagesHeadline: 'Design → Fabricate → Erect → Handover',
    overview:
      'Our warehouse and godown solutions use pre-engineered steel structures for clear spans, high bay storage, and rapid construction — ideal for logistics hubs, distribution centers, and industrial storage.',
    howItWorks:
      'We assess your site and storage requirements, design the optimal PEB layout, fabricate components off-site, and erect the structure with our experienced teams — minimizing disruption and downtime.',
    keyFeatures: [
      'Clear span designs up to large widths',
      'Customizable bay spacing and heights',
      'Loading dock and mezzanine options',
      'Ventilation and insulation provisions',
      'Fire-rated design options',
    ],
    categories: ['Standard Godown', 'Multi-bay Warehouse', 'Logistics Hub', 'Cold Storage Shell'],
    executionProcess: [
      'Requirement gathering & site survey',
      'Structural design & client approval',
      'Foundation & civil works',
      'PEB fabrication & delivery',
      'Erection and quality inspection',
      'Handover with documentation',
    ],
    targetAudience: ['Logistics Companies', 'Manufacturers', 'Wholesalers', '3PL Operators'],
    benefits: [
      'Faster construction vs conventional',
      'Lower lifecycle maintenance cost',
      'Expandable modular design',
      'Engineered for local wind/seismic loads',
    ],
    industriesServed: ['Logistics', 'Manufacturing', 'Retail Distribution', 'Cold Storage'],
    icon: 'BuildingStorefrontIcon',
    iconClass: 'text-primary',
    bgClass: 'bg-primary/10',
    image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d',
    imageAlt: 'Large pre-engineered warehouse structure',
    plans: [],
    comparisonRows: [],
  },
  {
    slug: 'industrial-sheds',
    name: 'Industrial Sheds',
    shortName: 'Industrial Sheds',
    eyebrow: 'Industrial Buildings',
    title: 'Industrial Shed Construction',
    description:
      'Robust pre-engineered industrial sheds for factories, workshops, processing plants, and heavy-duty manufacturing operations.',
    marketingMessage: 'Heavy-duty industrial sheds built for productivity and long-term performance.',
    packagesHeadline: 'Design → Fabricate → Erect → Handover',
    overview:
      'KEIL industrial sheds combine structural strength with flexible layouts — supporting cranes, heavy equipment, and future expansion for growing manufacturing businesses.',
    howItWorks:
      'From load calculations to crane beam integration, we engineer each shed for your operational needs, fabricate at our facility, and complete erection with strict safety and quality protocols.',
    keyFeatures: [
      'Crane-compatible structures',
      'Heavy-duty flooring connections',
      'Natural lighting & ventilation',
      'Office-warehouse combinations',
      'Future expansion provisions',
    ],
    categories: ['Factory Shed', 'Workshop Building', 'Processing Plant Shell', 'Multi-unit Industrial Park'],
    executionProcess: [
      'Operational requirement study',
      'Structural & MEP coordination',
      'Foundation design',
      'Fabrication & galvanizing',
      'Erection & commissioning support',
      'Final inspection & handover',
    ],
    targetAudience: ['Manufacturers', 'Engineering Units', 'Auto Ancillaries', 'Industrial Parks'],
    benefits: [
      'Optimized for heavy loads',
      'Quick occupancy timeline',
      'Custom crane and door specifications',
      'Compliance with industrial standards',
    ],
    industriesServed: ['Manufacturing', 'Engineering', 'Automotive', 'Industrial Infrastructure'],
    icon: 'BuildingOffice2Icon',
    iconClass: 'text-secondary',
    bgClass: 'bg-secondary/10',
    image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd',
    imageAlt: 'Industrial manufacturing shed under construction',
    plans: [],
    comparisonRows: [],
  },
  {
    slug: 'ec-poultry-sheds',
    name: 'EC Poultry Sheds',
    shortName: 'Poultry Sheds',
    eyebrow: 'Agricultural Structures',
    title: 'EC Poultry Shed Construction',
    description:
      'Environment-controlled (EC) poultry sheds engineered for broiler, layer, and hatchery operations with optimal ventilation and biosecurity.',
    marketingMessage: 'Specialized poultry buildings designed for productivity and bird welfare.',
    packagesHeadline: 'Design → Fabricate → Erect → Handover',
    overview:
      'Our EC poultry sheds integrate structural PEB design with ventilation, insulation, and layout planning tailored for modern poultry farming standards.',
    howItWorks:
      'We collaborate on flock capacity, climate control needs, and equipment layout, then deliver a turnkey shed structure ready for poultry equipment installation.',
    keyFeatures: [
      'EC-compatible structural design',
      'Optimized span for ventilation systems',
      'Insulated panel-ready structures',
      'Biosecurity-friendly layouts',
      'Scalable multi-shed farm designs',
    ],
    categories: ['Broiler Shed', 'Layer Shed', 'Hatchery Building', 'Feed Storage Unit'],
    executionProcess: [
      'Farm capacity planning',
      'EC layout & structural design',
      'Civil & drainage works',
      'PEB erection',
      'Coordination with equipment vendors',
      'Handover & farmer training support',
    ],
    targetAudience: ['Poultry Farmers', 'Agri Entrepreneurs', 'Contract Farming Companies'],
    benefits: [
      'Designed for Indian climate conditions',
      'Faster farm setup',
      'Lower structural maintenance',
      'Expandable farm layouts',
    ],
    industriesServed: ['Agriculture', 'Poultry Farming', 'Food Processing'],
    icon: 'HomeModernIcon',
    iconClass: 'text-accent',
    bgClass: 'bg-accent/10',
    image: 'https://images.unsplash.com/photo-1548550020-6cfc8c307a05',
    imageAlt: 'Modern poultry farm building structure',
    plans: [],
    comparisonRows: [],
  },
  {
    slug: 'convention-centers',
    name: 'Convention Centers',
    shortName: 'Convention Centers',
    eyebrow: 'Commercial Structures',
    title: 'Convention Center Construction',
    description:
      'Large-span pre-engineered convention centers and exhibition halls for events, trade shows, and commercial gatherings.',
    marketingMessage: 'Impressive large-span venues built with speed and structural elegance.',
    packagesHeadline: 'Design → Fabricate → Erect → Handover',
    overview:
      'KEIL convention center solutions deliver column-free large spans, high ceilings, and flexible floor plans for exhibitions, conferences, and multi-purpose commercial use.',
    howItWorks:
      'We work with architects and event planners on span requirements, acoustics considerations, and services integration — delivering a PEB shell ready for interior fit-out.',
    keyFeatures: [
      'Large clear spans',
      'High eave heights',
      'Multiple entry and loading points',
      'Future partition flexibility',
      'Premium finish options',
    ],
    categories: ['Exhibition Hall', 'Convention Center', 'Multipurpose Arena', 'Community Hall'],
    executionProcess: [
      'Concept & span planning',
      'Architectural coordination',
      'Structural engineering',
      'Fabrication & logistics',
      'Erection in phases if required',
      'Handover for fit-out',
    ],
    targetAudience: ['Event Organizers', 'Commercial Developers', 'Institutions', 'Government Bodies'],
    benefits: [
      'Column-free event spaces',
      'Shorter construction timelines',
      'Cost-effective large spans',
      'Designed for heavy footfall',
    ],
    industriesServed: ['Commercial Infrastructure', 'Hospitality', 'Events', 'Institutional'],
    icon: 'BuildingLibraryIcon',
    iconClass: 'text-primary',
    bgClass: 'bg-primary/10',
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87',
    imageAlt: 'Large convention center interior space',
    plans: [],
    comparisonRows: [],
  },
];

export function getDivision(slug: string): ServiceDivision | undefined {
  return serviceDivisions.find((d) => d.slug === slug);
}

export function getPlan(_divisionSlug: string, _planSlug: string): ServicePlan | undefined {
  return undefined;
}

export function getDivisionPath(slug: DivisionSlug): string {
  return `/services/${slug}`;
}

export function getPlanPath(divisionSlug: DivisionSlug, planSlug: PlanSlug): string {
  return `/services/${divisionSlug}/${planSlug}`;
}

export function getContactHref(division: ServiceDivision, _plan?: ServicePlan): string {
  const params = new URLSearchParams();
  params.set('service', division.name);
  return `/contact?${params.toString()}`;
}

export const allDivisionSlugs = serviceDivisions.map((d) => d.slug) as DivisionSlug[];

export const allPlanPaths: { division: DivisionSlug; plan: PlanSlug }[] = [];

export function getPlanComparisonRows(_division: ServiceDivision): ComparisonRow[] {
  return [];
}
