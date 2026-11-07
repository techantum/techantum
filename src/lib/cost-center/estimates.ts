import { q, withFinanceTx, type DbClient } from '@/lib/finance/db';
import { FinanceNotFoundError, FinanceValidationError } from '@/lib/finance/errors';
import { writeCostCenterAudit } from './audit';
import {
  calculateSystemHours,
  finalizeProjectCost,
  projectOperationalCost,
  resolveFinalHours,
  resourceLineCost,
} from './calculate';
import { overheadSnapshot } from './operational';
import { getRoleRate } from './rates';
import { getSettings } from './settings';
import {
  COMPLEXITIES,
  ESTIMATE_STATUSES,
  type Complexity,
  type Estimate,
  type EstimateResource,
  type EstimateStatus,
} from './types';

function num(value: unknown, fallback = 0): number {
  if (value == null || value === '') return fallback;
  const n = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''));
  return Number.isFinite(n) ? n : fallback;
}

const ESTIMATE_SELECT = `
  SELECT e.*,
         c.name AS client_name,
         p.project_name,
         p.project_code
  FROM cost_center_estimates e
  LEFT JOIN ops_clients c ON c.id = e.client_id
  LEFT JOIN project_management_projects p ON p.id = e.project_id
`;

async function loadResources(client: DbClient | undefined, estimateId: string): Promise<EstimateResource[]> {
  const { rows } = await q<EstimateResource>(
    client,
    `SELECT r.*, emp.full_name AS employee_name
     FROM cost_center_estimate_resources r
     LEFT JOIN finance_employees emp ON emp.id = r.employee_id
     WHERE r.estimate_id = $1
     ORDER BY r.sort_order, r.created_at`,
    [estimateId]
  );
  return rows;
}

