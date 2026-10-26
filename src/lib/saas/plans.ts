export const SAAS_PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    priceMonthly: 29,
    blurb: 'Local lead lists for one market.',
    youtube: false,
    leads: true,
    projects: 0,
    leadsPerMonth: 250,
    seats: 1,
    features: ['Google Places lead search', 'CSV / Excel export', '250 leads / month'],
  },
  {
    id: 'growth',
    name: 'Growth',
    priceMonthly: 99,
    blurb: 'YouTube research plus lead discovery.',
    youtube: true,
    leads: true,
    projects: 5,
    leadsPerMonth: 2000,
    seats: 5,
    features: ['YouTube competitor research', 'Video comparison & reports', '2,000 leads / month', '5 research projects'],
  },
  {
    id: 'scale',
    name: 'Scale',
    priceMonthly: 249,
    blurb: 'Team seats and higher volume.',
    youtube: true,
    leads: true,
    projects: 40,
    leadsPerMonth: 10000,
    seats: 20,
    features: ['Everything in Growth', '10,000 leads / month', '40 research projects', '20 seats'],
  },
] as const;

export type SaasPlanId = (typeof SAAS_PLANS)[number]['id'];

export function saasPlan(id: string | null | undefined) {
  return SAAS_PLANS.find((plan) => plan.id === id) || SAAS_PLANS[0];
}

export const TRIAL_DAYS = 14;
export const TRIAL_PLAN: SaasPlanId = 'growth';
