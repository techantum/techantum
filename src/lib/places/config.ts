export const DEFAULT_CITY = process.env.GOOGLE_PLACES_DEFAULT_CITY || 'Hyderabad';
export const DEFAULT_REGION = process.env.GOOGLE_PLACES_DEFAULT_REGION || 'IN';
export const MAX_RESULTS = Math.min(
  Math.max(parseInt(process.env.GOOGLE_PLACES_MAX_RESULTS || '60', 10), 1),
  60
);

/** Per-request cap for Places Text Search (API max is 20). */
export const PAGE_SIZE = 20;

export const HYDERABAD_AREAS = [
  'Madhapur',
  'Hitech City',
  'Kondapur',
  'Gachibowli',
  'Jubilee Hills',
  'Banjara Hills',
  'Kukatpally',
  'Secunderabad',
  'Ameerpet',
  'Miyapur',
  'Financial District',
  'Nanakramguda',
] as const;

export const LEAD_SEGMENTS = [
  'Clinics',
  'Hospitals',
  'Dental Clinics',
  'Real Estate',
  'Restaurants',
  'Hotels',
  'Gyms',
  'Salons',
  'Schools',
  'Coaching Centers',
  'Law Firms',
  'CA Firms',
  'Architects',
  'Interior Designers',
  'Construction Companies',
  'IT Companies',
  'Manufacturing',
  'Warehouses',
  'Pharmacies',
  'Diagnostic Centers',
] as const;

export function buildTextQuery(segment: string, area: string, city: string) {
  return `${segment} in ${area}, ${city}`;
}
