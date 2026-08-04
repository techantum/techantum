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
  { id: 'ind_manufacturing', name: 'Manufacturing', icon: 'CogIcon' },
  { id: 'ind_logistics', name: 'Logistics', icon: 'TruckIcon' },
  { id: 'ind_agriculture', name: 'Agriculture', icon: 'SparklesIcon' },
  { id: 'ind_food', name: 'Food Processing', icon: 'ShoppingBagIcon' },
  { id: 'ind_cold', name: 'Cold Storage', icon: 'CloudIcon' },
  { id: 'ind_commercial', name: 'Commercial', icon: 'BuildingOffice2Icon' },
  { id: 'ind_industrial', name: 'Industrial', icon: 'WrenchScrewdriverIcon' },
  { id: 'ind_infrastructure', name: 'Infrastructure', icon: 'BuildingLibraryIcon' },
];

export const featuredProjects: PortfolioProject[] = [
  {
    id: 'proj_wh_1',
    name: 'Logistics Warehouse — Hyderabad',
    location: 'Hyderabad, Telangana',
    status: 'completed',
    industry: 'Logistics',
    category: 'Warehouse / Godown',
    description:
      '15,000 sq.ft pre-engineered warehouse with loading docks, office block, and ventilation systems for a regional logistics operator.',
    highlights: 'Clear span 40m, completed in 90 days, turnkey PEB delivery.',
    completionYear: '2025',
    image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d',
    imageAlt: 'Completed logistics warehouse project',
    tags: ['Warehouse', 'PEB', 'Logistics'],
    featured: true,
  },
  {
    id: 'proj_ind_1',
    name: 'Manufacturing Shed — Karnataka',
    location: 'Bengaluru, Karnataka',
    status: 'completed',
    industry: 'Manufacturing',
    category: 'Industrial Shed',
    description:
      'Heavy-duty industrial shed with crane beam provisions and 12m eave height for an auto components manufacturer.',
    highlights: '20T EOT crane provision, insulated roofing, expansion-ready design.',
    completionYear: '2024',
    image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd',
    imageAlt: 'Industrial manufacturing shed project',
    tags: ['Industrial', 'Manufacturing', 'PEB'],
    featured: true,
  },
  {
    id: 'proj_poultry_1',
    name: 'EC Poultry Farm — Andhra Pradesh',
    location: 'Guntur, Andhra Pradesh',
    status: 'ongoing',
    industry: 'Agriculture',
    category: 'EC Poultry Shed',
    description:
      'Environment-controlled poultry shed complex with four broiler units and integrated feed storage.',
    highlights: '4-shed layout, EC-ready structure, biosecurity-focused design.',
    completionYear: '2026',
    image: 'https://images.unsplash.com/photo-1548550020-6cfc8c307a05',
    imageAlt: 'Poultry farm building project',
    tags: ['Poultry', 'Agriculture', 'EC Shed'],
    featured: true,
  },
];

export const industryProjectGroups = [
  {
    id: 'group_warehouse',
    title: 'Warehouses & Godowns',
    subtitle: 'Storage and logistics infrastructure projects.',
    projects: [
      {
        id: 'proj_wh_2',
        name: 'Distribution Center',
        location: 'Pune, Maharashtra',
        description: 'Multi-bay godown for FMCG distribution.',
        tags: ['Godown', 'Logistics'],
      },
    ],
  },
  {
    id: 'group_industrial',
    title: 'Industrial Sheds',
    subtitle: 'Factory and workshop buildings.',
    projects: [
      {
        id: 'proj_ind_2',
        name: 'Engineering Workshop',
        location: 'Chennai, Tamil Nadu',
        description: 'PEB workshop with overhead crane integration.',
        tags: ['Industrial', 'Workshop'],
      },
    ],
  },
];
