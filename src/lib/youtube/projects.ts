import { cache } from 'react';
import { q, withFinanceTx } from '../finance/db';
import { FinanceConflictError, FinanceNotFoundError, FinanceValidationError } from '../finance/errors';
import { categoryLabel, contentLabel, isPaidPlacement, SHORT_MAX_SECONDS, YOUTUBE_METRIC_NOTICE } from './parse';
import { isFresh, presentChannel, presentVideo } from './mask';
import { ensureChannel, performanceSummary, startImport } from './service';
import { currentYoutubePartnerId } from './scope';

export const LEGACY_PROJECT_ID = 'a0000000-0000-4000-8000-000000000001';

const PROJECT_VIDEO_FROM = `FROM youtube_videos v
  JOIN youtube_channels c ON c.id = v.channel_id
  JOIN youtube_project_channels pc ON pc.channel_id = c.id AND pc.project_id = $1
  LEFT JOIN youtube_project_video_research r ON r.video_id = v.id AND r.project_id = pc.project_id
  LEFT JOIN youtube_research_topics t ON t.id = r.topic_id AND t.project_id = pc.project_id`;

const PROJECT_VIDEO_SELECT = `SELECT v.*, c.channel_name, c.youtube_channel_id, c.last_refreshed_at AS channel_refreshed_at,
  pc.relationship, r.topic_id, r.thumbnail_caption, r.research_notes, t.name AS topic_name
  ${PROJECT_VIDEO_FROM}`;

function clean(value: unknown, max: number) {
  const text = String(value || '').trim();
  if (!text) return null;
  if (text.length > max) throw new FinanceValidationError('One of the fields is too long.');
  return text;
}

function statusOf(value: unknown) {
  const status = String(value || 'active');
  if (!['active', 'archived'].includes(status)) throw new FinanceValidationError('Status must be active or archived.');
  return status;
}

async function audit(userId: string, action: string, entityId: string | null, metadata: Record<string, unknown>) {
  await q(undefined, `INSERT INTO youtube_audit_logs (actor_user_id, action, entity_type, entity_id, metadata) VALUES ($1,$2,'youtube_project',$3,$4::jsonb)`, [userId, action, entityId, JSON.stringify(metadata)]);
}

const loadProject = cache(async (id: string, partnerKey: string) => {
  const { rows } = await q(undefined, `SELECT * FROM youtube_research_projects WHERE id=$1`, [id]);
  const partnerId = partnerKey || null;
  if (!rows[0] || (partnerId && rows[0].partner_id !== partnerId)) throw new FinanceNotFoundError('Research project not found');
  return rows[0];
});

function requireProject(id: string) {
  return loadProject(id, currentYoutubePartnerId() || '');
}

