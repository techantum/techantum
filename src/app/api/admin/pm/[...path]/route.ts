import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { financeErrorResponse, fileResponse, streamFileResponse } from '@/lib/finance/http';
import { q } from '@/lib/finance/db';
import { hasPmPermission, type PmPermission } from '@/lib/pm/permissions';
import { archiveProject, createProject, getProject, listProjects, updateProject } from '@/lib/pm/projects';
import { getDailyUpdate, prefillDaily, saveDailyUpdate, todayBoard } from '@/lib/pm/daily';
import { listOnboarding, saveOnboarding } from '@/lib/pm/onboarding';
import { listTeam, saveTeamProfile } from '@/lib/pm/team';
import { allocationSummary, employeeCapacity, listAllocations, releaseAllocation, saveAllocation } from '@/lib/pm/allocations';
import { listScope, saveScope, updateScope } from '@/lib/pm/scope';
import { processDashboard, projectDashboard } from '@/lib/pm/dashboard';
import { getRegisterRow, listRegister, lookupOptions, registerByKey, saveRegister } from '@/lib/pm/registers';
import { evidenceFile, listEvidence, saveEvidence } from '@/lib/pm/files';
import { addProjectFile, addProjectUrl, projectFile, removeProjectFile } from '@/lib/pm/project-files';
import { exportPmReport } from '@/lib/pm/reports';
import { importPmRows } from '@/lib/pm/import-data';
import {
  createProjectFromRequirement,
  createRequirementLink,
  createTicket,
  listRequirementLinks,
  listTickets,
  previewProjectMessage,
  previewTicketMessage,
  sendProjectMessage,
  sendTicketMessage,
} from '@/lib/pm/client-updates';
import { FinanceForbiddenError } from '@/lib/finance/errors';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function gate(permission: PmPermission) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth;
  if (!hasPmPermission(auth.role, permission)) {
    return { error: NextResponse.json({ error: 'You do not have permission for this action' }, { status: 403 }) };
  }
  return auth;
}

async function readBody(request: Request) {
  const type = request.headers.get('content-type') || '';
  if (type.includes('application/json')) return request.json();
  return {};
}

