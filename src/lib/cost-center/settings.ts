import { q, withFinanceTx } from '@/lib/finance/db';
import { FinanceValidationError } from '@/lib/finance/errors';
import { writeCostCenterAudit } from './audit';
import type { CostCenterSettings } from './types';

const NUMERIC_FIELDS = [
  'screen_hours',
  'api_hours',
  'module_base_hours',
  'qa_percentage',
  'pm_percentage',
  'buffer_percentage',
  'complexity_simple_factor',
  'complexity_medium_factor',
  'complexity_complex_factor',
  'complexity_enterprise_factor',
  'working_days_per_month',
  'productive_hours_per_day',
] as const;

export async function getSettings(): Promise<CostCenterSettings> {
  const { rows } = await q<CostCenterSettings>(undefined, 'SELECT * FROM cost_center_settings WHERE id = 1');
  if (!rows[0]) throw new FinanceValidationError('Cost Center settings missing');
  return rows[0];
}

export async function updateSettings(input: Record<string, unknown>, userId: string) {
  return withFinanceTx(async (client) => {
    const prev = (await q<CostCenterSettings>(client, 'SELECT * FROM cost_center_settings WHERE id = 1')).rows[0];
    const values: unknown[] = [];
    const sets: string[] = [];

    for (const key of NUMERIC_FIELDS) {
      if (!(key in input)) continue;
      const num = Number(input[key]);
      if (!Number.isFinite(num) || num < 0) {
        throw new FinanceValidationError(`Invalid value for ${key}`);
      }
      values.push(num);
      sets.push(`${key} = $${values.length}`);
    }
    if ('overhead_formula' in input) {
      values.push(String(input.overhead_formula || 'monthly_ops / (working_days * productive_hours)'));
      sets.push(`overhead_formula = $${values.length}`);
    }
    if ('currency' in input) {
      values.push(String(input.currency || 'INR').slice(0, 8));
      sets.push(`currency = $${values.length}`);
    }
    if (!sets.length) return prev;

    values.push(userId);
    sets.push(`updated_by = $${values.length}`, 'updated_at = NOW()');
    const { rows } = await q<CostCenterSettings>(
      client,
      `UPDATE cost_center_settings SET ${sets.join(', ')} WHERE id = 1 RETURNING *`,
      values
    );
    await writeCostCenterAudit(client, {
      userId,
      entityType: 'settings',
      entityId: null,
      action: 'settings_updated',
      previous: prev,
      next: rows[0],
    });
    return rows[0];
  });
}
