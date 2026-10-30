import { q } from '@/lib/finance/db';
import { createTicket } from '@/lib/pm/client-updates';
import { DEFAULT_SETTINGS } from './defaults';
import { compareFindings, scoreDelta } from './compare';
import type { AuditSettings, FindingStatus } from './types';

type Row = Record<string, unknown>;

export async function getSettings(): Promise<AuditSettings> {
  const { rows } = await q<Row>(undefined, `SELECT * FROM website_audit_settings WHERE id='default'`);
  if (!rows[0]) return DEFAULT_SETTINGS;
  return {
    ...DEFAULT_SETTINGS,
    ...rows[0],
    default_max_pages: Number(rows[0].default_max_pages),
    max_pages: Number(rows[0].max_pages),
    ai_max_pages: Number(rows[0].ai_max_pages),
    score_weights: { ...DEFAULT_SETTINGS.score_weights, ...(rows[0].score_weights as object) },
    severity_penalties: { ...DEFAULT_SETTINGS.severity_penalties, ...(rows[0].severity_penalties as object) },
    ai_confidence_threshold: Number(rows[0].ai_confidence_threshold),
    crawl_delay_ms: Number(rows[0].crawl_delay_ms),
    page_timeout_ms: Number(rows[0].page_timeout_ms),
    max_depth: Number(rows[0].max_depth),
    max_content_chars: Number(rows[0].max_content_chars),
  };
}

export async function saveSettings(body: Partial<AuditSettings>) {
  const current = await getSettings();
  const next = { ...current, ...body };
  await q(
    undefined,
    `INSERT INTO website_audit_settings (
      id, default_max_pages, max_pages, ai_review_enabled, ai_max_pages, desktop_enabled, mobile_enabled,
      lighthouse_enabled, accessibility_enabled, forms_enabled, score_weights, severity_penalties,
      ai_confidence_threshold, crawl_delay_ms, page_timeout_ms, max_depth, max_content_chars, updated_at
    ) VALUES ('default',$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW())
    ON CONFLICT (id) DO UPDATE SET
      default_max_pages=EXCLUDED.default_max_pages, max_pages=EXCLUDED.max_pages,
      ai_review_enabled=EXCLUDED.ai_review_enabled, ai_max_pages=EXCLUDED.ai_max_pages,
      desktop_enabled=EXCLUDED.desktop_enabled, mobile_enabled=EXCLUDED.mobile_enabled,
      lighthouse_enabled=EXCLUDED.lighthouse_enabled, accessibility_enabled=EXCLUDED.accessibility_enabled,
      forms_enabled=EXCLUDED.forms_enabled, score_weights=EXCLUDED.score_weights,
      severity_penalties=EXCLUDED.severity_penalties, ai_confidence_threshold=EXCLUDED.ai_confidence_threshold,
      crawl_delay_ms=EXCLUDED.crawl_delay_ms, page_timeout_ms=EXCLUDED.page_timeout_ms,
      max_depth=EXCLUDED.max_depth, max_content_chars=EXCLUDED.max_content_chars, updated_at=NOW()`,
    [
      next.default_max_pages, next.max_pages, next.ai_review_enabled, next.ai_max_pages, next.desktop_enabled,
      next.mobile_enabled, next.lighthouse_enabled, next.accessibility_enabled, next.forms_enabled,
      JSON.stringify(next.score_weights), JSON.stringify(next.severity_penalties), next.ai_confidence_threshold,
      next.crawl_delay_ms, next.page_timeout_ms, next.max_depth, next.max_content_chars,
    ]
  );
  return getSettings();
}

