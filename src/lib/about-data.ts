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
    'To deliver reliable, cost-effective pre-engineered building solutions that help businesses expand faster with structures built to the highest engineering standards.',
  missionCards: [
    {
      id: 'mission_quality',
      icon: 'ShieldCheckIcon',
      iconClass: 'text-primary',
      bgClass: 'bg-primary/10',
      title: 'Quality Engineering',
      description: 'Every structure is designed and fabricated to meet rigorous structural and safety standards.',
    },
    {
      id: 'mission_delivery',
      icon: 'ClockIcon',
      iconClass: 'text-secondary',
      bgClass: 'bg-secondary/10',
      title: 'On-Time Delivery',
      description: 'Pre-fabricated PEB components enable faster project completion without compromising quality.',
    },
    {
      id: 'mission_partnership',
      icon: 'UserGroupIcon',
      iconClass: 'text-accent',
      bgClass: 'bg-accent/10',
      title: 'Client Partnership',
      description: 'We work closely from design through handover — transparent communication at every stage.',
    },
  ] satisfies AboutMissionCard[],
  timelineTitle: 'Our Journey',
  timelineDescription: 'Decades of growth in pre-engineered building construction across India.',
  milestones: [
    { id: 'mile_1', year: '1998', title: 'KEIL Founded', description: 'Started as a regional industrial shed manufacturer' },
    { id: 'mile_2', year: '2005', title: 'PEB Expansion', description: 'Adopted pre-engineered building technology and in-house design capability' },
    { id: 'mile_3', year: '2012', title: 'Pan-India Projects', description: 'Expanded operations to serve clients across multiple states' },
    { id: 'mile_4', year: '2018', title: '500+ Projects', description: 'Crossed 500 completed warehouse, industrial, and poultry projects' },
    { id: 'mile_5', year: '2022', title: 'Convention Centers', description: 'Added large-span commercial and convention center capabilities' },
    { id: 'mile_6', year: '2026', title: 'Continued Growth', description: 'Serving manufacturing, logistics, agriculture, and commercial sectors nationwide' },
  ] satisfies AboutMilestone[],
  valuesTitle: 'Our Core Values',
  valuesDescription: 'The principles that guide every KEIL project and client relationship.',
  values: [
    { id: 'val_quality', icon: 'CheckBadgeIcon', title: 'Quality First', description: 'Premium materials, certified processes, and thorough quality checks at every stage.' },
    { id: 'val_safety', icon: 'ShieldCheckIcon', title: 'Safety', description: 'Strict site safety protocols for our teams and client personnel.' },
    { id: 'val_integrity', icon: 'DocumentTextIcon', title: 'Integrity', description: 'Honest timelines, transparent pricing, and accountable project management.' },
    { id: 'val_innovation', icon: 'LightBulbIcon', title: 'Innovation', description: 'Modern PEB design tools and construction methods for optimal outcomes.' },
    { id: 'val_commitment', icon: 'HeartIcon', title: 'Commitment', description: 'Dedicated to delivering what we promise — on time and to specification.' },
    { id: 'val_support', icon: 'WrenchScrewdriverIcon', title: 'After-Sales Support', description: 'Continued assistance after handover for maintenance and future expansions.' },
  ] satisfies AboutValue[],
  regionsTitle: 'Regions We Serve',
  regionsDescription: 'Delivering pre-engineered buildings across India with a strong presence in South and Central regions.',
  regions: [
    { id: 'reg_ts', name: 'Telangana', flag: '📍', projects: '120+' },
    { id: 'reg_ap', name: 'Andhra Pradesh', flag: '📍', projects: '95+' },
    { id: 'reg_ka', name: 'Karnataka', flag: '📍', projects: '80+' },
    { id: 'reg_mh', name: 'Maharashtra', flag: '📍', projects: '70+' },
    { id: 'reg_tn', name: 'Tamil Nadu', flag: '📍', projects: '55+' },
    { id: 'reg_other', name: 'Other States', flag: '🇮🇳', projects: '180+' },
  ] satisfies AboutRegion[],
  certificationsTitle: 'Quality & Certifications',
  certificationsDescription: 'Committed to industry standards and best practices in structural engineering and construction.',
  certifications: [
    { id: 'cert_iso', title: 'ISO Quality Management', description: 'Certified quality management systems', icon: 'ShieldCheckIcon' },
    { id: 'cert_steel', title: 'BIS Certified Steel', description: 'Structural steel from certified suppliers', icon: 'CubeIcon' },
    { id: 'cert_peb', title: 'PEB Standards', description: 'Design per IS codes and MBMA guidelines', icon: 'DocumentCheckIcon' },
    { id: 'cert_safety', title: 'Site Safety Compliance', description: 'OSHA-aligned safety practices on all sites', icon: 'ExclamationTriangleIcon' },
  ] satisfies AboutCertification[],
  glanceTitle: 'KEIL at a Glance',
  glanceStats: [
    { id: 'glance_projects', label: 'Projects Delivered', value: '500+' },
    { id: 'glance_experience', label: 'Years Experience', value: '25+' },
    { id: 'glance_services', label: 'Core Services', value: '4' },
  ],
};
