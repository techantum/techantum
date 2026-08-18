export interface PortfolioProject {
  id: string;
  name: string;
  url?: string;
  location?: string;
  status?: 'completed' | 'ongoing';
  industry: string;
  category: string;
  description: string;
  highlights?: string;
  completionYear?: string;
  clientName?: string;
  image?: string;
  imageAlt?: string;
  tags: string[];
  featured?: boolean;
}

export const industries = [
  { id: 'ind_saas', name: 'SaaS & Technology', icon: 'CodeBracketIcon' },
  { id: 'ind_ecommerce', name: 'E-Commerce', icon: 'ShoppingBagIcon' },
  { id: 'ind_fintech', name: 'FinTech', icon: 'BanknotesIcon' },
  { id: 'ind_healthcare', name: 'Healthcare', icon: 'HeartIcon' },
  { id: 'ind_logistics', name: 'Logistics', icon: 'TruckIcon' },
  { id: 'ind_professional', name: 'Professional Services', icon: 'BuildingOffice2Icon' },
];

export const featuredProjects: PortfolioProject[] = [
  {
    id: 'proj_web_1',
    name: 'Corporate Website — Schmidt Digital GmbH',
    location: 'Germany',
    status: 'completed',
    industry: 'Professional Services',
    category: 'Website Development',
    description:
      'Corporate website redesign with CMS integration, lead capture, and performance optimization for a B2B services firm.',
    highlights: '40% increase in inbound enquiries within 30 days of launch.',
    completionYear: '2025',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f',
    imageAlt: 'Corporate website project for a German client',
    tags: ['Website', 'Next.js', 'CMS'],
    featured: true,
  },
  {
    id: 'proj_app_1',
    name: 'SaaS Operations Dashboard — Chen Analytics',
    location: 'United States',
    status: 'completed',
    industry: 'SaaS & Technology',
    category: 'Web Application Development',
    description:
      'Custom analytics dashboard with role-based access, data visualization, and API integrations for a US-based SaaS company.',
    highlights: 'Handles thousands of daily transactions with sub-second load times.',
    completionYear: '2024',
    image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c',
    imageAlt: 'Web application dashboard project',
    tags: ['Web App', 'React', 'SaaS'],
    featured: true,
  },
  {
    id: 'proj_mobile_1',
    name: 'E-Commerce Mobile App — Nova Retail India',
    location: 'India',
    status: 'completed',
    industry: 'E-Commerce',
    category: 'Mobile Application Development',
    description:
      'Cross-platform mobile application with product catalog, checkout, and order tracking for an Indian retail brand.',
    highlights: 'Launched on iOS and Android with a unified React Native codebase.',
    completionYear: '2025',
    image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c',
    imageAlt: 'Mobile e-commerce application project',
    tags: ['Mobile', 'React Native', 'E-Commerce'],
    featured: true,
  },
];

export const industryProjectGroups = [
  {
    id: 'group_websites',
    title: 'Website Development',
    subtitle: 'Corporate sites, landing pages, and CMS-powered platforms.',
    projects: [
      {
        id: 'proj_web_2',
        name: 'B2B Lead Generation Site',
        location: 'Germany',
        description: 'Conversion-focused corporate website with CRM integration.',
        tags: ['Website', 'Lead Gen'],
      },
    ],
  },
  {
    id: 'group_webapps',
    title: 'Web Applications',
    subtitle: 'Custom business platforms and SaaS products.',
    projects: [
      {
        id: 'proj_app_2',
        name: 'Client Portal Platform',
        location: 'United States',
        description: 'Secure customer portal with document management and reporting.',
        tags: ['Web App', 'Portal'],
      },
    ],
  },
];