export async function GET(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  try {
    const { path = [] } = await context.params;
    const url = new URL(request.url);
    const [a, b, c] = path;
    if (a === 'lookups') {
      const auth = await gate('project.view');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await lookupOptions());
    }
    if (a === 'dashboard') {
      const auth = await gate('project.dashboard.view');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await projectDashboard());
    }
    if (a === 'process-dashboard') {
      const auth = await gate('process.dashboard.view');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await processDashboard(url.searchParams.get('projectId') || undefined));
    }
    if (a === 'projects' && !b) {
      const auth = await gate('project.view');
      if ('error' in auth && auth.error) return auth.error;
      const data = await listProjects({
        q: url.searchParams.get('q') || undefined,
        category: url.searchParams.get('category') || undefined,
        typeId: url.searchParams.get('typeId') || undefined,
        accountManagerId: url.searchParams.get('accountManagerId') || undefined,
        srEngineerId: url.searchParams.get('srEngineerId') || undefined,
        leadDeveloperId: url.searchParams.get('leadDeveloperId') || undefined,
        juniorId: url.searchParams.get('juniorId') || undefined,
        rag: url.searchParams.get('rag') || undefined,
        priority: url.searchParams.get('priority') || undefined,
        phaseId: url.searchParams.get('phaseId') || undefined,
        health: url.searchParams.get('health') || undefined,
        page: Number(url.searchParams.get('page') || 1),
        pageSize: Number(url.searchParams.get('pageSize') || 100),
      });
      return NextResponse.json(data);
    }
    if (a === 'projects' && b && c === 'requirements' && path[3]) {
      const auth = await gate('project.view');
      if ('error' in auth && auth.error) return auth.error;
      const file = await projectFile(path[3]);
      return streamFileResponse(file.path, String(file.row.original_filename || 'requirement'), String(file.row.mime_type || 'application/octet-stream'), 'attachment');
    }
    if (a === 'projects' && b) {
      const auth = await gate('project.view');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await getProject(b));
    }
    if (a === 'daily' && b === 'prefill') {
      const auth = await gate('project.daily_update.add');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await prefillDaily(url.searchParams.get('projectId') || '', url.searchParams.get('date') || undefined));
    }
    if (a === 'daily' && b) {
      const auth = await gate('project.view');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await getDailyUpdate(b));
    }
    if (a === 'daily') {
      const auth = await gate('project.view');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await todayBoard());
    }
    if (a === 'onboarding') {
      const auth = await gate('project.view');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json({ rows: await listOnboarding() });
    }
    if (a === 'team' && b === 'capacity') {
      const auth = await gate('project.team.view');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json({ rows: await employeeCapacity() });
    }
    if (a === 'team' && b === 'allocations') {
      const auth = await gate('project.team.view');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json({ rows: await listAllocations(url.searchParams.get('projectId') || undefined), summary: await allocationSummary() });
    }
    if (a === 'team' && !b) {
      const auth = await gate('project.view');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json({ rows: await listTeam() });
    }
    if (a === 'tickets') {
      const auth = await gate('project.view');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json({ rows: await listTickets(url.searchParams.get('projectId') || undefined) });
    }
    if (a === 'requirements' && b === 'scope') {
      const auth = await gate('project.requirement.view');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json({ rows: await listScope({
        projectId: url.searchParams.get('projectId') || undefined,
        status: url.searchParams.get('status') || undefined,
        priority: url.searchParams.get('priority') || undefined,
        q: url.searchParams.get('q') || undefined,
      }) });
    }
    if (a === 'requirements' && !b) {
      const auth = await gate('project.view');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json({ rows: await listRequirementLinks() });
    }
    if (a === 'registers' && b && c) {
      const def = registerByKey(b);
      const auth = await gate(def.view);
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await getRegisterRow(b, c));
    }
    if (a === 'registers' && b) {
      const def = registerByKey(b);
      const auth = await gate(def.view);
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await listRegister(b, {
        q: url.searchParams.get('q') || undefined,
        status: url.searchParams.get('status') || undefined,
        projectId: url.searchParams.get('projectId') || undefined,
        page: Number(url.searchParams.get('page') || 1),
      }));
    }
    if (a === 'evidence' && b === 'file' && c) {
      const auth = await gate('process.dashboard.view');
      if ('error' in auth && auth.error) return auth.error;
      const file = await evidenceFile(c);
      return streamFileResponse(file.path, String(file.row.original_filename), String(file.row.mime_type), 'attachment');
    }
    if (a === 'evidence') {
      const auth = await gate('process.dashboard.view');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json({ rows: await listEvidence({ entityType: url.searchParams.get('entityType') || undefined, entityId: url.searchParams.get('entityId') || undefined, q: url.searchParams.get('q') || undefined }) });
    }
    if (a === 'reports' && b) {
      const auth = await gate('process.report.export');
      if ('error' in auth && auth.error) return auth.error;
      const file = await exportPmReport(b);
      return fileResponse(file.buffer, file.filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    }
    if (a === 'audit') {
      const auth = await gate('project.dashboard.view');
      if ('error' in auth && auth.error) return auth.error;
      const { rows } = await q(undefined, `SELECT id, entity_type, entity_id, action, changed_fields, user_id, created_at FROM project_management_audit_logs ORDER BY created_at DESC LIMIT 100`);
      return NextResponse.json({ rows });
    }
    if (a === 'settings') {
      const auth = await gate('project.edit');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await lookupOptions());
    }
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (err) {
    return financeErrorResponse(err);
  }
}

