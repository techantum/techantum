export const APP_NAME = 'Revealeo';
export const APP_MARK = 'R';
export const APP_TAGLINE = 'YouTube research and lead discovery';

export function publicAppUrl() {
  return (
    process.env.NEXT_PUBLIC_REVEALEO_URL ||
    process.env.NEXT_PUBLIC_SCOUT_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3010'
  );
}