export async function listEstimates(params?: {
  q?: string;
  status?: string;
  clientId?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, Number(params?.page) || 1);
  const pageSize = Math.min(200, Math.max(1, Number(params?.pageSize) || 25));
  const offset = (page - 1) * pageSize;
  const filters: string[] = [];
  const values: unknown[] = [];

  if (params?.q?.trim()) {
    values.push(`%${params.q.trim()}%`);
    filters.push(
      `(e.estimate_name ILIKE $${values.length} OR e.estimate_code ILIKE $${values.length} OR c.name ILIKE $${values.length} OR p.project_name ILIKE $${values.length})`
    );
  }
  if (params?.status) {
    values.push(params.status);
    filters.push(`e.status = $${values.length}`);
  }
  if (params?.clientId) {
    values.push(params.clientId);
    filters.push(`e.client_id = $${values.length}`);
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const count = await q<{ count: string }>(
    undefined,
    `SELECT COUNT(*)::text AS count
     FROM cost_center_estimates e
     LEFT JOIN ops_clients c ON c.id = e.client_id
     LEFT JOIN project_management_projects p ON p.id = e.project_id
     ${where}`,
    values
  );
  values.push(pageSize);
  values.push(offset);
  const { rows } = await q(
    undefined,
    `${ESTIMATE_SELECT}
     ${where}
     ORDER BY e.updated_at DESC
     LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  );
  return { rows, total: Number(count.rows[0]?.count || 0), page, pageSize };
}

export async function getEstimate(id: string): Promise<Estimate> {
  const { rows } = await q<Estimate>(undefined, `${ESTIMATE_SELECT} WHERE e.id = $1`, [id]);
  if (!rows[0]) throw new FinanceNotFoundError('Estimate not found');
  const resources = await loadResources(undefined, id);
  return { ...rows[0], resources };
}

async function resolveEmployeeMeta(employeeId?: string | null) {
  if (!employeeId) return { designation: null as string | null, name: null as string | null };
  const { rows } = await q<{ full_name: string; designation: string | null }>(
    undefined,
    `SELECT full_name, designation FROM finance_employees WHERE id = $1`,
    [employeeId]
  );
  if (!rows[0]) throw new FinanceValidationError('Employee not found in HR');
  return { designation: rows[0].designation, name: rows[0].full_name };
}

function normalizeResources(raw: unknown[]): EstimateResource[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, index) => {
    const row = (item || {}) as Record<string, unknown>;
    const roleKey = String(row.role_key || 'other').trim() || 'other';
    const roleLabel = String(row.role_label || roleKey).trim();
    return {
      id: row.id ? String(row.id) : undefined,
      role_key: roleKey,
      role_label: roleLabel,
      employee_id: row.employee_id ? String(row.employee_id) : null,
      designation: row.designation ? String(row.designation) : null,
      hourly_cost: num(row.hourly_cost),
      cost_overridden: Boolean(row.cost_overridden),
      planned_hours: num(row.planned_hours),
      allocation_pct: num(row.allocation_pct, 100),
      sort_order: Number(row.sort_order) || (index + 1) * 10,
      notes: row.notes ? String(row.notes) : null,
    };
  });
}

async function hydrateResourceCosts(resources: EstimateResource[]) {
  const lines = [];
  for (const resource of resources) {
    let hourly = num(resource.hourly_cost);
    let designation = resource.designation || null;
    if (resource.employee_id) {
      const meta = await resolveEmployeeMeta(resource.employee_id);
      designation = designation || meta.designation;
    }
    if (!resource.cost_overridden) {
      const rate = await getRoleRate(resource.role_key);
      if (rate) hourly = num(rate.hourly_cost, hourly);
    }
    const total = resourceLineCost(num(resource.planned_hours), hourly, num(resource.allocation_pct, 100));
    lines.push({
      ...resource,
      designation,
      hourly_cost: hourly,
      total_resource_cost: total,
    });
  }
  return lines;
}

async function computeTotals(input: {
  modules_count: number;
  screens_count: number;
  apis_count: number;
  complexity: string;
  adjusted_hours?: number | null;
  hours_override?: boolean;
  additional_cost?: number;
  proposed_client_price?: number | null;
  resources: EstimateResource[];
}) {
  const settings = await getSettings();
  const overhead = await overheadSnapshot();
  const systemHours = calculateSystemHours({
    modules: input.modules_count,
    screens: input.screens_count,
    apis: input.apis_count,
    complexity: input.complexity,
    settings,
  });
  const hours = resolveFinalHours({
    systemHours,
    adjustedHours: input.adjusted_hours,
    hoursOverride: input.hours_override,
  });
  const resources = await hydrateResourceCosts(input.resources);
  const resourceCost = resources.reduce((sum, r) => sum + num(r.total_resource_cost), 0);
  const opsCost = projectOperationalCost(hours.final, overhead.operational_cost_per_hour);
  const finals = finalizeProjectCost({
    resourceCost,
    operationalCost: opsCost,
    additionalCost: input.additional_cost,
    clientPrice: input.proposed_client_price,
  });
  return {
    settings,
    overhead,
    system_estimated_hours: hours.system,
    adjusted_hours: hours.adjusted,
    final_approved_hours: hours.final,
    resource_cost: Math.round(resourceCost * 100) / 100,
    operational_cost_per_hour: overhead.operational_cost_per_hour,
    project_operational_cost: opsCost,
    additional_cost: num(input.additional_cost),
    total_internal_cost: finals.totalInternalCost,
    expected_profit: finals.expectedProfit,
    profit_margin_pct: finals.profitMarginPct,
    resources,
  };
}

async function replaceResources(client: DbClient, estimateId: string, resources: EstimateResource[]) {
  await q(client, 'DELETE FROM cost_center_estimate_resources WHERE estimate_id = $1', [estimateId]);
  for (const resource of resources) {
    await q(
      client,
      `INSERT INTO cost_center_estimate_resources
        (estimate_id, role_key, role_label, employee_id, designation, hourly_cost, cost_overridden,
         planned_hours, allocation_pct, total_resource_cost, sort_order, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        estimateId,
        resource.role_key,
        resource.role_label,
        resource.employee_id || null,
        resource.designation || null,
        num(resource.hourly_cost),
        Boolean(resource.cost_overridden),
        num(resource.planned_hours),
        num(resource.allocation_pct, 100),
        num(resource.total_resource_cost),
        resource.sort_order || 100,
        resource.notes || null,
      ]
    );
  }
}

