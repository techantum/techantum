export const APP_NAME = 'Hookooh';
export const APP_MARK = 'H';
export const APP_TAGLINE = 'YouTube research and lead discovery';

export function displayCompanyName(name?: string | null) {
  const value = String(name || '').trim();
  if (!value || /^revealeo\.?$/i.test(value)) return APP_NAME;
  return value;
}

export function publicAppUrl() {
  return (
    process.env.NEXT_PUBLIC_REVEALEO_URL ||
    process.env.NEXT_PUBLIC_SCOUT_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3010'
  );
}
