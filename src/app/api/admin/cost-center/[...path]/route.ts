import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { financeErrorResponse, fileResponse } from '@/lib/finance/http';
import { listCostCenterAudit } from '@/lib/cost-center/audit';
import { costCenterDashboard } from '@/lib/cost-center/dashboard';
import {
  createEstimate,
  getEstimate,
  listEstimates,
  previewEstimate,
  setEstimateStatus,
  updateEstimate,
} from '@/lib/cost-center/estimates';
import { costCenterLookups } from '@/lib/cost-center/lookups';
import {
  deleteOperationalCost,
  listOperationalCosts,
  overheadSnapshot,
  saveOperationalCost,
} from '@/lib/cost-center/operational';
import { deleteRoleRate, listRoleRates, saveRoleRate } from '@/lib/cost-center/rates';
import { buildCostCenterReport, exportCostCenterReport, type CostCenterReportType } from '@/lib/cost-center/reports';
import { getSettings, updateSettings } from '@/lib/cost-center/settings';
import type { EstimateStatus } from '@/lib/cost-center/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function gate(level: 'READ' | 'FULL' = 'READ') {
  return requireAdmin({ feature: 'cost-center', level });
}

async function readBody(request: Request) {
  const type = request.headers.get('content-type') || '';
  if (type.includes('application/json')) return request.json();
  return {};
}

export async function GET(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  try {
    const auth = await gate();
    if ('error' in auth && auth.error) return auth.error;
    const { path = [] } = await context.params;
    const url = new URL(request.url);
    const [a, b, c] = path;

    if (!a || a === 'dashboard') {
      return NextResponse.json(await costCenterDashboard());
    }
    if (a === 'lookups') {
      return NextResponse.json(await costCenterLookups());
    }
    if (a === 'settings') {
      return NextResponse.json(await getSettings());
    }
    if (a === 'overhead') {
      return NextResponse.json(await overheadSnapshot());
    }
    if (a === 'rates') {
      return NextResponse.json({ rows: await listRoleRates(url.searchParams.get('active') === '1') });
    }
    if (a === 'operational-costs') {
      return NextResponse.json({
        rows: await listOperationalCosts(url.searchParams.get('active') === '1'),
        overhead: await overheadSnapshot(),
      });
    }
    if (a === 'estimates' && !b) {
      return NextResponse.json(
        await listEstimates({
          q: url.searchParams.get('q') || undefined,
          status: url.searchParams.get('status') || undefined,
          clientId: url.searchParams.get('clientId') || undefined,
          page: Number(url.searchParams.get('page') || 1),
          pageSize: Number(url.searchParams.get('pageSize') || 25),
        })
      );
    }
    if (a === 'estimates' && b && c === 'audit') {
      return NextResponse.json({ rows: await listCostCenterAudit({ estimateId: b }) });
    }
    if (a === 'estimates' && b) {
      return NextResponse.json(await getEstimate(b));
    }
    if (a === 'audit') {
      return NextResponse.json({ rows: await listCostCenterAudit({ limit: Number(url.searchParams.get('limit') || 100) }) });
    }
    if (a === 'reports' && b === 'export') {
      const type = (url.searchParams.get('type') || 'project_cost') as CostCenterReportType;
      const { buffer, filename } = await exportCostCenterReport(type);
      return fileResponse(
        buffer,
        filename,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
    }
    if (a === 'reports') {
      const type = (url.searchParams.get('type') || 'project_cost') as CostCenterReportType;
      return NextResponse.json(await buildCostCenterReport(type));
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (err) {
    return financeErrorResponse(err);
  }
}

export async function POST(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  try {
    const auth = await gate('FULL');
    if ('error' in auth && auth.error) return auth.error;
    const userId = auth.user.id;
    const { path = [] } = await context.params;
    const body = await readBody(request);
    const [a, b, c] = path;

    if (a === 'settings') {
      return NextResponse.json(await updateSettings(body, userId));
    }
    if (a === 'rates' && !b) {
      return NextResponse.json(await saveRoleRate(body, userId));
    }
    if (a === 'rates' && b) {
      return NextResponse.json(await saveRoleRate(body, userId, b));
    }
    if (a === 'operational-costs' && !b) {
      return NextResponse.json(await saveOperationalCost(body, userId));
    }
    if (a === 'operational-costs' && b) {
      return NextResponse.json(await saveOperationalCost(body, userId, b));
    }
    if (a === 'estimates' && b === 'preview') {
      return NextResponse.json(await previewEstimate(body));
    }
    if (a === 'estimates' && !b) {
      return NextResponse.json(await createEstimate(body, userId));
    }
    if (a === 'estimates' && b && c === 'status') {
      return NextResponse.json(await setEstimateStatus(b, String(body.status) as EstimateStatus, userId));
    }
    if (a === 'estimates' && b) {
      return NextResponse.json(await updateEstimate(b, body, userId));
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (err) {
    return financeErrorResponse(err);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  return POST(request, context);
}

export async function DELETE(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  try {
    const auth = await gate('FULL');
    if ('error' in auth && auth.error) return auth.error;
    const userId = auth.user.id;
    const { path = [] } = await context.params;
    const [a, b] = path;

    if (a === 'rates' && b) {
      return NextResponse.json(await deleteRoleRate(b, userId));
    }
    if (a === 'operational-costs' && b) {
      return NextResponse.json(await deleteOperationalCost(b, userId));
    }
    if (a === 'estimates' && b) {
      return NextResponse.json(await setEstimateStatus(b, 'archived', userId));
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (err) {
    return financeErrorResponse(err);
  }
}
