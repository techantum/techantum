/** Maps the UI/UX design questionnaire to CMS keys and admin routes. */
export interface ContentBriefSection {
  id: number;
  title: string;
  description: string;
  checklist: string[];
  cmsKeys: string[];
  adminHref?: string;
}

export const CONTENT_BRIEF_SECTIONS: ContentBriefSection[] = [
  {
    id: 1,
    title: 'Company Overview',
    description: 'Introduction, vision, mission, core values, and company history.',
    checklist: [
      'Brief company introduction',
      'Company vision',
      'Company mission',
      'Core values',
      'Company history / background',
    ],
    cmsKeys: ['about.hero', 'about.page', 'about.overview'],
    adminHref: '/admin/content',
  },
  {
    id: 2,
    title: 'Services Offered',
    description: 'Website Development, Web Applications, and Mobile Applications.',
    checklist: [
      'Confirm service list',
      'Service overview per offering',
      'How each service works',
      'Key features and benefits',
      'Industries / customer segments served',
      'Project execution process',
    ],
    cmsKeys: ['services.hero', 'services.page', 'homepage.services'],
    adminHref: '/admin/content',
  },
  {
    id: 3,
    title: 'Unique Selling Proposition (USP)',
    description: 'Differentiators, strengths, experience, certifications, and achievements.',
    checklist: [
      'What makes Techantum Solutions different',
      'Why customers should choose Techantum Solutions',
      'Years of experience',
      'Quality standards & certifications',
      'Development methodologies',
      'Major achievements & landmark projects',
    ],
    cmsKeys: ['about.usp', 'about.page'],
    adminHref: '/admin/content',
  },
  {
    id: 4,
    title: 'Projects & Portfolio',
    description: 'Completed and ongoing projects with photos and highlights.',
    checklist: [
      'Project name, location, category',
      'Description and key highlights',
      'Completion year & status',
      'High-resolution photographs',
      'Client name (if permitted)',
    ],
    cmsKeys: ['portfolio.hero', 'portfolio.data', 'portfolio.cta'],
    adminHref: '/admin/content',
  },
  {
    id: 5,
    title: 'Industries Served',
    description: 'Manufacturing, logistics, agriculture, food processing, and more.',
    checklist: [
      'Primary industries list',
      'Industry-specific messaging',
    ],
    cmsKeys: ['industries.served', 'portfolio.data'],
    adminHref: '/admin/content',
  },
  {
    id: 6,
    title: 'Client Testimonials & Credentials',
    description: 'Testimonials, client logos, awards, and certifications.',
    checklist: [
      'Customer testimonials',
      'Client logos',
      'Major clients list',
      'Success stories / case studies',
      'Awards & recognitions',
    ],
    cmsKeys: ['testimonials.page', 'testimonials.hero', 'credentials.page', 'homepage.testimonials'],
    adminHref: '/admin/content',
  },
  {
    id: 7,
    title: 'Contact Information',
    description: 'Office address, branches, phone, email, maps, hours, and social links.',
    checklist: [
      'Registered / corporate office',
      'Branch locations',
      'Phone & email',
      'Google Maps location',
      'Business working hours',
      'Social media links',
    ],
    cmsKeys: ['contact.hero', 'contact.page'],
    adminHref: '/admin/content',
  },
  {
    id: 8,
    title: 'Branding Assets',
    description: 'Logo, colors, fonts, and brand tagline.',
    checklist: [
      'Company logo (SVG/PNG/PDF)',
      'Brand guidelines',
      'Preferred colors & fonts',
      'Brand tagline',
    ],
    cmsKeys: [],
    adminHref: '/admin/branding',
  },
  {
    id: 9,
    title: 'Website Goals',
    description: 'Objectives, target audience, regions, and expected customer actions.',
    checklist: [
      'Primary website objective',
      'Target audience',
      'Geographic regions served',
      'Expected customer actions (enquiry, quote, call)',
      'Special features or functionality',
    ],
    cmsKeys: ['company.website_goals'],
    adminHref: '/admin/content',
  },
  {
    id: 10,
    title: 'SEO & Digital Marketing',
    description: 'Keywords, target regions, competitors, and analytics access.',
    checklist: [
      'Target keywords',
      'Target cities / states / regions',
      'Competitor websites',
      'Existing website URL',
      'Google Business Profile',
      'Analytics & Search Console access',
    ],
    cmsKeys: ['company.seo_marketing'],
    adminHref: '/admin/seo',
  },
  {
    id: 11,
    title: 'Lead Management Preferences',
    description: 'Form fields, mandatory info, notification emails, and workflow.',
    checklist: [
      'Preferred enquiry form fields',
      'Mandatory information to capture',
      'Notification email addresses',
      'Team / department routing',
      'Lead handling workflow',
    ],
    cmsKeys: ['company.lead_preferences', 'contact.page'],
    adminHref: '/admin/content',
  },
  {
    id: 12,
    title: 'Images & Marketing Collateral',
    description: 'Brochures, portfolio photos, team images, videos, and design references.',
    checklist: [
      'Company profile & brochures',
      'Project portfolio photos',
      'Office & team photographs',
      'Machinery & equipment images',
      'Drone images / corporate videos',
      'Reference websites for design inspiration',
    ],
    cmsKeys: ['company.marketing_assets'],
    adminHref: '/admin/content',
  },
];

export function getBriefCompletion(
  filledKeys: Set<string>,
  brandingComplete: boolean
): { filled: number; total: number; percent: number } {
  let filled = 0;
  let total = CONTENT_BRIEF_SECTIONS.length;

  for (const section of CONTENT_BRIEF_SECTIONS) {
    if (section.id === 8) {
      if (brandingComplete) filled++;
      continue;
    }
    if (section.cmsKeys.length === 0) continue;
    const hasAny = section.cmsKeys.some((key) => filledKeys.has(key));
    if (hasAny) filled++;
  }

  return { filled, total, percent: Math.round((filled / total) * 100) };
}
