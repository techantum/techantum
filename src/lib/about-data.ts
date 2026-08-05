export interface AboutMissionCard {
  id: string;
  icon: string;
  iconClass: string;
  bgClass: string;
  title: string;
  description: string;
}

export interface AboutMilestone {
  id: string;
  year: string;
  title: string;
  description: string;
}

export interface AboutValue {
  id: string;
  icon: string;
  title: string;
  description: string;
}

export interface AboutRegion {
  id: string;
  name: string;
  flag: string;
  projects: string;
}

export interface AboutCertification {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export const defaultAboutPageContent = {
  missionTitle: 'Our Mission',
  missionDescription:
    'To deliver high-quality digital products that help businesses launch faster, operate efficiently, and serve customers with confidence.',
  missionCards: [
    {
      id: 'mission_quality',
      icon: 'ShieldCheckIcon',
      iconClass: 'text-primary',
      bgClass: 'bg-primary/10',
      title: 'Quality Engineering',
      description: 'Clean architecture, tested releases, and maintainable code built for long-term product success.',
    },
    {
      id: 'mission_delivery',
      icon: 'ClockIcon',
      iconClass: 'text-secondary',
      bgClass: 'bg-secondary/10',
      title: 'Reliable Delivery',
      description: 'Structured project plans, transparent progress updates, and predictable launch timelines.',
    },
    {
      id: 'mission_partnership',
      icon: 'UserGroupIcon',
      iconClass: 'text-accent',
      bgClass: 'bg-accent/10',
      title: 'Client Partnership',
      description: 'We work as an extension of your team from discovery through post-launch support.',
    },
  ] satisfies AboutMissionCard[],
  timelineTitle: 'Our Journey',
  timelineDescription: 'Building digital products for businesses across India, Germany, and the United States.',
  milestones: [
    { id: 'mile_1', year: '2018', title: 'TechAntum Founded', description: 'Started as a focused web development studio serving growing businesses' },
    { id: 'mile_2', year: '2020', title: 'Web Applications', description: 'Expanded into custom SaaS platforms and internal business applications' },
    { id: 'mile_3', year: '2022', title: 'Mobile Development', description: 'Added iOS, Android, and cross-platform mobile application services' },
    { id: 'mile_4', year: '2024', title: 'Global Client Base', description: 'Established delivery partnerships in India, Germany, and the United States' },
    { id: 'mile_5', year: '2025', title: '150+ Projects', description: 'Crossed 150 completed website, web app, and mobile projects' },
    { id: 'mile_6', year: '2026', title: 'Continued Growth', description: 'Serving SaaS, e-commerce, healthcare, and professional services clients worldwide' },
  ] satisfies AboutMilestone[],
  valuesTitle: 'Our Core Values',
  valuesDescription: 'The principles that guide every TechAntum engagement and client relationship.',
  values: [
    { id: 'val_quality', icon: 'CheckBadgeIcon', title: 'Quality First', description: 'We prioritize stable, maintainable solutions over shortcuts.' },
    { id: 'val_transparency', icon: 'ShieldCheckIcon', title: 'Transparency', description: 'Clear communication on scope, timelines, and progress at every stage.' },
    { id: 'val_integrity', icon: 'DocumentTextIcon', title: 'Integrity', description: 'Honest recommendations, accountable delivery, and respect for client goals.' },
    { id: 'val_innovation', icon: 'LightBulbIcon', title: 'Practical Innovation', description: 'Modern tools and methods applied where they create measurable business value.' },
    { id: 'val_commitment', icon: 'HeartIcon', title: 'Commitment', description: 'Dedicated to outcomes that support our clients beyond initial launch.' },
    { id: 'val_support', icon: 'WrenchScrewdriverIcon', title: 'Ongoing Support', description: 'Maintenance, enhancements, and technical guidance after go-live.' },
  ] satisfies AboutValue[],
  regionsTitle: 'Markets We Serve',
  regionsDescription: 'TechAntum supports clients in three primary markets with localized communication and delivery coordination.',
  regions: [
    { id: 'reg_in', name: 'India', flag: '', projects: '85+' },
    { id: 'reg_de', name: 'Germany', flag: '', projects: '40+' },
    { id: 'reg_us', name: 'United States', flag: '', projects: '35+' },
  ] satisfies AboutRegion[],
  certificationsTitle: 'Standards & Practices',
  certificationsDescription: 'We follow established engineering and delivery practices across every project.',
  certifications: [
    { id: 'cert_agile', title: 'Agile Delivery', description: 'Iterative development with regular demos and feedback loops', icon: 'ArrowPathIcon' },
    { id: 'cert_security', title: 'Security Best Practices', description: 'Secure coding standards and environment-aware deployments', icon: 'ShieldCheckIcon' },
    { id: 'cert_qa', title: 'Structured QA', description: 'Testing across functionality, responsiveness, and performance', icon: 'DocumentCheckIcon' },
    { id: 'cert_cloud', title: 'Cloud-Ready Architecture', description: 'Scalable deployments on modern cloud infrastructure', icon: 'CloudIcon' },
  ] satisfies AboutCertification[],
  glanceTitle: 'TechAntum at a Glance',
  glanceStats: [
    { id: 'glance_projects', label: 'Projects Delivered', value: '150+' },
    { id: 'glance_experience', label: 'Years Experience', value: '8+' },
    { id: 'glance_services', label: 'Core Services', value: '3' },
  ],
};