export async function listProjects(params: { q?: string; status?: string; page?: number; pageSize?: number }) {
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(params.pageSize) || 20));
  const values: unknown[] = [];
  const where = ['1=1'];
  const partnerId = currentYoutubePartnerId();
  if (partnerId) {
    values.push(partnerId);
    where.push(`p.partner_id=$${values.length}`);
  } else {
    where.push('p.partner_id IS NULL');
  }
  if (params.status === 'active' || params.status === 'archived') {
    values.push(params.status);
    where.push(`p.status=$${values.length}`);
  }
  if (params.q?.trim()) {
    values.push(`%${params.q.trim()}%`);
    where.push(`(p.name ILIKE $${values.length} OR p.brand_name ILIKE $${values.length} OR p.industry ILIKE $${values.length})`);
  }
  const [listed, count] = await Promise.all([
    q(
      undefined,
      `SELECT p.*,
       own.channel_name AS own_channel_name, own.channel_handle AS own_channel_handle, own.thumbnail_url AS own_thumbnail_url,
       own.youtube_channel_id AS own_youtube_channel_id, own.last_refreshed_at AS own_refreshed_at,
       (SELECT COUNT(*) FROM youtube_project_channels pc WHERE pc.project_id=p.id AND pc.relationship='competitor') AS competitor_count,
       (SELECT COUNT(*) FROM youtube_videos v JOIN youtube_project_channels pc ON pc.channel_id=v.channel_id WHERE pc.project_id=p.id) AS video_count
     FROM youtube_research_projects p
     LEFT JOIN youtube_project_channels opc ON opc.project_id=p.id AND opc.relationship='own'
     LEFT JOIN youtube_channels own ON own.id=opc.channel_id
     WHERE ${where.join(' AND ')}
     ORDER BY p.updated_at DESC
     LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
      values
    ),
    q<{ count: string }>(undefined, `SELECT COUNT(*)::text AS count FROM youtube_research_projects p WHERE ${where.join(' AND ')}`, values),
  ]);
  const { rows } = listed;
  return {
    rows: rows.map((row) => ({
      ...row,
      own_channel_name: isFresh(row.own_refreshed_at) ? row.own_channel_name : null,
      own_channel_handle: isFresh(row.own_refreshed_at) ? row.own_channel_handle : null,
      own_thumbnail_url: isFresh(row.own_refreshed_at) ? row.own_thumbnail_url : null,
      competitor_count: Number(row.competitor_count || 0),
      video_count: Number(row.video_count || 0),
    })),
    total: Number(count.rows[0]?.count || 0),
    page,
    pageSize,
  };
}

export async function getProject(id: string) {
  const project = await requireProject(id);
  const channels = await listProjectChannels(id);
  return { ...project, channels };
}

export async function createProject(body: Record<string, unknown>, userId: string) {
  const name = clean(body.name, 120);
  if (!name || name.length < 2) throw new FinanceValidationError('Project name is required.');
  const { rows } = await q(
    undefined,
    `INSERT INTO youtube_research_projects (name, brand_name, objective, industry, description, status, created_by, partner_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [name, clean(body.brand_name ?? body.brandName, 120), clean(body.objective, 2000), clean(body.industry, 120), clean(body.description, 5000), statusOf(body.status), userId, currentYoutubePartnerId()]
  );
  await audit(userId, 'YouTube Project Created', rows[0].id, { name });
  return rows[0];
}

export async function updateProject(id: string, body: Record<string, unknown>, userId: string) {
  await requireProject(id);
  const name = clean(body.name, 120);
  if (!name || name.length < 2) throw new FinanceValidationError('Project name is required.');
  const { rows } = await q(
    undefined,
    `UPDATE youtube_research_projects SET name=$2, brand_name=$3, objective=$4, industry=$5, description=$6, status=$7 WHERE id=$1 RETURNING *`,
    [id, name, clean(body.brand_name ?? body.brandName, 120), clean(body.objective, 2000), clean(body.industry, 120), clean(body.description, 5000), statusOf(body.status)]
  );
  await audit(userId, 'YouTube Project Updated', id, { name });
  return rows[0];
}

export async function archiveProject(id: string, userId: string) {
  const project = await requireProject(id);
  if (project.legacy) throw new FinanceValidationError('The original research project stays available so earlier notes are not hidden.');
  await q(undefined, `UPDATE youtube_research_projects SET status='archived' WHERE id=$1`, [id]);
  await audit(userId, 'YouTube Project Archived', id, {});
  return { ok: true };
}

export async function listProjectChannels(projectId: string) {
  await requireProject(projectId);
  const { rows } = await q(
    undefined,
    `SELECT c.*, pc.relationship, pc.created_at AS linked_at,
       (SELECT COUNT(*) FROM youtube_videos v WHERE v.channel_id=c.id) AS videos_imported
     FROM youtube_project_channels pc
     JOIN youtube_channels c ON c.id=pc.channel_id
     WHERE pc.project_id=$1
     ORDER BY CASE WHEN pc.relationship='own' THEN 0 ELSE 1 END, c.channel_name NULLS LAST`,
    [projectId]
  );
  return rows.map((row) => ({ ...presentChannel(row), id: row.id, youtube_channel_id: row.youtube_channel_id, relationship: row.relationship }));
}

export async function addProjectChannel(projectId: string, input: string, relationship: unknown, userId: string) {
  const project = await requireProject(projectId);
  if (project.status !== 'active') throw new FinanceValidationError('Restore this project before adding channels.');
  const kind = String(relationship || 'competitor');
  if (!['own', 'competitor'].includes(kind)) throw new FinanceValidationError('Choose own or competitor.');
  const channelId = await ensureChannel(input, userId);
  const existing = await q(undefined, `SELECT relationship FROM youtube_project_channels WHERE project_id=$1 AND channel_id=$2`, [projectId, channelId]);
  if (existing.rows[0]) throw new FinanceConflictError('This channel is already in the project.');
  await withFinanceTx(async (client) => {
    if (kind === 'own') {
      await q(client, `UPDATE youtube_project_channels SET relationship='competitor' WHERE project_id=$1 AND relationship='own'`, [projectId]);
    }
    await q(client, `INSERT INTO youtube_project_channels (project_id, channel_id, relationship) VALUES ($1,$2,$3)`, [projectId, channelId, kind]);
  });
  await audit(userId, 'YouTube Project Channel Added', projectId, { channelId, relationship: kind });
  return { channel_id: channelId, relationship: kind };
}

export async function removeProjectChannel(projectId: string, channelId: string, userId: string) {
  await requireProject(projectId);
  const { rows } = await q(undefined, `DELETE FROM youtube_project_channels WHERE project_id=$1 AND channel_id=$2 RETURNING channel_id`, [projectId, channelId]);
  if (!rows[0]) throw new FinanceNotFoundError('That channel is not in this project.');
  await audit(userId, 'YouTube Project Channel Removed', projectId, { channelId });
  return { ok: true };
}

export async function setPrimaryChannel(projectId: string, channelId: string, userId: string) {
  await requireProject(projectId);
  const link = await q(undefined, `SELECT channel_id FROM youtube_project_channels WHERE project_id=$1 AND channel_id=$2`, [projectId, channelId]);
  if (!link.rows[0]) throw new FinanceNotFoundError('Add the channel to this project before making it the own channel.');
  await withFinanceTx(async (client) => {
    await q(client, `UPDATE youtube_project_channels SET relationship='competitor' WHERE project_id=$1 AND relationship='own' AND channel_id<>$2`, [projectId, channelId]);
    await q(client, `UPDATE youtube_project_channels SET relationship='own' WHERE project_id=$1 AND channel_id=$2`, [projectId, channelId]);
  });
  await audit(userId, 'YouTube Primary Channel Changed', projectId, { channelId });
  return { ok: true };
}

export type VideoQuery = {
  projectId: string;
  q?: string;
  channelIds?: string[];
  topicId?: string;
  tag?: string;
  categoryId?: string;
  from?: string;
  to?: string;
  minViews?: string;
  maxViews?: string;
  minLikes?: string;
  maxLikes?: string;
  minComments?: string;
  maxComments?: string;
  minDuration?: string;
  maxDuration?: string;
  content?: string;
  placement?: string;
  videoIds?: string[];
  sort?: string;
  page?: number;
  pageSize?: number;
  limit?: number;
};

const SHORT_MATCH = `(
  (v.duration_seconds IS NOT NULL AND v.duration_seconds <= ${SHORT_MAX_SECONDS})
  OR COALESCE(v.title, '') ILIKE '%#shorts%'
  OR EXISTS (SELECT 1 FROM unnest(COALESCE(v.tags, ARRAY[]::text[])) tag WHERE lower(btrim(tag)) IN ('shorts', '#shorts'))
)`;

const PAID_MATCH = `(
  v.has_paid_product_placement IS TRUE
  OR EXISTS (
    SELECT 1 FROM unnest(COALESCE(v.tags, ARRAY[]::text[])) tag
    WHERE lower(btrim(tag)) IN ('ad', '#ad', 'sponsored', '#sponsored', 'paidpromotion', 'paid promotion')
  )
  OR COALESCE(v.title, '') ~* '#(ad|sponsored)([^[:alnum:]]|$)'
  OR COALESCE(v.description, '') ILIKE '%paid promotion%'
)`;

const SORTS: Record<string, string> = {
  published_at: 'v.published_at DESC NULLS LAST',
  view_count: 'v.view_count DESC NULLS LAST',
  like_count: 'v.like_count DESC NULLS LAST',
  comment_count: 'v.comment_count DESC NULLS LAST',
  title: 'v.title ASC NULLS LAST',
};

function videoWhere(params: VideoQuery) {
  const values: unknown[] = [params.projectId];
  const where = ['c.status=\'active\''];
  const fresh = `v.fetched_at > NOW() - INTERVAL '30 days'`;
  if (params.q?.trim()) {
    values.push(`%${params.q.trim()}%`);
    const n = values.length;
    where.push(`(v.youtube_video_id ILIKE $${n} OR (${fresh} AND (v.title ILIKE $${n} OR v.description ILIKE $${n} OR EXISTS (SELECT 1 FROM unnest(v.tags) tag WHERE tag ILIKE $${n}))))`);
  }
  if (params.channelIds?.length) {
    values.push(params.channelIds);
    where.push(`v.channel_id = ANY($${values.length}::uuid[])`);
  }
  if (params.topicId === 'none') where.push(`r.topic_id IS NULL`);
  else if (params.topicId) {
    values.push(params.topicId);
    where.push(`r.topic_id=$${values.length}`);
  }
  if (params.tag?.trim()) {
    values.push(`%${params.tag.trim()}%`);
    where.push(`${fresh} AND EXISTS (SELECT 1 FROM unnest(v.tags) tag WHERE tag ILIKE $${values.length})`);
  }
  if (params.videoIds?.length) {
    values.push(params.videoIds);
    where.push(`v.id = ANY($${values.length}::uuid[])`);
  }
  if (params.categoryId) {
    values.push(params.categoryId);
    where.push(`${fresh} AND v.category_id=$${values.length}`);
  }
  if (params.placement === 'paid') where.push(PAID_MATCH);
  if (params.placement === 'organic') where.push(`NOT ${PAID_MATCH}`);
  if (params.from) {
    values.push(params.from);
    where.push(`v.published_at >= $${values.length}::date`);
  }
  if (params.to) {
    values.push(params.to);
    where.push(`v.published_at < ($${values.length}::date + INTERVAL '1 day')`);
  }
  const range = (column: string, min?: string, max?: string) => {
    if (min) {
      values.push(Number(min));
      where.push(`${fresh} AND v.${column} >= $${values.length}`);
    }
    if (max) {
      values.push(Number(max));
      where.push(`${fresh} AND v.${column} <= $${values.length}`);
    }
  };
  range('view_count', params.minViews, params.maxViews);
  range('like_count', params.minLikes, params.maxLikes);
  range('comment_count', params.minComments, params.maxComments);
  range('duration_seconds', params.minDuration, params.maxDuration);
  if (params.content === 'short') where.push(`${fresh} AND ${SHORT_MATCH}`);
  if (params.content === 'video') where.push(`${fresh} AND NOT ${SHORT_MATCH}`);
  return { values, where: where.join(' AND '), sort: SORTS[params.sort || ''] || SORTS.published_at };
}

function shapeVideo(row: Record<string, unknown>) {
  const video = presentVideo(row);
  return {
    ...video,
    id: row.id,
    relationship: row.relationship,
    category_label: categoryLabel(video.category_id),
    content_label: contentLabel(video.duration_seconds as number | null, video.title as string | null, Array.isArray(video.tags) ? video.tags as string[] : null),
    placement_label: video.stale
      ? null
      : isPaidPlacement({
        hasPaidProductPlacement: video.has_paid_product_placement as boolean | null,
        title: video.title as string | null,
        description: video.description as string | null,
        tags: Array.isArray(video.tags) ? video.tags as string[] : null,
      }) ? 'Paid' : 'Organic',
  };
}

export async function listProjectVideos(params: VideoQuery & { includeTotal?: boolean }) {
  await requireProject(params.projectId);
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 20));
  const filter = videoWhere(params);
  const rowsQuery = q(undefined, `${PROJECT_VIDEO_SELECT} WHERE ${filter.where} ORDER BY ${filter.sort} LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`, filter.values);
  const countQuery = params.includeTotal === false
    ? Promise.resolve({ rows: [{ count: String(pageSize) }] })
    : q<{ count: string }>(undefined, `SELECT COUNT(*)::text AS count ${PROJECT_VIDEO_FROM} WHERE ${filter.where}`, filter.values);
  const [{ rows }, count] = await Promise.all([rowsQuery, countQuery]);
  return { rows: rows.map((row) => shapeVideo(row)), total: Number(count.rows[0]?.count || 0), page, pageSize, notice: YOUTUBE_METRIC_NOTICE };
}