export async function createAudit(body: Record<string, unknown>, userId: string) {
  const settings = await getSettings();
  const name = String(body.audit_name || '').trim();
  const websiteUrl = String(body.website_url || '').trim();
  if (!name) throw new Error('Audit name is required');
  if (!websiteUrl) throw new Error('Website URL is required');
  const { assertPublicHttpUrl } = await import('./url');
  const normalized = await assertPublicHttpUrl(websiteUrl);
  const maxPages = Math.max(1, Math.min(settings.max_pages, Number(body.max_pages || settings.default_max_pages)));
  const scope = ['single', 'website', 'selected'].includes(String(body.audit_scope)) ? String(body.audit_scope) : 'website';
  const environment = ['development', 'staging', 'production', 'custom'].includes(String(body.environment)) ? String(body.environment) : 'production';
  const { rows } = await q<Row>(
    undefined,
    `INSERT INTO website_audits (
      audit_name, website_url, normalized_url, project_id, environment, custom_environment, audit_scope,
      selected_urls, max_pages, desktop_enabled, mobile_enabled, forms_enabled, ai_enabled, notes, status, created_by, parent_audit_id
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12,$13,$14,'queued',$15,$16) RETURNING *`,
    [
      name, websiteUrl, normalized, body.project_id || null, environment,
      body.custom_environment || null, scope, JSON.stringify(body.selected_urls || []), maxPages,
      body.desktop_enabled !== false, body.mobile_enabled !== false, Boolean(body.forms_enabled),
      Boolean(body.ai_enabled), body.notes || null, userId, body.parent_audit_id || null,
    ]
  );
  return rows[0];
}

export async function rerunAudit(id: string, userId: string) {
  const current = await getAudit(id);
  return createAudit({
    audit_name: `${current.audit.audit_name} (re-run)`,
    website_url: current.audit.website_url,
    project_id: current.audit.project_id,
    environment: current.audit.environment,
    custom_environment: current.audit.custom_environment,
    audit_scope: current.audit.audit_scope,
    selected_urls: current.audit.selected_urls,
    max_pages: current.audit.max_pages,
    desktop_enabled: current.audit.desktop_enabled,
    mobile_enabled: current.audit.mobile_enabled,
    forms_enabled: current.audit.forms_enabled,
    ai_enabled: current.audit.ai_enabled,
    notes: current.audit.notes,
    parent_audit_id: id,
  }, userId);
}

