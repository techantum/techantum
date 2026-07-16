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
  /** Google Tag Manager container ID (GTM-XXXX) */
  gtm_id?: string;
  /** Google Analytics 4 measurement ID (G-XXXX) */
  ga4_id?: string;
  /** Bing Webmaster Tools verification meta content */
  bing_verification?: string;
  /** Meta (Facebook) Pixel ID */
  facebook_pixel_id?: string;
  /** LinkedIn Insight Tag partner ID */
  linkedin_partner_id?: string;
  /** Facebook Open Graph app ID */
  facebook_app_id?: string;
  /** Social profile URLs for marketing / sameAs structured data */
  facebook_url?: string;
  instagram_url?: string;
  linkedin_url?: string;
  youtube_url?: string;
  twitter_url?: string;
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
