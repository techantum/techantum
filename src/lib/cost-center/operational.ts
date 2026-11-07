import { q, withFinanceTx } from '@/lib/finance/db';
import { FinanceNotFoundError, FinanceValidationError } from '@/lib/finance/errors';
import { writeCostCenterAudit } from './audit';
import { getSettings } from './settings';
import { operationalCostPerHour, productiveHoursPerMonth } from './calculate';
import { OPS_CATEGORIES, type OperationalCost } from './types';

export async function listOperationalCosts(activeOnly = false): Promise<OperationalCost[]> {
  const { rows } = await q<OperationalCost>(
    undefined,
    `SELECT * FROM cost_center_operational_costs
     ${activeOnly ? 'WHERE active = TRUE' : ''}
     ORDER BY sort_order, cost_name`
  );
  return rows;
}

export async function monthlyOperationalTotal(activeOnly = true): Promise<number> {
  const { rows } = await q<{ total: string }>(
    undefined,
    `SELECT COALESCE(SUM(monthly_amount),0)::text AS total
     FROM cost_center_operational_costs
     ${activeOnly ? 'WHERE active = TRUE' : ''}`
  );
  return Number(rows[0]?.total || 0);
}

export async function overheadSnapshot() {
  const settings = await getSettings();
  const monthly = await monthlyOperationalTotal(true);
  const productive = productiveHoursPerMonth(settings);
  const perHour = operationalCostPerHour(monthly, settings);
  return {
    settings,
    monthly_operational_cost: monthly,
    productive_hours_per_month: productive,
    operational_cost_per_hour: perHour,
    formula: settings.overhead_formula,
  };
}

export async function saveOperationalCost(input: Record<string, unknown>, userId: string, id?: string) {
  const costName = String(input.cost_name || '').trim();
  const amount = Number(input.monthly_amount);
  const category = String(input.category || 'other');
  if (!costName) throw new FinanceValidationError('Cost name is required');
  if (!Number.isFinite(amount) || amount < 0) throw new FinanceValidationError('Invalid monthly amount');
  if (!OPS_CATEGORIES.includes(category as (typeof OPS_CATEGORIES)[number])) {
    throw new FinanceValidationError('Invalid category');
  }

  return withFinanceTx(async (client) => {
    if (id) {
      const prev = (await q<OperationalCost>(client, 'SELECT * FROM cost_center_operational_costs WHERE id=$1', [id])).rows[0];
      if (!prev) throw new FinanceNotFoundError('Operational cost not found');
      const { rows } = await q<OperationalCost>(
        client,
        `UPDATE cost_center_operational_costs
         SET cost_name=$1, monthly_amount=$2, category=$3, active=$4, notes=$5, sort_order=$6, updated_by=$7, updated_at=NOW()
         WHERE id=$8 RETURNING *`,
        [
          costName,
          amount,
          category,
          input.active !== false && input.active !== 'false',
          input.notes ? String(input.notes) : null,
          Number(input.sort_order ?? prev.sort_order) || 100,
          userId,
          id,
        ]
      );
      await writeCostCenterAudit(client, {
        userId,
        entityType: 'operational_cost',
        entityId: id,
        action: 'operational_cost_updated',
        previous: prev,
        next: rows[0],
      });
      return rows[0];
    }

    const { rows } = await q<OperationalCost>(
      client,
      `INSERT INTO cost_center_operational_costs
        (cost_name, monthly_amount, category, active, notes, sort_order, updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [
        costName,
        amount,
        category,
        input.active !== false && input.active !== 'false',
        input.notes ? String(input.notes) : null,
        Number(input.sort_order) || 100,
        userId,
      ]
    );
    await writeCostCenterAudit(client, {
      userId,
      entityType: 'operational_cost',
      entityId: rows[0].id,
      action: 'operational_cost_created',
      next: rows[0],
    });
    return rows[0];
  });
}

export async function deleteOperationalCost(id: string, userId: string) {
  return withFinanceTx(async (client) => {
    const prev = (await q<OperationalCost>(client, 'SELECT * FROM cost_center_operational_costs WHERE id=$1', [id])).rows[0];
    if (!prev) throw new FinanceNotFoundError('Operational cost not found');
    await q(client, 'DELETE FROM cost_center_operational_costs WHERE id=$1', [id]);
    await writeCostCenterAudit(client, {
      userId,
      entityType: 'operational_cost',
      entityId: id,
      action: 'operational_cost_deleted',
      previous: prev,
    });
    return { ok: true };
  });
}