export async function overview() {
  const month = await q<Row>(undefined, `SELECT COUNT(*)::int AS n FROM website_audits WHERE created_at >= date_trunc('month', NOW())`);
  const sites = await q<Row>(undefined, `SELECT COUNT(DISTINCT normalized_url)::int AS n FROM website_audits`);
  const avg = await q<Row>(undefined, `SELECT ROUND(AVG(overall_score))::int AS n FROM website_audits WHERE overall_score IS NOT NULL AND created_at >= date_trunc('month', NOW())`);
  const open = await q<Row>(undefined, `SELECT
      COUNT(*) FILTER (WHERE severity='critical' AND status IN ('open','accepted','ticket_created'))::int AS critical,
      COUNT(*) FILTER (WHERE severity='high' AND status IN ('open','accepted','ticket_created'))::int AS high
    FROM website_audit_findings`);
  const recent = await q<Row>(undefined, `SELECT a.*, p.project_name,
      (SELECT COUNT(*) FROM website_audit_findings f WHERE f.audit_id=a.id AND f.severity='critical')::int AS critical_count,
      (SELECT COUNT(*) FROM website_audit_findings f WHERE f.audit_id=a.id AND f.severity='high')::int AS high_count
    FROM website_audits a
    LEFT JOIN project_management_projects p ON p.id=a.project_id
    ORDER BY a.created_at DESC LIMIT 12`);
  const last = recent.rows.find((row) => ['completed', 'partially_completed'].includes(String(row.status))) || null;
  let lastDurationMinutes: number | null = null;
  if (last?.started_at && last?.completed_at) {
    lastDurationMinutes = Math.max(1, Math.round((new Date(String(last.completed_at)).getTime() - new Date(String(last.started_at)).getTime()) / 60000));
  }
  const prevMonth = await q<Row>(undefined, `SELECT COUNT(*)::int AS n FROM website_audits WHERE created_at >= date_trunc('month', NOW()) - interval '1 month' AND created_at < date_trunc('month', NOW())`);
  const prevSites = await q<Row>(undefined, `SELECT COUNT(DISTINCT normalized_url)::int AS n FROM website_audits WHERE created_at >= date_trunc('month', NOW()) - interval '1 month' AND created_at < date_trunc('month', NOW())`);
  const prevAvg = await q<Row>(undefined, `SELECT ROUND(AVG(overall_score))::int AS n FROM website_audits WHERE overall_score IS NOT NULL AND created_at >= date_trunc('month', NOW()) - interval '1 month' AND created_at < date_trunc('month', NOW())`);
  const medium = await q<Row>(undefined, `SELECT COUNT(*)::int AS n FROM website_audit_findings WHERE severity IN ('high','medium') AND status IN ('open','accepted','ticket_created')`);
  const resolved = await q<Row>(undefined, `SELECT COUNT(*)::int AS n FROM website_audit_findings WHERE status IN ('fixed','false_positive') AND COALESCE(reviewed_at, created_at) >= date_trunc('month', NOW())`);
  const prevResolved = await q<Row>(undefined, `SELECT COUNT(*)::int AS n FROM website_audit_findings WHERE status IN ('fixed','false_positive') AND COALESCE(reviewed_at, created_at) >= date_trunc('month', NOW()) - interval '1 month' AND COALESCE(reviewed_at, created_at) < date_trunc('month', NOW())`);
  const breakdown = await q<Row>(undefined, `SELECT
      COUNT(*) FILTER (WHERE severity='critical' AND status IN ('open','accepted','ticket_created'))::int AS critical,
      COUNT(*) FILTER (WHERE severity='high' AND status IN ('open','accepted','ticket_created'))::int AS warnings,
      COUNT(*) FILTER (WHERE severity IN ('medium','low') AND status IN ('open','accepted','ticket_created'))::int AS review,
      COUNT(*) FILTER (WHERE status IN ('fixed','ignored','false_positive'))::int AS passed
    FROM website_audit_findings`);
  const series = await q<Row>(undefined, `SELECT DATE(completed_at) AS day, ROUND(AVG(overall_score))::int AS score, COUNT(*)::int AS audits
    FROM website_audits
    WHERE overall_score IS NOT NULL AND completed_at >= NOW() - interval '30 days'
    GROUP BY DATE(completed_at) ORDER BY day`);
  const agent = await q<Row>(undefined, `SELECT agent_enabled, confidence_threshold FROM web_master_agent_settings WHERE id='default'`).catch(() => ({ rows: [] as Row[] }));
  return {
    audits_this_month: month.rows[0]?.n || 0,
    websites_audited: sites.rows[0]?.n || 0,
    average_score: avg.rows[0]?.n ?? null,
    critical_open: open.rows[0]?.critical || 0,
    high_open: open.rows[0]?.high || 0,
    warnings_open: medium.rows[0]?.n || 0,
    resolved_this_month: resolved.rows[0]?.n || 0,
    previous: {
      audits_this_month: prevMonth.rows[0]?.n || 0,
      websites_audited: prevSites.rows[0]?.n || 0,
      average_score: prevAvg.rows[0]?.n ?? null,
      resolved_this_month: prevResolved.rows[0]?.n || 0,
    },
    issue_breakdown: breakdown.rows[0] || { critical: 0, warnings: 0, review: 0, passed: 0 },
    score_series: series.rows,
    agent: agent.rows[0] || { agent_enabled: true, confidence_threshold: 0.6 },
    recent: recent.rows,
    last_scan: last
      ? {
          id: last.id,
          audit_name: last.audit_name,
          website_url: last.website_url,
          pages_scanned: last.pages_scanned,
          max_pages: last.max_pages,
          overall_score: last.overall_score,
          critical_count: last.critical_count,
          high_count: last.high_count,
          duration_minutes: lastDurationMinutes,
          status: last.status,
          completed_at: last.completed_at,
          desktop_enabled: last.desktop_enabled,
          mobile_enabled: last.mobile_enabled,
          forms_enabled: last.forms_enabled,
          ai_enabled: last.ai_enabled,
        }
      : null,
  };
}