export async function getProjectVideo(projectId: string, videoId: string) {
  await requireProject(projectId);
  const { rows } = await q(undefined, `${PROJECT_VIDEO_SELECT} WHERE v.id=$2`, [projectId, videoId]);
  if (!rows[0]) throw new FinanceNotFoundError('Video not found in this project');
  return shapeVideo(rows[0]);
}

export async function saveProjectResearch(projectId: string, videoId: string, body: Record<string, unknown>, userId: string) {
  const video = await getProjectVideo(projectId, videoId);
  const topicId = String(body.topic_id ?? body.topicId ?? '').trim() || null;
  if (topicId) {
    const topic = await q(undefined, `SELECT id FROM youtube_research_topics WHERE id=$1 AND project_id=$2 AND active`, [topicId, projectId]);
    if (!topic.rows[0]) throw new FinanceValidationError('Choose a topic from this project.');
  }
  const caption = clean(body.thumbnail_caption ?? body.thumbnailCaption, 500);
  const notes = clean(body.research_notes ?? body.researchNotes, 5000);
  await q(
    undefined,
    `INSERT INTO youtube_project_video_research (project_id, video_id, topic_id, thumbnail_caption, research_notes, updated_by)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (project_id, video_id) DO UPDATE SET topic_id=$3, thumbnail_caption=$4, research_notes=$5, updated_by=$6`,
    [projectId, video.id, topicId, caption, notes, userId]
  );
  await audit(userId, 'YouTube Project Research Saved', projectId, { videoId });
  return getProjectVideo(projectId, videoId);
}