function parseEstimateInput(body: Record<string, unknown>) {
  const estimateName = String(body.estimate_name || '').trim();
  if (!estimateName) throw new FinanceValidationError('Estimate name is required');
  const complexity = String(body.complexity || 'medium');
  if (!COMPLEXITIES.includes(complexity as Complexity)) throw new FinanceValidationError('Invalid complexity');
  const status = body.status ? String(body.status) : undefined;
  if (status && !ESTIMATE_STATUSES.includes(status as EstimateStatus)) {
    throw new FinanceValidationError('Invalid status');
  }
  return {
    estimate_name: estimateName,
    client_id: body.client_id ? String(body.client_id) : null,
    project_id: body.project_id ? String(body.project_id) : null,
    project_type: body.project_type ? String(body.project_type) : null,
    scope_summary: body.scope_summary ? String(body.scope_summary) : null,
    modules_count: Math.max(0, Math.floor(num(body.modules_count))),
    screens_count: Math.max(0, Math.floor(num(body.screens_count))),
    apis_count: Math.max(0, Math.floor(num(body.apis_count))),
    complexity,
    adjusted_hours: body.adjusted_hours == null || body.adjusted_hours === '' ? null : num(body.adjusted_hours),
    hours_override: Boolean(body.hours_override),
    additional_cost: num(body.additional_cost),
    proposed_client_price:
      body.proposed_client_price == null || body.proposed_client_price === ''
        ? null
        : num(body.proposed_client_price),
    notes: body.notes ? String(body.notes) : null,
    status: status as EstimateStatus | undefined,
    resources: normalizeResources(Array.isArray(body.resources) ? body.resources : []),
  };
}

export async function previewEstimate(body: Record<string, unknown>) {
  const input = parseEstimateInput({ estimate_name: body.estimate_name || 'Preview', ...body });
  const totals = await computeTotals(input);
  return {
    ...input,
    ...totals,
  };
}

export async function createEstimate(body: Record<string, unknown>, userId: string) {
  const input = parseEstimateInput(body);
  const totals = await computeTotals(input);
  const status = input.status || (totals.resources.length ? 'estimated' : 'draft');

  return withFinanceTx(async (client) => {
    const code = (
      await q<{ code: string }>(client, `SELECT cost_center_next_code('EST', 4) AS code`)
    ).rows[0].code;

    const { rows } = await q<Estimate>(
      client,
      `INSERT INTO cost_center_estimates (
        estimate_code, estimate_name, client_id, project_id, project_type, scope_summary,
        modules_count, screens_count, apis_count, complexity,
        system_estimated_hours, adjusted_hours, final_approved_hours, hours_override,
        resource_cost, operational_cost_per_hour, project_operational_cost, additional_cost,
        total_internal_cost, proposed_client_price, expected_profit, profit_margin_pct,
        status, notes, created_by, updated_by
      ) VALUES (
        $1,$2,$3,$4,$5,$6,
        $7,$8,$9,$10,
        $11,$12,$13,$14,
        $15,$16,$17,$18,
        $19,$20,$21,$22,
        $23,$24,$25,$25
      ) RETURNING *`,
      [
        code,
        input.estimate_name,
        input.client_id,
        input.project_id,
        input.project_type,
        input.scope_summary,
        input.modules_count,
        input.screens_count,
        input.apis_count,
        input.complexity,
        totals.system_estimated_hours,
        totals.adjusted_hours,
        totals.final_approved_hours,
        input.hours_override,
        totals.resource_cost,
        totals.operational_cost_per_hour,
        totals.project_operational_cost,
        totals.additional_cost,
        totals.total_internal_cost,
        input.proposed_client_price,
        totals.expected_profit,
        totals.profit_margin_pct,
        status,
        input.notes,
        userId,
      ]
    );

    await replaceResources(client, rows[0].id, totals.resources);
    await writeCostCenterAudit(client, {
      userId,
      entityType: 'estimate',
      entityId: rows[0].id,
      estimateId: rows[0].id,
      action: 'estimate_created',
      next: { ...rows[0], resources: totals.resources },
    });

    return getEstimate(rows[0].id);
  });
}