export async function listAudits(filters: { q?: string; status?: string; projectId?: string }) {
  const where = ['TRUE'];
  const values: unknown[] = [];
  if (filters.status) {
    values.push(filters.status);
    where.push(`a.status=$${values.length}`);
  }
  if (filters.projectId) {
    values.push(filters.projectId);
    where.push(`a.project_id=$${values.length}`);
  }
  if (filters.q) {
    values.push(`%${filters.q}%`);
    where.push(`(a.audit_name ILIKE $${values.length} OR a.website_url ILIKE $${values.length})`);
  }
  const { rows } = await q<Row>(
    undefined,
    `SELECT a.*, p.project_name,
       (SELECT COUNT(*) FROM website_audit_pages pg WHERE pg.audit_id=a.id)::int AS pages_count,
       (SELECT COUNT(*) FROM website_audit_findings f WHERE f.audit_id=a.id AND f.severity='critical')::int AS critical_count,
       (SELECT COUNT(*) FROM website_audit_findings f WHERE f.audit_id=a.id AND f.severity='high')::int AS high_count,
       (SELECT COUNT(*) FROM website_audit_findings f WHERE f.audit_id=a.id AND f.severity NOT IN ('critical','high'))::int AS other_count
     FROM website_audits a
     LEFT JOIN project_management_projects p ON p.id=a.project_id
     WHERE ${where.join(' AND ')}
     ORDER BY a.created_at DESC
     LIMIT 100`,
    values
  );
  return rows;
}

export async function deleteAudits(ids: string[]) {
  const unique = [...new Set(ids.map(String).filter((id) => /^[0-9a-f-]{36}$/i.test(id)))];
  if (!unique.length) throw new Error('Select at least one audit.');
  const { rowCount } = await q(
    undefined,
    `DELETE FROM website_audits WHERE id = ANY($1::uuid[])`,
    [unique]
  );
  return { deleted: rowCount || 0 };
}

export async function getAudit(id: string) {
  const { rows } = await q<Row>(
    undefined,
    `SELECT a.*, p.project_name FROM website_audits a
     LEFT JOIN project_management_projects p ON p.id=a.project_id WHERE a.id=$1`,
    [id]
  );
  if (!rows[0]) throw new Error('Audit not found');
  const pages = await q<Row>(undefined, `SELECT * FROM website_audit_pages WHERE audit_id=$1 ORDER BY created_at`, [id]);
  const findings = await q<Row>(undefined, `SELECT * FROM website_audit_findings WHERE audit_id=$1 ORDER BY
    CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 ELSE 5 END, created_at`, [id]);
  return { audit: rows[0], pages: pages.rows, findings: findings.rows };
}

export async function listFindings(id: string, filters: Record<string, string | null>) {
  const where = ['audit_id=$1'];
  const values: unknown[] = [id];
  for (const key of ['severity', 'category', 'source', 'status', 'finding_type'] as const) {
    if (filters[key]) {
      values.push(filters[key]);
      where.push(`${key}=$${values.length}`);
    }
  }
  if (filters.page) {
    values.push(`%${filters.page}%`);
    where.push(`(evidence->>'url' ILIKE $${values.length} OR COALESCE(selector,'') ILIKE $${values.length})`);
  }
  const { rows } = await q<Row>(undefined, `SELECT * FROM website_audit_findings WHERE ${where.join(' AND ')} ORDER BY created_at`, values);
  return rows;
}

export async function updateFinding(id: string, status: FindingStatus) {
  const { rows } = await q<Row>(undefined, `UPDATE website_audit_findings SET status=$2 WHERE id=$1 RETURNING *`, [id, status]);
  if (!rows[0]) throw new Error('Finding not found');
  return rows[0];
}

