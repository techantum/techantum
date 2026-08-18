export type WebsiteFilter = 'any' | 'yes' | 'no';
export type PhoneFilter = 'any' | 'yes' | 'no';
export type LeadPriority = 'high' | 'medium' | 'normal';
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'closed' | 'skipped';

export interface LeadSearchFilters {
  city: string;
  area: string;
  segment: string;
  minRating?: number | null;
  hasWebsite?: WebsiteFilter;
  hasPhone?: PhoneFilter;
}

export interface LeadDiscoveryResult {
  place_id: string;
  business_name: string;
  formatted_address: string | null;
  primary_type: string | null;
  types: string[];
  latitude: number | null;
  longitude: number | null;
  google_maps_uri: string | null;
  phone: string | null;
  website_uri: string | null;
  rating: number | null;
  review_count: number | null;
  business_status: string | null;
  priority: LeadPriority;
  city: string;
  area: string;
  segment: string;
}

export interface LeadSearchResponse {
  text_query: string;
  filters: LeadSearchFilters;
  raw_count: number;
  result_count: number;
  results: LeadDiscoveryResult[];
}

export interface LeadDiscoveryRun {
  id: string;
  created_by: string | null;
  city: string;
  area: string;
  segment: string;
  text_query: string;
  min_rating: number | null;
  has_website_filter: WebsiteFilter;
  has_phone_filter: PhoneFilter;
  raw_count: number;
  result_count: number;
  created_at: string;
}

export interface LeadDiscoveryResultRow extends LeadDiscoveryResult {
  id: string;
  run_id: string;
  lead_status: LeadStatus;
  notes: string | null;
  created_at: string;
}