export async function POST(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  try {
    const { path = [] } = await context.params;
    const [a, b, c] = path;
    if (a === 'projects' && b && c === 'whatsapp' && path[3] === 'preview') {
      const auth = await gate('project.view');
      if ('error' in auth && auth.error) return auth.error;
      const body = await readBody(request);
      return NextResponse.json(await previewProjectMessage(b, body.kind === 'update' ? 'update' : 'welcome', String(body.note || '')));
    }
    if (a === 'projects' && b && c === 'whatsapp' && path[3] === 'send') {
      const auth = await gate('project.edit');
      if ('error' in auth && auth.error) return auth.error;
      const body = await readBody(request);
      return NextResponse.json(await sendProjectMessage(b, String(body.message || ''), auth.user.id, String(body.kind || 'welcome')));
    }
    if (a === 'projects' && b && c === 'requirements') {
      const auth = await gate('project.edit');
      if ('error' in auth && auth.error) return auth.error;
      const contentType = request.headers.get('content-type') || '';
      if (contentType.includes('multipart/form-data')) {
        const form = await request.formData();
        const file = form.get('file');
        if (!(file instanceof File)) return NextResponse.json({ error: 'Choose a PDF or image' }, { status: 400 });
        return NextResponse.json(await addProjectFile(b, file, auth.user.id));
      }
      const body = await readBody(request);
      if (body.remove_id) return NextResponse.json(await removeProjectFile(String(body.remove_id), auth.user.id));
      return NextResponse.json(await addProjectUrl(b, String(body.url || ''), auth.user.id));
    }
    if (a === 'projects' && c === 'archive') {
      const auth = await gate('project.archive');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await archiveProject(b, auth.user.id));
    }
    if (a === 'projects') {
      const auth = await gate('project.create');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await createProject(await readBody(request), auth.user.id));
    }
    if (a === 'daily') {
      const auth = await gate('project.daily_update.add');
      if ('error' in auth && auth.error) return auth.error;
      const body = await readBody(request);
      const remarks = hasPmPermission(auth.role, 'project.manager_remarks.edit');
      return NextResponse.json(await saveDailyUpdate(body, auth.user.id, remarks));
    }
    if (a === 'onboarding' && b) {
      const auth = await gate('project.onboarding.manage');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await saveOnboarding(b, await readBody(request), auth.user.id));
    }
    if (a === 'tickets' && b && c === 'whatsapp' && path[3] === 'preview') {
      const auth = await gate('project.view');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await previewTicketMessage(b));
    }
    if (a === 'tickets' && b && c === 'whatsapp' && path[3] === 'send') {
      const auth = await gate('project.edit');
      if ('error' in auth && auth.error) return auth.error;
      const body = await readBody(request);
      return NextResponse.json(await sendTicketMessage(b, String(body.message || ''), auth.user.id));
    }
    if (a === 'tickets') {
      const auth = await gate('project.edit');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await createTicket(await readBody(request), auth.user.id));
    }
    if (a === 'team' && b === 'allocations' && c === 'release' && path[3]) {
      const auth = await gate('project.team.manage');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await releaseAllocation(path[3], auth.user.id));
    }
    if (a === 'team' && b === 'allocations') {
      const auth = await gate('project.team.manage');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await saveAllocation(await readBody(request), auth.user.id));
    }
    if (a === 'requirements' && b === 'scope') {
      const auth = await gate('project.requirement.create');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await saveScope(await readBody(request), auth.user.id));
    }
    if (a === 'requirements' && b && c === 'create-project') {
      const auth = await gate('project.create');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await createProjectFromRequirement(b, auth.user.id));
    }
    if (a === 'requirements') {
      const auth = await gate('project.create');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await createRequirementLink(await readBody(request), auth.user.id));
    }
    if (a === 'team') {
      const auth = await gate('project.team.manage');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await saveTeamProfile(await readBody(request), auth.user.id));
    }
    if (a === 'registers' && b) {
      const def = registerByKey(b);
      const auth = await gate(def.manage);
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await saveRegister(b, await readBody(request), auth.user.id));
    }
    if (a === 'evidence') {
      const auth = await gate('process.asset.manage');
      if ('error' in auth && auth.error) return auth.error;
      const form = await request.formData();
      const file = form.get('file');
      if (!(file instanceof File)) throw new FinanceForbiddenError('Choose a file');
      return NextResponse.json(await saveEvidence(file, {
        entityType: String(form.get('entityType') || ''),
        entityId: String(form.get('entityId') || '') || null,
        description: String(form.get('description') || ''),
        userId: auth.user.id,
      }));
    }
    if (a === 'import') {
      const auth = await gate('project.edit');
      if ('error' in auth && auth.error) return auth.error;
      const body = await readBody(request);
      return NextResponse.json(await importPmRows(String(body.kind || ''), Array.isArray(body.rows) ? body.rows : [], auth.user.id));
    }
    if (a === 'settings' && b === 'types') {
      const auth = await gate('project.edit');
      if ('error' in auth && auth.error) return auth.error;
      const body = await readBody(request);
      const { rows } = await q(undefined, `INSERT INTO project_management_project_types (name, sort_order) VALUES ($1, 100) ON CONFLICT (name) DO NOTHING RETURNING *`, [String(body.name || '').trim()]);
      return NextResponse.json(rows[0]);
    }
    if (a === 'settings' && b === 'phases') {
      const auth = await gate('project.edit');
      if ('error' in auth && auth.error) return auth.error;
      const body = await readBody(request);
      const { rows } = await q(undefined, `INSERT INTO project_management_phases (name, sort_order) VALUES ($1, COALESCE((SELECT MAX(sort_order)+1 FROM project_management_phases),1)) ON CONFLICT (name) DO NOTHING RETURNING *`, [String(body.name || '').trim()]);
      return NextResponse.json(rows[0] || { ok: true });
    }
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (err) {
    return financeErrorResponse(err);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  try {
    const { path = [] } = await context.params;
    const [a, b] = path;
    if (a === 'requirements' && b === 'scope' && path[2]) {
      const auth = await gate('project.requirement.update');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await updateScope(path[2], await readBody(request), auth.user.id));
    }
    if (a === 'projects' && b) {
      const auth = await gate('project.edit');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await updateProject(b, await readBody(request), auth.user.id));
    }
    if (a === 'daily' && b) {
      const auth = await gate('project.daily_update.edit');
      if ('error' in auth && auth.error) return auth.error;
      const body = await readBody(request);
      return NextResponse.json(await saveDailyUpdate({ ...body, id: b }, auth.user.id, hasPmPermission(auth.role, 'project.manager_remarks.edit')));
    }
    if (a === 'registers' && b && path[2]) {
      const def = registerByKey(b);
      const auth = await gate(def.manage);
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await saveRegister(b, { ...(await readBody(request)), id: path[2] }, auth.user.id));
    }
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (err) {
    return financeErrorResponse(err);
  }
}