export async function updateEstimate(id: string, body: Record<string, unknown>, userId: string) {
  const existing = await getEstimate(id);
  if (existing.status === 'archived') throw new FinanceValidationError('Archived estimates cannot be edited');

  const input = parseEstimateInput({ ...existing, ...body, estimate_name: body.estimate_name ?? existing.estimate_name });
  if (!Array.isArray(body.resources)) {
    input.resources = (existing.resources || []).map((r) => ({
      ...r,
      hourly_cost: num(r.hourly_cost),
      planned_hours: num(r.planned_hours),
      allocation_pct: num(r.allocation_pct, 100),
    }));
  }
  const totals = await computeTotals(input);
  const nextStatus = input.status || existing.status;

  return withFinanceTx(async (client) => {
    const hoursChanged =
      num(existing.system_estimated_hours) !== totals.system_estimated_hours ||
      num(existing.adjusted_hours) !== num(totals.adjusted_hours) ||
      num(existing.final_approved_hours) !== totals.final_approved_hours;
    const costChanged =
      num(existing.resource_cost) !== totals.resource_cost ||
      num(existing.project_operational_cost) !== totals.project_operational_cost ||
      num(existing.total_internal_cost) !== totals.total_internal_cost;
    const teamChanged = JSON.stringify(existing.resources || []) !== JSON.stringify(totals.resources);

    const { rows } = await q<Estimate>(
      client,
      `UPDATE cost_center_estimates SET
        estimate_name=$1, client_id=$2, project_id=$3, project_type=$4, scope_summary=$5,
        modules_count=$6, screens_count=$7, apis_count=$8, complexity=$9,
        system_estimated_hours=$10, adjusted_hours=$11, final_approved_hours=$12, hours_override=$13,
        resource_cost=$14, operational_cost_per_hour=$15, project_operational_cost=$16, additional_cost=$17,
        total_internal_cost=$18, proposed_client_price=$19, expected_profit=$20, profit_margin_pct=$21,
        status=$22, notes=$23, version=version+1, updated_by=$24, updated_at=NOW()
       WHERE id=$25
       RETURNING *`,
      [
        input.estimate_name,
        input.client_id,
        input.project_id,
        input.project_type,
        input.scope_summary,
        input.modules_count,
        input.screens_count,
        input.apis_count,
        input.complexity,
        totals.system_estimated_hours,
        totals.adjusted_hours,
        totals.final_approved_hours,
        input.hours_override,
        totals.resource_cost,
        totals.operational_cost_per_hour,
        totals.project_operational_cost,
        totals.additional_cost,
        totals.total_internal_cost,
        input.proposed_client_price,
        totals.expected_profit,
        totals.profit_margin_pct,
        nextStatus,
        input.notes,
        userId,
        id,
      ]
    );

    await replaceResources(client, id, totals.resources);

    if (hoursChanged) {
      await writeCostCenterAudit(client, {
        userId,
        entityType: 'estimate',
        entityId: id,
        estimateId: id,
        action: 'hours_modified',
        previous: {
          system_estimated_hours: existing.system_estimated_hours,
          adjusted_hours: existing.adjusted_hours,
          final_approved_hours: existing.final_approved_hours,
        },
        next: {
          system_estimated_hours: totals.system_estimated_hours,
          adjusted_hours: totals.adjusted_hours,
          final_approved_hours: totals.final_approved_hours,
        },
      });
    }
    if (teamChanged) {
      await writeCostCenterAudit(client, {
        userId,
        entityType: 'estimate',
        entityId: id,
        estimateId: id,
        action: 'team_changed',
        previous: existing.resources,
        next: totals.resources,
      });
    }
    if (costChanged) {
      await writeCostCenterAudit(client, {
        userId,
        entityType: 'estimate',
        entityId: id,
        estimateId: id,
        action: 'cost_changed',
        previous: {
          resource_cost: existing.resource_cost,
          project_operational_cost: existing.project_operational_cost,
          total_internal_cost: existing.total_internal_cost,
        },
        next: {
          resource_cost: totals.resource_cost,
          project_operational_cost: totals.project_operational_cost,
          total_internal_cost: totals.total_internal_cost,
        },
      });
    }
    if (nextStatus !== existing.status) {
      await writeCostCenterAudit(client, {
        userId,
        entityType: 'estimate',
        entityId: id,
        estimateId: id,
        action: nextStatus === 'approved' ? 'estimate_approved' : 'status_changed',
        previous: { status: existing.status },
        next: { status: nextStatus },
      });
      if (nextStatus === 'approved') {
        await q(
          client,
          `UPDATE cost_center_estimates SET approved_by=$1, approved_at=NOW() WHERE id=$2`,
          [userId, id]
        );
      }
    }

    return { ...rows[0], resources: totals.resources };
  }).then(() => getEstimate(id));
}

export async function setEstimateStatus(id: string, status: EstimateStatus, userId: string) {
  if (!ESTIMATE_STATUSES.includes(status)) throw new FinanceValidationError('Invalid status');
  const existing = await getEstimate(id);
  return updateEstimate(id, { status }, userId).then(async (row) => {
    if (status === 'approved' && existing.status !== 'approved') {
      /* audit already written in updateEstimate */
    }
    return row;
  });
}