export async function listProjectTopics(projectId: string) {
  await requireProject(projectId);
  const { rows } = await q(undefined, `SELECT * FROM youtube_research_topics WHERE project_id=$1 AND active ORDER BY name`, [projectId]);
  return rows;
}

export async function saveProjectTopic(projectId: string, body: Record<string, unknown>, userId: string) {
  await requireProject(projectId);
  const name = clean(body.name, 80);
  if (!name || name.length < 2) throw new FinanceValidationError('Topic name must be 2 to 80 characters.');
  try {
    const { rows } = await q(undefined, `INSERT INTO youtube_research_topics (name, description, project_id, created_by) VALUES ($1,$2,$3,$4) RETURNING *`, [name, clean(body.description, 500), projectId, userId]);
    return rows[0];
  } catch (err) {
    if (err instanceof Error && /duplicate key|youtube_topics_project_name_lower/i.test(err.message)) {
      throw new FinanceConflictError('This project already has a topic with that name.');
    }
    throw err;
  }
}

export async function archiveProjectTopic(projectId: string, topicId: string) {
  const { rows } = await q(undefined, `UPDATE youtube_research_topics SET active=FALSE WHERE id=$1 AND project_id=$2 RETURNING id`, [topicId, projectId]);
  if (!rows[0]) throw new FinanceNotFoundError('Topic not found');
  return { ok: true };
}

