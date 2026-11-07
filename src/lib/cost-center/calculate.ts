import type { Complexity, CostCenterSettings } from './types';

function n(value: unknown, fallback = 0): number {
  if (value == null || value === '') return fallback;
  const num = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''));
  return Number.isFinite(num) ? num : fallback;
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function round4(value: number): number {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

export function complexityFactor(settings: CostCenterSettings, complexity: Complexity | string): number {
  switch (complexity) {
    case 'simple':
      return n(settings.complexity_simple_factor, 0.85);
    case 'complex':
      return n(settings.complexity_complex_factor, 1.25);
    case 'enterprise':
      return n(settings.complexity_enterprise_factor, 1.5);
    case 'medium':
    default:
      return n(settings.complexity_medium_factor, 1);
  }
}

/** System estimated hours from scope + configurable rules. */
export function calculateSystemHours(input: {
  modules: number;
  screens: number;
  apis: number;
  complexity: Complexity | string;
  settings: CostCenterSettings;
}): number {
  const base =
    n(input.modules) * n(input.settings.module_base_hours) +
    n(input.screens) * n(input.settings.screen_hours) +
    n(input.apis) * n(input.settings.api_hours);

  const withComplexity = base * complexityFactor(input.settings, input.complexity);
  const qa = withComplexity * (n(input.settings.qa_percentage) / 100);
  const pm = withComplexity * (n(input.settings.pm_percentage) / 100);
  const subtotal = withComplexity + qa + pm;
  const buffer = subtotal * (n(input.settings.buffer_percentage) / 100);
  return round2(subtotal + buffer);
}

export function resolveFinalHours(input: {
  systemHours: number;
  adjustedHours?: number | null;
  hoursOverride?: boolean;
}): { system: number; adjusted: number | null; final: number } {
  const system = round2(n(input.systemHours));
  const adjusted =
    input.adjustedHours == null || input.adjustedHours === ('' as unknown as number)
      ? null
      : round2(n(input.adjustedHours));
  const final = input.hoursOverride && adjusted != null ? adjusted : adjusted != null ? adjusted : system;
  return { system, adjusted, final: round2(final) };
}

export function productiveHoursPerMonth(settings: CostCenterSettings): number {
  return round2(n(settings.working_days_per_month, 22) * n(settings.productive_hours_per_day, 6.5));
}

/** Monthly ops ÷ productive hours = overhead per hour. */
export function operationalCostPerHour(monthlyOps: number, settings: CostCenterSettings): number {
  const productive = productiveHoursPerMonth(settings);
  if (productive <= 0) return 0;
  return round4(n(monthlyOps) / productive);
}

export function resourceLineCost(plannedHours: number, hourlyCost: number, allocationPct = 100): number {
  return round2(n(plannedHours) * n(hourlyCost) * (n(allocationPct, 100) / 100));
}

export function sumResourceCost(lines: { planned_hours: number; hourly_cost: number; allocation_pct?: number }[]): number {
  return round2(lines.reduce((sum, line) => sum + resourceLineCost(line.planned_hours, line.hourly_cost, line.allocation_pct), 0));
}

export function projectOperationalCost(finalHours: number, opsPerHour: number): number {
  return round2(n(finalHours) * n(opsPerHour));
}

export function finalizeProjectCost(input: {
  resourceCost: number;
  operationalCost: number;
  additionalCost?: number;
  clientPrice?: number | null;
}): {
  totalInternalCost: number;
  expectedProfit: number | null;
  profitMarginPct: number | null;
} {
  const totalInternalCost = round2(n(input.resourceCost) + n(input.operationalCost) + n(input.additionalCost));
  if (input.clientPrice == null || input.clientPrice === ('' as unknown as number)) {
    return { totalInternalCost, expectedProfit: null, profitMarginPct: null };
  }
  const price = n(input.clientPrice);
  const expectedProfit = round2(price - totalInternalCost);
  const profitMarginPct = price === 0 ? 0 : round2((expectedProfit / price) * 100);
  return { totalInternalCost, expectedProfit, profitMarginPct };
}

export function formatMoney(value: unknown, currency = 'INR'): string {
  const amount = n(value);
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function formatHours(value: unknown): string {
  return `${n(value).toFixed(2)}h`;
}

export function formatPct(value: unknown): string {
  if (value == null || value === '') return '—';
  return `${n(value).toFixed(1)}%`;
}
