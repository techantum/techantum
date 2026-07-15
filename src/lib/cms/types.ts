export interface SiteBranding {
  company_name: string;
  tagline: string;
  logo_url: string | null;
  footer_logo_url: string | null;
  favicon_url: string | null;
  logo_letter: string;
  phone: string;
  phone_href: string;
  whatsapp: string;
  whatsapp_href: string;
  whatsapp_widget_message: string;
  email: string;
  address: string;
  footer_description: string;
  copyright_text: string;
}

export interface SiteSeo {
  site_title: string;
  title_template: string;
  description: string;
  keywords: string[];
  site_url: string;
  og_image_url: string;
  twitter_handle: string;
  google_verification: string;
  canonical_host?: 'non-www' | 'www';
  index_site?: boolean;
  follow_site?: boolean;
  header_scripts?: string;
  footer_scripts?: string;
}

export interface CmsEntry {
  entry_key: string;
  entry_group: string;
  label: string;
  content: Record<string, unknown>;
}

export interface CmsSnapshot {
  branding: SiteBranding;
  seo: SiteSeo;
  content: Record<string, Record<string, unknown>>;
}