export async function listProjectAudits(projectId: string) {
  const { rows } = await q<Row>(
    undefined,
    `SELECT id, audit_name, environment, overall_score, status, created_at, pages_scanned,
       (SELECT COUNT(*) FROM website_audit_findings f WHERE f.audit_id=website_audits.id AND f.severity='critical')::int AS critical_count,
       (SELECT COUNT(*) FROM website_audit_findings f WHERE f.audit_id=website_audits.id AND f.severity='high')::int AS high_count
     FROM website_audits WHERE project_id=$1 ORDER BY created_at DESC LIMIT 30`,
    [projectId]
  );
  return rows;
}

function ticketPriority(severity: string) {
  if (severity === 'critical') return { priority: 'critical', type: 'BUG' };
  if (severity === 'high') return { priority: 'high', type: 'BUG' };
  if (severity === 'medium') return { priority: 'medium', type: 'BUG' };
  if (severity === 'suggestion') return { priority: 'low', type: 'improvement' };
  return { priority: 'low', type: 'BUG' };
}

export async function createTicketsFromFindings(auditId: string, findingIds: string[], userId: string, overrides?: { priority?: string; ticket_type?: string }) {
  const audit = await getAudit(auditId);
  const projectId = String(audit.audit.project_id || '');
  if (!projectId) throw new Error('Link this audit to a Project before creating tickets.');
  const created = [];
  for (const findingId of findingIds) {
    const finding = audit.findings.find((row) => String(row.id) === findingId);
    if (!finding) continue;
    const mapped = ticketPriority(String(finding.severity));
    const description = [
      `Audit ID: ${auditId}`,
      `Finding ID: ${findingId}`,
      `Type: ${finding.finding_type || 'verified_issue'}`,
      `Page: ${JSON.stringify(finding.affected_urls || finding.evidence)}`,
      `Viewport: ${finding.viewport || 'n/a'}`,
      `Issue: ${finding.description || finding.title}`,
      `Evidence: ${JSON.stringify(finding.evidence || {})}`,
      `Standard: ${JSON.stringify(finding.standard_reference || {})}`,
      `Recommendation: ${finding.recommendation || ''}`,
      `Source: ${finding.source}`,
      `Selector: ${finding.selector || ''}`,
    ].join('\n');
    const ticket = await createTicket({
      project_id: projectId,
      title: `[Website Audit] ${finding.title}`,
      ticket_type: overrides?.ticket_type || mapped.type,
      priority: overrides?.priority || mapped.priority,
      description,
    }, userId);
    await q(undefined, `UPDATE website_audit_findings SET status='ticket_created', ticket_id=$2 WHERE id=$1`, [findingId, ticket.id]);
    created.push(ticket);
  }
  return created;
}

export async function compareAudits(fromId: string, toId: string) {
  const from = await getAudit(fromId);
  const to = await getAudit(toId);
  const compared = compareFindings(
    from.findings.map((row) => ({ fingerprint: String(row.fingerprint), rule_code: String(row.rule_code), title: String(row.title), severity: String(row.severity), status: String(row.status) })),
    to.findings.map((row) => ({ fingerprint: String(row.fingerprint), rule_code: String(row.rule_code), title: String(row.title), severity: String(row.severity), status: String(row.status) }))
  );
  const scores = scoreDelta(Number(from.audit.overall_score ?? 0), Number(to.audit.overall_score ?? 0));
  const payload = { ...compared, ...scores };
  await q(
    undefined,
    `INSERT INTO website_audit_comparisons (from_audit_id, to_audit_id, previous_score, current_score, difference, fixed_count, remaining_count, new_count, payload)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [fromId, toId, scores.previous_score, scores.current_score, scores.difference, compared.fixed_count, compared.remaining_count, compared.new_count, JSON.stringify(payload)]
  );
  return { from: from.audit, to: to.audit, ...payload };
}
