import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  calculateSystemHours,
  finalizeProjectCost,
  operationalCostPerHour,
  resolveFinalHours,
  resourceLineCost,
} from './calculate.ts';
import type { CostCenterSettings } from './types.ts';

const settings: CostCenterSettings = {
  id: 1,
  screen_hours: '8',
  api_hours: '6',
  module_base_hours: '16',
  qa_percentage: '15',
  pm_percentage: '10',
  buffer_percentage: '10',
  complexity_simple_factor: '0.85',
  complexity_medium_factor: '1',
  complexity_complex_factor: '1.25',
  complexity_enterprise_factor: '1.5',
  working_days_per_month: '22',
  productive_hours_per_day: '6.5',
  overhead_formula: 'monthly_ops / (working_days * productive_hours)',
  currency: 'INR',
};

describe('cost center calculations', () => {
  it('calculates system hours from scope and rules', () => {
    const hours = calculateSystemHours({
      modules: 2,
      screens: 10,
      apis: 5,
      complexity: 'medium',
      settings,
    });
    // base = 2*16 + 10*8 + 5*6 = 142; +QA/PM 25% = 177.5; +buffer 10% = 195.25
    assert.equal(hours, 195.25);
  });

  it('honours adjusted hour override', () => {
    const resolved = resolveFinalHours({ systemHours: 100, adjustedHours: 120, hoursOverride: true });
    assert.equal(resolved.final, 120);
  });

  it('computes resource line cost with allocation', () => {
    assert.equal(resourceLineCost(10, 900, 100), 9000);
    assert.equal(resourceLineCost(10, 900, 50), 4500);
  });

  it('derives operational cost per hour', () => {
    assert.equal(operationalCostPerHour(143000, settings), 1000);
  });

  it('finalizes project cost and margin', () => {
    const finals = finalizeProjectCost({
      resourceCost: 100000,
      operationalCost: 20000,
      additionalCost: 5000,
      clientPrice: 180000,
    });
    assert.equal(finals.totalInternalCost, 125000);
    assert.equal(finals.expectedProfit, 55000);
    assert.equal(finals.profitMarginPct, 30.56);
  });
});
