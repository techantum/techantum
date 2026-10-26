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

function weekBuckets(rows: { week: string; count: number }[]) {
  const byWeek = new Map(rows.map((row) => [String(row.week).slice(0, 10), Number(row.count || 0)]));
  const buckets = [];
  const now = new Date();
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = monday.getUTCDay() || 7;
  monday.setUTCDate(monday.getUTCDate() - day + 1);
  for (let i = 7; i >= 0; i -= 1) {
    const start = new Date(monday);
    start.setUTCDate(monday.getUTCDate() - i * 7);
    const key = start.toISOString().slice(0, 10);
    buckets.push({
      week: key,
      label: i === 0 ? 'This wk' : `W${8 - i}`,
      count: byWeek.get(key) || 0,
    });
  }
  return buckets;
}

export async function researchHome() {
  const scope = scopeSql('p');
  const scopedProjects = scopeSql('p2');
  const projectSql = `FROM youtube_research_projects p
     LEFT JOIN youtube_project_channels opc ON opc.project_id=p.id AND opc.relationship='own'
     LEFT JOIN youtube_channels own ON own.id=opc.channel_id
     WHERE ${scope.sql}`;

  const [counts, channels, videos, reports, listed, weeks, latestReports, activity] = await Promise.all([
    q<{ active: string; total: string }>(
      undefined,
      `SELECT COUNT(*) FILTER (WHERE p.status='active')::text AS active, COUNT(*)::text AS total
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
      `SELECT COUNT(*)::text AS total,
              COUNT(*) FILTER (WHERE COALESCE(v.fetched_at, v.created_at) >= NOW() - INTERVAL '7 days')::text AS week
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
      `SELECT p.id, p.name, p.brand_name, p.status, p.updated_at,
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
    q<{ week: string; count: number }>(
      undefined,
      `SELECT date_trunc('week', COALESCE(v.fetched_at, v.created_at))::date::text AS week, COUNT(*)::int AS count
       FROM youtube_videos v
       JOIN youtube_project_channels pc ON pc.channel_id=v.channel_id
       JOIN youtube_research_projects p ON p.id=pc.project_id
       WHERE ${scope.sql} AND COALESCE(v.fetched_at, v.created_at) >= date_trunc('week', NOW()) - INTERVAL '7 weeks'
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
  const weekSeries = weekBuckets(weeks.rows || []);
  const previous = weekSeries.slice(0, 7).reduce((sum, item) => sum + item.count, 0);
  const last = weekSeries[weekSeries.length - 1]?.count || 0;
  const wow = previous > 0 ? Math.round(((last - previous / 7) / (previous / 7)) * 100) : 0;

  return {
    stats: {
      activeProjects: Number(counts.rows[0]?.active || 0),
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
    weeks: weekSeries,
    weekChange: wow,
  };
}
