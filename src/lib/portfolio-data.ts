export interface PortfolioProject {
  id: string;
  name: string;
  url: string;
  industry: string;
  category: string;
  description: string;
  tags: string[];
  featured?: boolean;
}

export const industries = [
  { id: 'ind_b2b', name: 'B2B', icon: 'BuildingOffice2Icon' },
  { id: 'ind_finance', name: 'Finance', icon: 'BanknotesIcon' },
  { id: 'ind_education', name: 'Education', icon: 'AcademicCapIcon' },
  { id: 'ind_healthcare', name: 'Healthcare', icon: 'HeartIcon' },
  { id: 'ind_fitness', name: 'Fitness', icon: 'FireIcon' },
  { id: 'ind_realestate', name: 'Real Estate', icon: 'HomeModernIcon' },
  { id: 'ind_pharma', name: 'Pharma', icon: 'BeakerIcon' },
  { id: 'ind_industrial', name: 'Industrial', icon: 'WrenchScrewdriverIcon' },
  { id: 'ind_infrastructure', name: 'Infrastructure', icon: 'BuildingLibraryIcon' },
  { id: 'ind_mining', name: 'Mining', icon: 'CubeIcon' },
  { id: 'ind_food', name: 'Food & Beverage', icon: 'ShoppingBagIcon' },
];

export const featuredProjects: PortfolioProject[] = [
  {
    id: 'proj_agency_scouting',
    name: 'Agency Scouting',
    url: 'https://agencyscouting.com/',
    industry: 'B2B',
    category: 'B2B Marketplace',
    description:
      'A modern B2B service marketplace connecting businesses with agencies and service providers. Includes agency onboarding, proposal workflows, client dashboards, and scalable admin management.',
    tags: ['Marketplace', 'B2B', 'SaaS', 'Admin Dashboard'],
    featured: true,
  },
  {
    id: 'proj_mycashledger',
    name: 'MyCashLedger',
    url: 'https://mycashledger.com/',
    industry: 'Finance',
    category: 'Financial SaaS',
    description:
      'A comprehensive SaaS platform for financial operations, business management, and workflow tracking with reporting dashboards, expense tracking, and role-based access.',
    tags: ['SaaS', 'Finance', 'Analytics', 'Operations'],
    featured: true,
  },
  {
    id: 'proj_ziply5',
    name: 'Ziply5',
    url: 'https://ziply5.com',
    industry: 'Food & Beverage',
    category: 'E-Commerce',
    description:
      'High-performance website for a Ready-to-Eat food brand with premium design, mobile-first experience, product storytelling, CMS integration, and SEO optimization.',
    tags: ['E-Commerce', 'UI/UX', 'CMS', 'SEO'],
    featured: true,
  },
];

export const industryProjectGroups = [
  {
    id: 'group_education',
    title: 'Education',
    subtitle: 'Technology and learning platforms built for student engagement and lead generation.',
    projects: [
      {
        id: 'proj_prantek',
        name: 'Prantek',
        url: 'https://prantek.com',
        description: 'Technology and education-focused digital platform.',
        tags: ['Education', 'Web Platform'],
      },
      {
        id: 'proj_edu_global',
        name: 'Edu Global Careers',
        url: 'https://eduglobalcareers.com',
        description: 'International education and career guidance platform.',
        tags: ['Education', 'Career Guidance'],
      },
      {
        id: 'proj_vijanaar',
        name: 'Vijanaar',
        url: 'https://vijanaar.com',
        description: 'Modern educational platform with a student-centric experience.',
        tags: ['Education', 'UI/UX'],
      },
    ],
  },
  {
    id: 'group_healthcare_fitness',
    title: 'Healthcare & Fitness',
    subtitle: 'Patient engagement, service awareness, and academy program promotion.',
    projects: [
      {
        id: 'proj_laparoscopy',
        name: 'Laparoscopy & Laser Clinics',
        url: 'https://laparoscopyandlaserclinics.com',
        description: 'Professional healthcare website with appointment inquiry workflows and SEO structure.',
        tags: ['Healthcare', 'SEO'],
      },
      {
        id: 'proj_rock_martial',
        name: 'Rock Martial Arts Academy',
        url: 'https://rockmartialartsacademy.com',
        description: 'Fitness and training platform to promote academy programs, memberships, and events.',
        tags: ['Fitness', 'Events'],
      },
    ],
  },
  {
    id: 'group_realestate',
    title: 'Real Estate',
    subtitle: 'Property showcase and high-conversion lead generation platforms.',
    projects: [
      {
        id: 'proj_happy_homes',
        name: 'Happy Homes Germany',
        url: 'https://happyhomes-germany.de',
        description: 'Modern real estate platform for property showcase and lead generation.',
        tags: ['Real Estate', 'Lead Generation'],
      },
      {
        id: 'proj_ahladahomes',
        name: 'Ahlada Homes',
        url: 'https://ahladahomes.com',
        description: 'Real estate and housing solutions platform with high-conversion landing structures.',
        tags: ['Real Estate', 'Landing Pages'],
      },
    ],
  },
  {
    id: 'group_pharma',
    title: 'Pharma',
    subtitle: 'Corporate pharmaceutical presence with regulatory-friendly structure.',
    projects: [
      {
        id: 'proj_aurevion',
        name: 'Aurevion Pharma',
        url: 'https://aurevionpharma.com',
        description: 'Corporate pharmaceutical website with professional branding and product information management.',
        tags: ['Pharma', 'Corporate'],
      },
    ],
  },
  {
    id: 'group_industrial',
    title: 'Industrial',
    subtitle: 'Manufacturing and engineering platforms with product showcase and inquiry workflows.',
    projects: [
      {
        id: 'proj_kk_engineering',
        name: 'KK Engineering',
        url: 'https://kkengineering.in',
        description: 'Industrial engineering and manufacturing-focused digital platform.',
        tags: ['Industrial', 'Manufacturing'],
      },
    ],
  },
  {
    id: 'group_infrastructure_mining',
    title: 'Infrastructure & Mining',
    subtitle: 'Corporate web presence with industry-specific content architecture.',
    projects: [
      {
        id: 'proj_kisan_plant',
        name: 'Kisan Plant Technology',
        url: 'https://kisanplant.technology',
        description: 'Infrastructure and technology-driven platform with modern architecture and lead generation.',
        tags: ['Infrastructure', 'Technology'],
      },
      {
        id: 'proj_skc_mines',
        name: 'SKC Mines',
        url: 'https://skcmines.com',
        description: 'Corporate mining and infrastructure-focused web presence with mobile-first responsive design.',
        tags: ['Mining', 'Corporate'],
      },
    ],
  },
];
