import { after } from 'next/server';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { isSuperAdmin } from '@/lib/admin/roles';
import { listProjects } from '@/lib/pm/projects';
import { hasPmPermission } from '@/lib/pm/permissions';
import { runAuditJob } from '@/lib/website-audit/runner';
import { findingsCsv, printableHtml, developerReport, managementReport } from '@/lib/website-audit/reports';
import {
  compareAudits,
  createAudit,
  createTicketsFromFindings,
  deleteAudits,
  getAudit,
  getSettings,
  listAudits,
  listFindings,
  overview,
  rerunAudit,
  saveSettings,
  updateFinding,
} from '@/lib/website-audit/service';
import {
  getAgentSettings,
  listChunks,
  listRules,
  listSources,
  saveAgentSettings,
  saveRule,
  saveSource,
  ensureKnowledgeSeed,
} from '@/lib/website-audit/webmaster/knowledge';
import { listFeedback, recordFeedback } from '@/lib/website-audit/webmaster/feedback';
import { runGoldenSuite } from '@/lib/website-audit/webmaster/evaluation';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

async function gate() {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth;
  if (!isSuperAdmin(auth) && !auth.rbacManaged) {
    return { error: NextResponse.json({ error: 'Website Audit is limited to Super Admin.' }, { status: 403 }) };
  }
  return auth;
}

function fail(error: unknown) {
  const message = error instanceof Error ? error.message : 'Request failed';
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  const auth = await gate();
  if ('error' in auth && auth.error) return auth.error;
  const path = (await context.params).path || [];
  const url = new URL(request.url);
  try {
    if (!path.length || path[0] === 'overview') return NextResponse.json(await overview());
    if (path[0] === 'settings') return NextResponse.json(await getSettings());
    if (path[0] === 'webmaster' && path[1] === 'settings') {
      await ensureKnowledgeSeed();
      return NextResponse.json(await getAgentSettings());
    }
    if (path[0] === 'webmaster' && path[1] === 'standards') return NextResponse.json({ sources: await listSources(), rules: await listRules() });
    if (path[0] === 'webmaster' && path[1] === 'chunks') return NextResponse.json(await listChunks(url.searchParams.get('category') || undefined));
    if (path[0] === 'webmaster' && path[1] === 'feedback') return NextResponse.json(await listFeedback(url.searchParams.get('audit_id') || undefined));
    if (path[0] === 'projects') {
      const projects = await listProjects({ pageSize: 100 });
      return NextResponse.json(projects.rows);
    }
    if (path[0] === 'audits' && path[1] && path[2] === 'findings') {
      return NextResponse.json(await listFindings(path[1], {
        severity: url.searchParams.get('severity'),
        category: url.searchParams.get('category'),
        source: url.searchParams.get('source'),
        status: url.searchParams.get('status'),
        page: url.searchParams.get('page'),
      }));
    }
    if (path[0] === 'audits' && path[1] && path[2] === 'report') {
      const data = await getAudit(path[1]);
      const mode = url.searchParams.get('mode') || 'management';
      if (url.searchParams.get('format') === 'csv') {
        return new NextResponse(findingsCsv(data.findings), {
          headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="website-audit-findings.csv"' },
        });
      }
      if (url.searchParams.get('format') === 'html') {
        return new NextResponse(printableHtml(data.audit, data.findings), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      }
      return NextResponse.json(mode === 'developer' ? developerReport(data.audit, data.findings, data.pages) : managementReport(data.audit, data.findings));
    }
    if (path[0] === 'audits' && path[1]) return NextResponse.json(await getAudit(path[1]));
    if (path[0] === 'audits') {
      return NextResponse.json(await listAudits({
        q: url.searchParams.get('q') || undefined,
        status: url.searchParams.get('status') || undefined,
        projectId: url.searchParams.get('project_id') || undefined,
      }));
    }
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  const auth = await gate();
  if ('error' in auth && auth.error) return auth.error;
  const path = (await context.params).path || [];
  const body = await request.json().catch(() => ({}));
  try {
    if (path[0] === 'audits' && !path[1]) {
      const audit = await createAudit(body, auth.user.id);
      after(() => runAuditJob(String(audit.id)));
      return NextResponse.json(audit);
    }
    if (path[0] === 'audits' && path[1] && path[2] === 'rerun') {
      const audit = await rerunAudit(path[1], auth.user.id);
      after(() => runAuditJob(String(audit.id)));
      return NextResponse.json(audit);
    }
    if (path[0] === 'audits' && path[1] && path[2] === 'compare') {
      const other = String(body.other_audit_id || body.from_audit_id || '');
      if (!other) throw new Error('Choose an audit to compare against.');
      return NextResponse.json(await compareAudits(other, path[1]));
    }
    if (path[0] === 'audits' && path[1] && path[2] === 'tickets') {
      if (!hasPmPermission(auth.role, 'project.ticket.create')) {
        return NextResponse.json({ error: 'You cannot create project tickets.' }, { status: 403 });
      }
      const ids = Array.isArray(body.finding_ids) ? body.finding_ids.map(String) : [];
      if (!ids.length) throw new Error('Select at least one finding.');
      return NextResponse.json(await createTicketsFromFindings(path[1], ids, auth.user.id, body));
    }
    if (path[0] === 'findings' && path[1] && path[2] === 'review') {
      return NextResponse.json(await recordFeedback({
        findingId: path[1],
        userId: auth.user.id,
        decision: String(body.decision || ''),
        reason: body.reason ? String(body.reason) : undefined,
        severity: body.severity ? String(body.severity) : undefined,
        recommendation: body.recommendation ? String(body.recommendation) : undefined,
        status: body.status ? String(body.status) : undefined,
      }));
    }
    if (path[0] === 'findings' && path[1]) {
      return NextResponse.json(await updateFinding(path[1], body.status));
    }
    if (path[0] === 'settings') return NextResponse.json(await saveSettings(body));
    if (path[0] === 'webmaster' && path[1] === 'settings') return NextResponse.json(await saveAgentSettings(body));
    if (path[0] === 'webmaster' && path[1] === 'standards') return NextResponse.json(await saveSource(body));
    if (path[0] === 'webmaster' && path[1] === 'rules') return NextResponse.json(await saveRule(body));
    if (path[0] === 'webmaster' && path[1] === 'evaluate') {
      return NextResponse.json(await runGoldenSuite({ live: body.live === true && process.env.AI_INTEGRATION_TEST === 'true' }));
    }
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  return POST(request, context);
}

export async function DELETE(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  const auth = await gate();
  if ('error' in auth && auth.error) return auth.error;
  const path = (await context.params).path || [];
  try {
    if (path[0] === 'audits' && path[1]) {
      return NextResponse.json(await deleteAudits([path[1]]));
    }
    if (path[0] === 'audits') {
      const body = await request.json().catch(() => ({}));
      const ids = Array.isArray(body.ids) ? body.ids.map(String) : [];
      return NextResponse.json(await deleteAudits(ids));
    }
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    return fail(error);
  }
}
