import { q, withFinanceTx } from '@/lib/finance/db';
import { FinanceNotFoundError, FinanceValidationError } from '@/lib/finance/errors';
import { writeCostCenterAudit } from './audit';
import type { RoleRate } from './types';

export async function listRoleRates(activeOnly = false): Promise<RoleRate[]> {
  const { rows } = await q<RoleRate>(
    undefined,
    `SELECT * FROM cost_center_role_rates
     ${activeOnly ? 'WHERE active = TRUE' : ''}
     ORDER BY sort_order, role_label`
  );
  return rows;
}

export async function getRoleRate(idOrKey: string): Promise<RoleRate | null> {
  const { rows } = await q<RoleRate>(
    undefined,
    `SELECT * FROM cost_center_role_rates WHERE id::text = $1 OR role_key = $1 LIMIT 1`,
    [idOrKey]
  );
  return rows[0] || null;
}

export async function saveRoleRate(input: Record<string, unknown>, userId: string, id?: string) {
  const roleKey = String(input.role_key || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const roleLabel = String(input.role_label || '').trim();
  const hourly = Number(input.hourly_cost);
  if (!roleKey) throw new FinanceValidationError('Role key is required');
  if (!roleLabel) throw new FinanceValidationError('Role label is required');
  if (!Number.isFinite(hourly) || hourly < 0) throw new FinanceValidationError('Invalid hourly cost');

  return withFinanceTx(async (client) => {
    if (id) {
      const prev = (await q<RoleRate>(client, 'SELECT * FROM cost_center_role_rates WHERE id=$1', [id])).rows[0];
      if (!prev) throw new FinanceNotFoundError('Role rate not found');
      const { rows } = await q<RoleRate>(
        client,
        `UPDATE cost_center_role_rates
         SET role_key=$1, role_label=$2, hourly_cost=$3, active=$4, sort_order=$5, updated_by=$6, updated_at=NOW()
         WHERE id=$7 RETURNING *`,
        [
          roleKey,
          roleLabel,
          hourly,
          input.active !== false && input.active !== 'false',
          Number(input.sort_order ?? prev.sort_order) || 100,
          userId,
          id,
        ]
      );
      await writeCostCenterAudit(client, {
        userId,
        entityType: 'role_rate',
        entityId: id,
        action: 'cost_changed',
        previous: prev,
        next: rows[0],
      });
      return rows[0];
    }

    const { rows } = await q<RoleRate>(
      client,
      `INSERT INTO cost_center_role_rates (role_key, role_label, hourly_cost, active, sort_order, updated_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [
        roleKey,
        roleLabel,
        hourly,
        input.active !== false && input.active !== 'false',
        Number(input.sort_order) || 100,
        userId,
      ]
    );
    await writeCostCenterAudit(client, {
      userId,
      entityType: 'role_rate',
      entityId: rows[0].id,
      action: 'role_rate_created',
      next: rows[0],
    });
    return rows[0];
  });
}

export async function deleteRoleRate(id: string, userId: string) {
  return withFinanceTx(async (client) => {
    const prev = (await q<RoleRate>(client, 'SELECT * FROM cost_center_role_rates WHERE id=$1', [id])).rows[0];
    if (!prev) throw new FinanceNotFoundError('Role rate not found');
    await q(client, 'DELETE FROM cost_center_role_rates WHERE id=$1', [id]);
    await writeCostCenterAudit(client, {
      userId,
      entityType: 'role_rate',
      entityId: id,
      action: 'role_rate_deleted',
      previous: prev,
    });
    return { ok: true };
  });
}
