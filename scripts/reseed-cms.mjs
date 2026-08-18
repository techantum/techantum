/**
 * Reseed CMS database with Techantum Solutions content.
 * Run: node scripts/reseed-cms.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv() {
  const text = readFileSync(join(root, '.env'), 'utf8');
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    let value = trimmed.slice(eq + 1);
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

const defaultIndustriesServed = {
  title: 'Industries We Serve',
  description:
    'Techantum Solutions delivers custom websites, web applications, and mobile apps for businesses across diverse sectors.',
  industries: [
    { id: 'ind_b2b', name: 'B2B & SaaS', icon: 'BuildingOffice2Icon', description: 'Marketplaces, dashboards, and enterprise platforms.' },
    { id: 'ind_finance', name: 'Finance', icon: 'BanknotesIcon', description: 'Fintech apps, reporting tools, and secure transaction systems.' },
    { id: 'ind_healthcare', name: 'Healthcare', icon: 'HeartIcon', description: 'Patient portals, clinic websites, and healthcare workflows.' },
    { id: 'ind_education', name: 'Education', icon: 'AcademicCapIcon', description: 'Learning platforms, career portals, and student engagement tools.' },
    { id: 'ind_realestate', name: 'Real Estate', icon: 'HomeModernIcon', description: 'Property showcases, lead generation, and CRM integrations.' },
    { id: 'ind_ecommerce', name: 'E-Commerce', icon: 'ShoppingBagIcon', description: 'Online stores, product catalogs, and conversion-focused sites.' },
  ],
};

const defaultWebsiteGoals = {
  primaryObjective: 'Generate qualified project enquiries and showcase Techantum Solutions capabilities.',
  targetAudience: 'Startups, SMEs, and enterprises seeking websites, web apps, and mobile applications.',
  geographicRegions: 'India, Germany, and the United States.',
  primaryBusinessGoals: 'Increase project enquiries, build brand credibility, and highlight portfolio.',
  expectedActions: ['Submit enquiry form', 'Request quote', 'Schedule consultation', 'WhatsApp message'],
  specialFeatures: 'Lead management, project portfolio, service detail pages, client requirement portal.',
};

const defaultSeoMarketingInputs = {
  targetKeywords: [
    'website development company',
    'web application development',
    'mobile app development',
    'custom software development',
    'SaaS development',
    'IT services India',
  ],
  targetRegions: 'India, Germany, United States',
  competitorWebsites: '',
  existingWebsiteUrl: '',
  googleBusinessProfile: '',
  analyticsNotes: 'Configure GA4 and Search Console in SEO settings once access is provided.',
};

const defaultLeadPreferences = {
  notificationEmails: 'info@techantum.com',
  mandatoryFields: ['name', 'email', 'service', 'message'],
  optionalFields: ['phone', 'company', 'projectTimeline', 'budget'],
  workflowNotes:
    'New leads appear in Admin → Leads. Mark as Contacted when followed up, Closed when converted or resolved.',
  departmentRouting: 'Sales & Project Team',
};

const defaultAboutOverview = {
  introTitle: 'About Techantum Solutions',
  introDescription:
    'Techantum Solutions is a trusted IT partner specializing in website development, custom web applications, and mobile apps — helping businesses grow with reliable, scalable digital products.',
  visionTitle: 'Our Vision',
  visionDescription:
    'To be the most trusted technology partner for businesses in India, Germany, and the United States — setting benchmarks in quality, innovation, and client satisfaction.',
  historyTitle: 'Our Story',
  historyDescription:
    'Founded in Hyderabad, Techantum Solutions has grown from a web development studio into a full-service IT company, delivering 150+ digital products for clients across three continents.',
};

const defaultAboutUsp = {
  title: 'Why Choose Techantum Solutions',
  description: 'What sets us apart in software development and digital product delivery.',
  differentiators: [
    { id: 'usp_1', title: 'Full-Stack Expertise', description: 'End-to-end development — from UI/UX design to deployment and ongoing support.' },
    { id: 'usp_2', title: 'Modern Technology', description: 'React, Next.js, TypeScript, Node.js, React Native, and cloud-native architectures.' },
    { id: 'usp_3', title: 'Agile Delivery', description: 'Iterative development with regular demos, clear milestones, and transparent progress.' },
    { id: 'usp_4', title: 'Long-Term Partnership', description: "Post-launch maintenance, updates, and dedicated support for your product's success." },
  ],
  experienceYears: '8+',
  achievements: [
    '150+ projects delivered across India, Germany, and the USA',
    'Expertise in websites, web apps, SaaS platforms, and mobile applications',
    'Dedicated teams with security-first development practices',
  ],
};

loadEnv();

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !secretKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(url, secretKey);

const defaultBranding = {
  company_name: 'Techantum Solutions',
  tagline: 'Website, Web App & Mobile Development',
  logo_url: null,
  footer_logo_url: null,
  favicon_url: null,
  logo_letter: 'T',
  phone: '+91 40 0000 0000',
  phone_href: '+914000000000',
  whatsapp: '+91 90000 00000',
  whatsapp_href: '919000000000',
  whatsapp_widget_message: 'Hello! I would like to inquire about Techantum Solutions IT services.',
  email: 'info@techantum.com',
  address: 'Hyderabad, India',
  footer_description:
    'Techantum Solutions delivers websites, web applications, and mobile apps — designed, built, and launched for businesses ready to grow.',
  copyright_text: '© 2026 Techantum Solutions. All rights reserved.',
};

const defaultSeo = {
  site_title: 'Techantum Solutions | Website, Web App & Mobile Development',
  title_template: '%s | Techantum Solutions',
  description:
    'Techantum Solutions specializes in website development, custom web applications, and mobile apps for businesses in India, Germany, and the United States.',
  keywords: [
    'website development',
    'web application development',
    'mobile app development',
    'custom software development',
    'SaaS development',
    'IT services',
    'Techantum Solutions',
  ],
  site_url: process.env.NEXT_PUBLIC_SITE_URL || 'https://techantum.com',
  og_image_url: '/assets/images/Hollandse-1771785992532.jpg',
  twitter_handle: '@techantum',
  google_verification: '',
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

const aboutHero = {
  eyebrow: 'About Techantum Solutions',
  title: 'Building Your Digital Future',
  description:
    'Techantum Solutions is a full-service IT company specializing in websites, web applications, and mobile apps for businesses ready to scale.',
  description2:
    'With expertise across modern technologies and agile delivery, we help clients in India, Germany, and the United States turn ideas into reliable digital products.',
  image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c',
  imageAlt: 'Techantum Solutions software development team collaborating',
};

const cmsUpdates = [
  { entry_key: 'about.hero', entry_group: 'about', label: 'About Hero', content: aboutHero },
  { entry_key: 'about.overview', entry_group: 'about', label: 'Company Overview', content: defaultAboutOverview },
  { entry_key: 'about.usp', entry_group: 'about', label: 'Unique Selling Proposition', content: defaultAboutUsp },
  {
    entry_key: 'about.page',
    entry_group: 'about',
    label: 'About Page',
    content: JSON.parse(readFileSync(join(root, 'scripts/about-page-content.json'), 'utf8')),
  },
  { entry_key: 'industries.served', entry_group: 'industries', label: 'Industries Served', content: defaultIndustriesServed },
  { entry_key: 'company.website_goals', entry_group: 'company', label: 'Website Goals', content: defaultWebsiteGoals },
  { entry_key: 'company.seo_marketing', entry_group: 'company', label: 'SEO & Marketing Inputs', content: defaultSeoMarketingInputs },
  { entry_key: 'company.lead_preferences', entry_group: 'company', label: 'Lead Management Preferences', content: defaultLeadPreferences },
  {
    entry_key: 'homepage.testimonials',
    entry_group: 'homepage',
    label: 'Homepage Testimonials',
    content: JSON.parse(readFileSync(join(root, 'scripts/homepage-testimonials.json'), 'utf8')),
  },
  {
    entry_key: 'testimonials.page',
    entry_group: 'testimonials',
    label: 'Testimonials Page',
    content: JSON.parse(readFileSync(join(root, 'scripts/testimonials-page.json'), 'utf8')),
  },
];

async function main() {
  console.log('Updating site_branding...');
  const brandingRes = await supabase.from('site_branding').upsert({ id: 1, ...defaultBranding });
  if (brandingRes.error) throw brandingRes.error;

  console.log('Updating site_seo...');
  const seoRes = await supabase.from('site_seo').upsert({ id: 1, ...defaultSeo });
  if (seoRes.error) throw seoRes.error;

  for (const entry of cmsUpdates) {
    console.log(`Updating ${entry.entry_key}...`);
    const { error } = await supabase.from('cms_content').upsert(entry);
    if (error) throw new Error(`${entry.entry_key}: ${error.message}`);
  }

  const { data: all } = await supabase.from('cms_content').select('entry_key, content');
  const stale = (all ?? []).filter((row) => /KEIL|pre-engineered|PEB|warehouse-godown|poultry shed/i.test(JSON.stringify(row.content)));
  if (stale.length) {
    console.warn('Warning: stale entries remain:', stale.map((r) => r.entry_key).join(', '));
  } else {
    console.log('Verified: no KEIL/construction content in CMS.');
  }

  console.log('CMS reseed complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