function numberCell(value: unknown) {
  if (value == null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export async function projectVideoInsights(params: VideoQuery) {
  await requireProject(params.projectId);
  const filter = videoWhere(params);
  const [months, topics, categories, totals, top, recent] = await Promise.all([
    q<{ month: string; imported: number; shorts: number; long_videos: number; views: string | null }>(
      undefined,
      `SELECT to_char(date_trunc('month', v.published_at), 'YYYY-MM') AS month,
       COUNT(*)::int AS imported,
       COUNT(*) FILTER (WHERE v.fetched_at > NOW() - INTERVAL '30 days' AND ${SHORT_MATCH})::int AS shorts,
       COUNT(*) FILTER (WHERE v.fetched_at > NOW() - INTERVAL '30 days' AND NOT ${SHORT_MATCH})::int AS long_videos,
       SUM(CASE WHEN v.fetched_at > NOW() - INTERVAL '30 days' THEN v.view_count ELSE NULL END) AS views
     ${PROJECT_VIDEO_FROM}
     WHERE ${filter.where} AND v.published_at IS NOT NULL
     GROUP BY 1 ORDER BY 1`,
      filter.values
    ),
    q<{ topic: string; count: number }>(
      undefined,
      `SELECT COALESCE(t.name, 'Uncategorized') AS topic, COUNT(*)::int AS count
     ${PROJECT_VIDEO_FROM} WHERE ${filter.where}
     GROUP BY 1 ORDER BY count DESC, topic ASC LIMIT 12`,
      filter.values
    ),
    q<{ category_id: string | null; count: number }>(
      undefined,
      `SELECT CASE WHEN v.fetched_at > NOW() - INTERVAL '30 days' THEN v.category_id ELSE NULL END AS category_id, COUNT(*)::int AS count
     ${PROJECT_VIDEO_FROM} WHERE ${filter.where}
     GROUP BY 1 ORDER BY count DESC LIMIT 12`,
      filter.values
    ),
    q<{ imported: number; categorized: number; shorts: number; long_videos: number; paid: number; organic: number; views: string | null; likes: string | null; comments: string | null }>(
      undefined,
      `SELECT COUNT(*)::int AS imported,
       COUNT(*) FILTER (WHERE r.topic_id IS NOT NULL)::int AS categorized,
       COUNT(*) FILTER (WHERE v.fetched_at > NOW() - INTERVAL '30 days' AND ${SHORT_MATCH})::int AS shorts,
       COUNT(*) FILTER (WHERE v.fetched_at > NOW() - INTERVAL '30 days' AND NOT ${SHORT_MATCH})::int AS long_videos,
       COUNT(*) FILTER (WHERE v.fetched_at > NOW() - INTERVAL '30 days' AND ${PAID_MATCH})::int AS paid,
       COUNT(*) FILTER (WHERE v.fetched_at > NOW() - INTERVAL '30 days' AND NOT ${PAID_MATCH})::int AS organic,
       SUM(CASE WHEN v.fetched_at > NOW() - INTERVAL '30 days' THEN v.view_count ELSE NULL END) AS views,
       SUM(CASE WHEN v.fetched_at > NOW() - INTERVAL '30 days' THEN v.like_count ELSE NULL END) AS likes,
       SUM(CASE WHEN v.fetched_at > NOW() - INTERVAL '30 days' THEN v.comment_count ELSE NULL END) AS comments
     ${PROJECT_VIDEO_FROM} WHERE ${filter.where}`,
      filter.values
    ),
    listProjectVideos({ ...params, sort: 'view_count', page: 1, pageSize: 8, includeTotal: false }),
    listProjectVideos({ ...params, sort: 'published_at', page: 1, pageSize: 8, includeTotal: false }),
  ]);
  const row = totals.rows[0];
  return {
    notice: YOUTUBE_METRIC_NOTICE,
    officialAnalytics: false,
    historicalGrowth: false,
    imported: Number(row?.imported || 0),
    categorized: Number(row?.categorized || 0),
    shorts: Number(row?.shorts || 0),
    long_videos: Number(row?.long_videos || 0),
    paid: Number(row?.paid || 0),
    organic: Number(row?.organic || 0),
    views: numberCell(row?.views),
    likes: numberCell(row?.likes),
    comments: numberCell(row?.comments),
    months: months.rows.map((item) => ({
      month: item.month,
      imported: Number(item.imported || 0),
      shorts: Number(item.shorts || 0),
      long_videos: Number(item.long_videos || 0),
      views: numberCell(item.views),
    })),
    topics: topics.rows.map((item) => ({ topic: item.topic, count: Number(item.count || 0) })),
    categories: categories.rows.map((item) => ({
      category_id: item.category_id,
      category: item.category_id ? categoryLabel(item.category_id) || item.category_id : 'Not supplied',
      count: Number(item.count || 0),
    })),
    topVideos: top.rows,
    recentVideos: recent.rows,
  };
}

export async function projectFilterOptions(projectId: string, channelIds?: string[]) {
  await requireProject(projectId);
  const values: unknown[] = [projectId];
  const channelClause = channelIds?.length ? (values.push(channelIds), ` AND v.channel_id = ANY($${values.length}::uuid[])`) : '';
  const fresh = `v.fetched_at > NOW() - INTERVAL '30 days'`;
  const base = `${PROJECT_VIDEO_FROM} WHERE c.status='active'${channelClause}`;
  const [channels, topics, counts, categories, tags] = await Promise.all([
    listProjectChannels(projectId),
    listProjectTopics(projectId),
    q<{ shorts: number; videos: number; paid: number; organic: number }>(
      undefined,
      `SELECT
         COUNT(*) FILTER (WHERE ${fresh} AND ${SHORT_MATCH})::int AS shorts,
         COUNT(*) FILTER (WHERE ${fresh} AND NOT ${SHORT_MATCH})::int AS videos,
         COUNT(*) FILTER (WHERE ${fresh} AND ${PAID_MATCH})::int AS paid,
         COUNT(*) FILTER (WHERE ${fresh} AND NOT ${PAID_MATCH})::int AS organic
       ${base}`,
      values
    ),
    q<{ category_id: string; count: number }>(
      undefined,
      `SELECT v.category_id, COUNT(*)::int AS count ${base} AND ${fresh} AND v.category_id IS NOT NULL AND v.category_id <> '' GROUP BY 1 ORDER BY count DESC, v.category_id ASC`,
      values
    ),
    q<{ tag: string; count: number }>(
      undefined,
      `SELECT tag, COUNT(*)::int AS count
       FROM youtube_videos v
       JOIN youtube_channels c ON c.id = v.channel_id
       JOIN youtube_project_channels pc ON pc.channel_id = c.id AND pc.project_id = $1
       CROSS JOIN LATERAL unnest(COALESCE(v.tags, ARRAY[]::text[])) AS tag
       WHERE c.status='active'${channelClause} AND ${fresh} AND btrim(tag) <> ''
       GROUP BY 1 ORDER BY count DESC, tag ASC LIMIT 40`,
      values
    ),
  ]);
  const row = counts.rows[0];
  return {
    channels: channels.map((channel) => ({
      id: channel.id,
      label: `${channel.relationship === 'own' ? 'Own · ' : ''}${channel.channel_name || channel.youtube_channel_id}`,
      relationship: channel.relationship,
    })),
    topics: topics.map((topic: { id: string; name: string }) => ({ id: topic.id, name: topic.name })),
    categories: categories.rows.map((item) => ({
      id: item.category_id,
      label: categoryLabel(item.category_id) || item.category_id,
      count: Number(item.count || 0),
    })),
    content: [
      ...(Number(row?.videos || 0) ? [{ id: 'video', label: 'Videos', count: Number(row.videos) }] : []),
      ...(Number(row?.shorts || 0) ? [{ id: 'short', label: 'Shorts', count: Number(row.shorts) }] : []),
    ],
    placement: [
      ...(Number(row?.organic || 0) ? [{ id: 'organic', label: 'Organic', count: Number(row.organic) }] : []),
      ...(Number(row?.paid || 0) ? [{ id: 'paid', label: 'Paid', count: Number(row.paid) }] : []),
    ],
    tags: tags.rows.map((item) => ({ tag: item.tag, count: Number(item.count || 0) })),
  };
}

export async function compareProjectVideos(projectId: string, ids: string[]) {
  await requireProject(projectId);
  const unique = [...new Set(ids.filter(Boolean))].slice(0, 6);
  if (unique.length < 2) throw new FinanceValidationError('Select at least two videos.');
  const filter = videoWhere({ projectId, channelIds: [] });
  filter.values.push(unique);
  const { rows } = await q(undefined, `${PROJECT_VIDEO_SELECT} WHERE ${filter.where} AND v.id = ANY($${filter.values.length}::uuid[])`, filter.values);
  if (rows.length < 2) throw new FinanceNotFoundError('Those videos are not in this project.');
  const videos = rows.map((row) => shapeVideo(row));
  return { notice: YOUTUBE_METRIC_NOTICE, officialAnalytics: false, videos };
}

export async function compareProjectChannels(projectId: string, ids: string[], params: Omit<VideoQuery, 'projectId' | 'channelIds'>) {
  await requireProject(projectId);
  const linked = await listProjectChannels(projectId);
  const wanted = ids.filter(Boolean);
  const selected = wanted.length
    ? linked.filter((channel) => wanted.includes(String(channel.id)))
    : linked.filter((channel) => channel.relationship === 'own').concat(linked.filter((channel) => channel.relationship === 'competitor')).slice(0, 6);
  if (selected.length < 1) throw new FinanceValidationError('Add a channel to this project before comparing.');
  const channels = await Promise.all(selected.slice(0, 6).map(async (channel) => {
    const insights = await projectVideoInsights({ projectId, ...params, channelIds: [String(channel.id)] });
    return {
      id: channel.id,
      relationship: channel.relationship,
      channel_name: channel.channel_name,
      channel_handle: channel.channel_handle,
      thumbnail_url: channel.thumbnail_url,
      youtube_channel_id: channel.youtube_channel_id,
      subscriber_count: channel.subscriber_count,
      video_count: channel.video_count,
      view_count: channel.view_count,
      description: channel.description,
      public_url: channel.public_url,
      channel_published_at: channel.channel_published_at,
      stale: channel.stale,
      videosIncluded: insights.imported,
      videos: insights.topVideos,
      publishing: insights.months.map((item) => ({ month: item.month, count: item.imported })),
      insights,
    };
  }));
  return {
    notice: YOUTUBE_METRIC_NOTICE,
    officialAnalytics: false,
    historicalGrowth: false,
    summary: performanceSummary(channels.flatMap((channel) => channel.videos)),
    channels,
  };
}

export async function projectOverview(projectId: string) {
  const [project, insights] = await Promise.all([
    getProject(projectId),
    projectVideoInsights({ projectId }),
  ]);
  const videoCount = insights.imported;
  const categorizedCount = insights.categorized;
  return {
    project,
    notice: YOUTUBE_METRIC_NOTICE,
    videos: videoCount,
    categorized: categorizedCount,
    awaitingReview: Math.max(0, videoCount - categorizedCount),
    recentVideos: insights.recentVideos,
    insights,
  };
}

export async function importProject(projectId: string, body: Record<string, unknown>, userId: string) {
  const channels = await listProjectChannels(projectId);
  const requested = Array.isArray(body.channel_ids) ? body.channel_ids.map(String) : [];
  const targets = (requested.length ? channels.filter((channel) => requested.includes(String(channel.id))) : channels).map((channel) => String(channel.id));
  if (!targets.length) throw new FinanceValidationError('Add a channel before importing videos.');
  const results = [];
  for (const channelId of targets) {
    try {
      const job = await startImport({ ...body, channel_id: channelId, project_id: projectId }, userId);
      results.push({ channel_id: channelId, status: job.status, inserted_count: job.inserted_count, updated_count: job.updated_count, skipped_count: job.skipped_count, error: job.error_summary || null });
    } catch (err) {
      results.push({ channel_id: channelId, status: 'failed', inserted_count: 0, updated_count: 0, skipped_count: 0, error: err instanceof Error ? err.message : 'Import failed' });
    }
  }
  return { channels: results.length, results };
}

export async function projectExportRows(params: VideoQuery) {
  await requireProject(params.projectId);
  const filter = videoWhere(params);
  const { rows } = await q(undefined, `${PROJECT_VIDEO_SELECT} WHERE ${filter.where} ORDER BY ${filter.sort} LIMIT 5001`, filter.values);
  if (rows.length > 5000) throw new FinanceValidationError('Narrow the filters. Exports include up to 5,000 rows.');
  return rows.map((row) => shapeVideo(row));
}
