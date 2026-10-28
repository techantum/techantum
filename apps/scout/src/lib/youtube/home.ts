import { q } from '../finance/db';
import { presentListedProject, type HomeProject } from './home-display';
import { currentSaasAccountId, currentYoutubePartnerId } from './scope';

export { firstNameFrom, formatAgo, greetingForHour, nextStepFor, projectInitials } from './home-display';
export type { HomeProject, ProjectNextStep } from './home-display';

function scopeSql(alias = 'p') {
  const saasId = currentSaasAccountId();
  if (saasId) return { sql: `${alias}.saas_account_id=$1`, values: [saasId] as unknown[] };
  const partnerId = currentYoutubePartnerId();
  if (partnerId) return { sql: `${alias}.partner_id=$1`, values: [partnerId] as unknown[] };
  return { sql: `${alias}.partner_id IS NULL AND ${alias}.saas_account_id IS NULL`, values: [] as unknown[] };
}

function shapeProject(row: Record<string, any>): HomeProject {
  return presentListedProject(row);
}

function utcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function utcMonday(date: Date) {
  const day = utcDay(date);
  const weekday = day.getUTCDay() || 7;
  day.setUTCDate(day.getUTCDate() - weekday + 1);
  return day;
}

function addUtcDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function dayKey(value: unknown) {
  const raw = String(value || '').trim();
  const iso = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const date = value instanceof Date ? value : new Date(raw);
  if (!Number.isFinite(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

export type ImportBucket = { key: string; label: string; count: number };

function sumDays(byDay: Map<string, number>, prefix: string) {
  let total = 0;
  for (const [day, count] of byDay) {
    if (day.startsWith(prefix)) total += count;
  }
  return total;
}

function weeklyFromDays(byDay: Map<string, number>, origin: Date) {
  const monday = utcMonday(origin);
  const thisMonday = utcMonday(new Date()).toISOString().slice(0, 10);
  const buckets: ImportBucket[] = [];
  for (let i = 7; i >= 0; i -= 1) {
    const start = addUtcDays(monday, -i * 7);
    const key = start.toISOString().slice(0, 10);
    let count = 0;
    for (let d = 0; d < 7; d += 1) count += byDay.get(addUtcDays(start, d).toISOString().slice(0, 10)) || 0;
    buckets.push({
      key,
      label: key === thisMonday ? 'This wk' : start.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      count,
    });
  }
  return buckets;
}

function buildImportCharts(rows: { day: string; count: number }[]) {
  const byDay = new Map<string, number>();
  for (const row of rows) {
    const key = dayKey(row.day);
    if (!key) continue;
    byDay.set(key, (byDay.get(key) || 0) + Number(row.count || 0));
  }
  const today = utcDay(new Date());
  const daily: ImportBucket[] = [];
  for (let i = 13; i >= 0; i -= 1) {
    const day = addUtcDays(today, -i);
    const key = day.toISOString().slice(0, 10);
    daily.push({
      key,
      label: i === 0 ? 'Today' : day.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      count: byDay.get(key) || 0,
    });
  }
  let weekly = weeklyFromDays(byDay, today);
  if (!weekly.some((item) => item.count) && byDay.size) {
    const latest = [...byDay.keys()].sort().at(-1);
    if (latest) weekly = weeklyFromDays(byDay, new Date(`${latest}T00:00:00.000Z`));
  }
  const monthly: ImportBucket[] = [];
  for (let i = 11; i >= 0; i -= 1) {
    const month = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - i, 1));
    const key = month.toISOString().slice(0, 7);
    monthly.push({
      key,
      label: i === 0 ? 'This mo' : month.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
      count: sumDays(byDay, key),
    });
  }
  const all: ImportBucket[] = [];
  const days = [...byDay.keys()].sort();
  if (days.length) {
    const start = new Date(`${days[0]}T00:00:00.000Z`);
    const spanMonths = (today.getUTCFullYear() - start.getUTCFullYear()) * 12 + (today.getUTCMonth() - start.getUTCMonth());
    if (spanMonths > 23) {
      for (let year = start.getUTCFullYear(); year <= today.getUTCFullYear(); year += 1) {
        all.push({ key: String(year), label: String(year), count: sumDays(byDay, String(year)) });
      }
    } else {
      const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
      while (cursor.getTime() <= today.getTime()) {
        const key = cursor.toISOString().slice(0, 7);
        all.push({
          key,
          label: cursor.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
          count: sumDays(byDay, key),
        });
        cursor.setUTCMonth(cursor.getUTCMonth() + 1);
      }
    }
  }
  return { daily, weekly, monthly, all };
}

export async function researchHome() {
  const scope = scopeSql('p');
  const scopedProjects = scopeSql('p2');
  const saasId = currentSaasAccountId();
  const projectSql = `FROM youtube_research_projects p
     LEFT JOIN youtube_project_channels opc ON opc.project_id=p.id AND opc.relationship='own'
     LEFT JOIN youtube_channels own ON own.id=opc.channel_id
     WHERE ${scope.sql}`;

  const [counts, channels, videos, reports, listed, weeks, latestReports, team, activity] = await Promise.all([
    q<{ todo: string; active: string; completed: string; total: string }>(
      undefined,
      `SELECT COUNT(*) FILTER (WHERE p.status='todo')::text AS todo,
              COUNT(*) FILTER (WHERE p.status='active')::text AS active,
              COUNT(*) FILTER (WHERE p.status='completed')::text AS completed,
              COUNT(*)::text AS total
       FROM youtube_research_projects p WHERE ${scope.sql}`,
      scope.values,
    ),
    q<{ own: string; competitor: string }>(
      undefined,
      `SELECT COUNT(*) FILTER (WHERE pc.relationship='own')::text AS own,
              COUNT(*) FILTER (WHERE pc.relationship='competitor')::text AS competitor
       FROM youtube_project_channels pc
       JOIN youtube_research_projects p ON p.id=pc.project_id
       WHERE ${scope.sql}`,
      scope.values,
    ),
    q<{ total: string; week: string }>(
      undefined,
      `SELECT COUNT(DISTINCT v.id)::text AS total,
              COUNT(DISTINCT v.id) FILTER (WHERE COALESCE(v.fetched_at, v.created_at) >= NOW() - INTERVAL '7 days')::text AS week
       FROM youtube_videos v
       JOIN youtube_project_channels pc ON pc.channel_id=v.channel_id
       JOIN youtube_research_projects p ON p.id=pc.project_id
       WHERE ${scope.sql}`,
      scope.values,
    ),
    q<{ total: string; month: string }>(
      undefined,
      `SELECT COUNT(*) FILTER (WHERE r.status <> 'archived')::text AS total,
              COUNT(*) FILTER (WHERE r.status <> 'archived' AND r.generated_at >= date_trunc('month', NOW()))::text AS month
       FROM youtube_research_reports r
       JOIN youtube_research_projects p ON p.id=r.project_id
       WHERE ${scope.sql}`,
      scope.values,
    ),
    q(
      undefined,
      `SELECT p.id, p.name, p.brand_name, p.industry, p.status, p.updated_at,
              own.channel_name AS own_channel_name, own.thumbnail_url AS own_thumbnail_url, own.youtube_channel_id AS own_youtube_channel_id,
              (SELECT COUNT(*) FROM youtube_project_channels pc WHERE pc.project_id=p.id AND pc.relationship='competitor') AS competitor_count,
              (SELECT COALESCE(json_agg(x), '[]'::json)
                 FROM (
                   SELECT c.channel_name AS name, c.thumbnail_url
                   FROM youtube_project_channels pc
                   JOIN youtube_channels c ON c.id=pc.channel_id
                   WHERE pc.project_id=p.id AND pc.relationship='competitor'
                   ORDER BY pc.created_at
                   LIMIT 3
                 ) x
              ) AS competitor_avatars,
              (SELECT COUNT(*) FROM youtube_videos v JOIN youtube_project_channels pc ON pc.channel_id=v.channel_id WHERE pc.project_id=p.id) AS video_count,
              (SELECT COUNT(*) FROM youtube_ai_analyses a WHERE a.project_id=p.id AND a.status='ready') AS analysis_count,
              (SELECT COUNT(*) FROM youtube_research_reports r WHERE r.project_id=p.id AND r.status <> 'archived') AS report_count
       ${projectSql}
       ORDER BY p.updated_at DESC
       LIMIT 12`,
      scope.values,
    ),
    q<{ day: string; count: number }>(
      undefined,
      `SELECT to_char(timezone('UTC', COALESCE(v.fetched_at, v.created_at)), 'YYYY-MM-DD') AS day,
              COUNT(DISTINCT v.id)::int AS count
       FROM youtube_videos v
       JOIN youtube_project_channels pc ON pc.channel_id=v.channel_id
       JOIN youtube_research_projects p ON p.id=pc.project_id
       WHERE ${scope.sql}
       GROUP BY 1`,
      scope.values,
    ),
    q(
      undefined,
      `SELECT r.id, r.name, r.report_type, r.generated_at, p.id AS project_id, p.name AS project_name
       FROM youtube_research_reports r
       JOIN youtube_research_projects p ON p.id=r.project_id
       WHERE ${scope.sql} AND r.status <> 'archived'
       ORDER BY r.generated_at DESC
       LIMIT 5`,
      scope.values,
    ),
    q<{ user_id: string; email: string; name: string; role: string }>(
      undefined,
      saasId
        ? `SELECT user_id, email, name, role FROM saas_memberships WHERE account_id=$1 ORDER BY created_at ASC LIMIT 8`
        : `SELECT NULL::uuid AS user_id, NULL::text AS email, NULL::text AS name, NULL::text AS role WHERE FALSE`,
      saasId ? [saasId] : [],
    ).catch(() => ({ rows: [] })),
    q(
      undefined,
      `SELECT l.action, l.created_at, l.metadata, l.entity_type, l.entity_id,
              COALESCE(NULLIF(sm.name, ''), split_part(sm.email, '@', 1), 'Someone') AS actor_name,
              COALESCE(l.metadata->>'projectName', p.name) AS project_name
       FROM youtube_audit_logs l
       LEFT JOIN LATERAL (
         SELECT name, email FROM saas_memberships WHERE user_id = l.actor_user_id LIMIT 1
       ) sm ON true
       LEFT JOIN youtube_research_projects p ON p.id::text = COALESCE(l.metadata->>'projectId', CASE WHEN l.entity_type='youtube_project' THEN l.entity_id END)
       WHERE (
            l.entity_id IN (SELECT p2.id::text FROM youtube_research_projects p2 WHERE ${scopedProjects.sql})
         OR COALESCE(l.metadata->>'projectId', '') IN (SELECT p2.id::text FROM youtube_research_projects p2 WHERE ${scopedProjects.sql})
         OR p.id IN (SELECT p2.id FROM youtube_research_projects p2 WHERE ${scopedProjects.sql})
       )
       ORDER BY l.created_at DESC
       LIMIT 8`,
      scope.values,
    ).catch(() => ({ rows: [] })),
  ]);

  const projects = listed.rows.map((row) => shapeProject(row as Record<string, any>));
  const resume = projects.find((project) => project.next.key !== 'ready') || projects[0] || null;
  const analysisReady = projects.filter((project) => project.video_count > 0 && project.next.key === 'analysis');
  const needsAttention = projects
    .filter((project) => project.next.action)
    .slice(0, 3)
    .map((project) => ({
      id: project.id,
      title: project.next.label,
      detail: `${project.name} ${
        project.next.key === 'competitors'
          ? `has only ${project.competitor_count}`
          : project.next.key === 'import'
            ? 'has 0 imported'
            : project.next.key === 'own'
              ? 'is a draft'
              : project.next.key === 'analysis'
                ? 'is ready for analysis'
                : 'needs a report'
      }`,
      action: project.next.action,
      href: project.next.href,
    }));

  const videoTotal = Number(videos.rows[0]?.total || 0);
  const videoWeek = Number(videos.rows[0]?.week || 0);
  const imports = buildImportCharts(weeks.rows || []);
  const weekSeries = imports.weekly;
  const previous = weekSeries.slice(0, 7).reduce((sum, item) => sum + item.count, 0);
  const last = weekSeries[weekSeries.length - 1]?.count || 0;
  const wow = previous > 0 ? Math.round(((last - previous / 7) / (previous / 7)) * 100) : 0;

  return {
    stats: {
      todoProjects: Number(counts.rows[0]?.todo || 0),
      activeProjects: Number(counts.rows[0]?.active || 0),
      completedProjects: Number(counts.rows[0]?.completed || 0),
      totalProjects: Number(counts.rows[0]?.total || 0),
      ownChannels: Number(channels.rows[0]?.own || 0),
      competitorChannels: Number(channels.rows[0]?.competitor || 0),
      videos: videoTotal,
      videosThisWeek: videoWeek,
      reports: Number(reports.rows[0]?.total || 0),
      reportsThisMonth: Number(reports.rows[0]?.month || 0),
    },
    resume,
    analysisReadyCount: analysisReady.length,
    projects,
    needsAttention,
    reports: latestReports.rows.map((row) => ({
      id: row.id,
      name: row.name,
      report_type: row.report_type,
      generated_at: row.generated_at,
      project_id: row.project_id,
      project_name: row.project_name,
    })),
    activity: activity.rows.map((row) => ({
      action: row.action,
      created_at: row.created_at,
      actor_name: row.actor_name,
      project_id: row.metadata?.projectId || row.entity_id,
      project_name: row.project_name || row.metadata?.projectName || '',
      channel_name: row.metadata?.channelName || row.metadata?.name || '',
    })),
    weeks: weekSeries.map((item) => ({ ...item, week: item.key })),
    imports,
    weekChange: wow,
    team: (team.rows || []).filter((row) => row.user_id).map((row) => ({
      user_id: row.user_id,
      name: row.name || row.email || 'Member',
      email: row.email || '',
      role: row.role || 'subscriber_user',
      active: true,
    })),
  };
}
