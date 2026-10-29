import { cache } from 'react';
import { q, withFinanceTx } from '../finance/db';
import { FinanceConflictError, FinanceNotFoundError, FinanceValidationError } from '../finance/errors';
import { categoryLabel, contentLabel, isPaidPlacement, lengthLabel, savedThumbnailUrl, SHORT_MAX_SECONDS, WATCH_HOURS_NOTE, YOUTUBE_METRIC_NOTICE, youtubeThumbUrl } from './parse';
import { isFresh, presentChannel, presentVideo } from './mask';
import { ensureChannel, importVideosByUrls, performanceSummary, startImport } from './service';
import { presentListedProject } from './home-display';
import { currentSaasAccountId, currentYoutubePartnerId } from './scope';
import { connectedFacebookPageIds } from '../research/facebook-tokens';
import { asPlatform, FACEBOOK_CONTENT_FILTERS, FACEBOOK_PLACEMENT_FILTERS, parseContentLinks, platformCopy, titleCase } from '../research/platforms';
import { MAX_PROJECT_COMPETITORS } from './workspace-nav';

export const LEGACY_PROJECT_ID = 'a0000000-0000-4000-8000-000000000001';

const PROJECT_VIDEO_FROM = `FROM youtube_videos v
  JOIN youtube_channels c ON c.id = v.channel_id
  JOIN youtube_project_channels pc ON pc.channel_id = c.id AND pc.project_id = $1
  LEFT JOIN youtube_project_video_research r ON r.video_id = v.id AND r.project_id = pc.project_id
  LEFT JOIN youtube_research_topics t ON t.id = r.topic_id AND t.project_id = pc.project_id`;

const PROJECT_VIDEO_SELECT = `SELECT v.*, c.channel_name, c.channel_handle, c.thumbnail_url AS channel_thumbnail_url, c.youtube_channel_id, c.platform AS channel_platform, c.last_refreshed_at AS channel_refreshed_at,
  pc.relationship, r.topic_id, r.thumbnail_caption, r.research_notes, t.name AS topic_name
  ${PROJECT_VIDEO_FROM}`;

function clean(value: unknown, max: number) {
  const text = String(value || '').trim();
  if (!text) return null;
  if (text.length > max) throw new FinanceValidationError('One of the fields is too long.');
  return text;
}

function statusOf(value: unknown) {
  const raw = String(value || 'todo');
  if (raw === 'archived') return 'completed';
  if (!['todo', 'active', 'completed'].includes(raw)) throw new FinanceValidationError('Status must be To Do, In Progress, or Completed.');
  return raw;
}

function channelIdFilter(channelIds: string[] | undefined, values: unknown[]) {
  if (!channelIds?.length) return '';
  const uuids = channelIds.filter((id) => /^[0-9a-f-]{36}$/i.test(id));
  const youtubeIds = channelIds.filter((id) => !/^[0-9a-f-]{36}$/i.test(id));
  const parts: string[] = [];
  if (uuids.length) {
    values.push(uuids);
    parts.push(`v.channel_id = ANY($${values.length}::uuid[])`);
  }
  if (youtubeIds.length) {
    values.push(youtubeIds);
    parts.push(`c.youtube_channel_id = ANY($${values.length}::text[])`);
  }
  return parts.length ? `(${parts.join(' OR ')})` : '';
}

async function audit(userId: string, action: string, entityId: string | null, metadata: Record<string, unknown>) {
  await q(undefined, `INSERT INTO youtube_audit_logs (actor_user_id, action, entity_type, entity_id, metadata) VALUES ($1,$2,'youtube_project',$3,$4::jsonb)`, [userId, action, entityId, JSON.stringify(metadata)]);
}

const loadProject = cache(async (id: string, partnerKey: string, saasKey: string) => {
  const { rows } = await q(undefined, `SELECT * FROM youtube_research_projects WHERE id=$1`, [id]);
  const partnerId = partnerKey || null;
  const saasId = saasKey || null;
  if (!rows[0]) throw new FinanceNotFoundError('Research project not found');
  if (saasId && rows[0].saas_account_id !== saasId) throw new FinanceNotFoundError('Research project not found');
  if (partnerId && rows[0].partner_id !== partnerId) throw new FinanceNotFoundError('Research project not found');
  return rows[0];
});

function requireProject(id: string) {
  return loadProject(id, currentYoutubePartnerId() || '', currentSaasAccountId() || '');
}

const PROJECT_LIST_FROM = `FROM youtube_research_projects p
     LEFT JOIN youtube_project_channels opc ON opc.project_id=p.id AND opc.relationship='own'
     LEFT JOIN youtube_channels own ON own.id=opc.channel_id`;

const PROJECT_LIST_SELECT = `SELECT p.*,
       own.channel_name AS own_channel_name, own.channel_handle AS own_channel_handle, own.thumbnail_url AS own_thumbnail_url,
       own.youtube_channel_id AS own_youtube_channel_id, own.last_refreshed_at AS own_refreshed_at,
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
     ${PROJECT_LIST_FROM}`;

export async function listProjects(params: { q?: string; status?: string; bucket?: string; page?: number; pageSize?: number }) {
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(params.pageSize) || 20));
  const values: unknown[] = [];
  const where = ['1=1'];
  const countWhere = ['1=1'];
  const partnerId = currentYoutubePartnerId();
  const saasId = currentSaasAccountId();
  if (saasId) {
    values.push(saasId);
    where.push(`p.saas_account_id=$${values.length}`);
    countWhere.push(`p.saas_account_id=$${values.length}`);
  } else if (partnerId) {
    values.push(partnerId);
    where.push(`p.partner_id=$${values.length}`);
    countWhere.push(`p.partner_id=$${values.length}`);
  } else {
    where.push('p.partner_id IS NULL AND p.saas_account_id IS NULL');
    countWhere.push('p.partner_id IS NULL AND p.saas_account_id IS NULL');
  }
  if (params.q?.trim()) {
    values.push(`%${params.q.trim()}%`);
    const search = `(p.name ILIKE $${values.length} OR p.brand_name ILIKE $${values.length} OR p.industry ILIKE $${values.length})`;
    where.push(search);
    countWhere.push(search);
  }
  const bucket = String(params.bucket || '');
  const status = String(params.status || '');
  if (bucket === 'todo' || status === 'todo') {
    where.push(`p.status='todo'`);
  } else if (bucket === 'completed' || status === 'completed' || bucket === 'archived') {
    where.push(`p.status='completed'`);
  } else if (bucket === 'active' || status === 'active') {
    where.push(`p.status='active'`);
  } else if (bucket === 'setup') {
    where.push(`p.status='todo'`);
  } else if (bucket === 'all' || !bucket) {
    /* all workspace projects */
  }
  const [listed, count, buckets] = await Promise.all([
    q(undefined, `${PROJECT_LIST_SELECT} WHERE ${where.join(' AND ')} ORDER BY p.updated_at DESC LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`, values),
    q<{ count: string }>(undefined, `SELECT COUNT(*)::text AS count ${PROJECT_LIST_FROM} WHERE ${where.join(' AND ')}`, values),
    q<{ total_all: string; todo: string; live: string; completed: string }>(
      undefined,
      `SELECT COUNT(*)::text AS total_all,
              COUNT(*) FILTER (WHERE p.status='todo')::text AS todo,
              COUNT(*) FILTER (WHERE p.status='active')::text AS live,
              COUNT(*) FILTER (WHERE p.status='completed')::text AS completed
       ${PROJECT_LIST_FROM}
       WHERE ${countWhere.join(' AND ')}`,
      values,
    ),
  ]);
  return {
    rows: listed.rows.map((row) => {
      const fresh = isFresh(row.own_refreshed_at);
      return presentListedProject({
        ...row,
        own_channel_name: fresh ? row.own_channel_name : null,
        own_channel_handle: fresh ? row.own_channel_handle : null,
        own_thumbnail_url: fresh ? row.own_thumbnail_url : null,
      });
    }),
    total: Number(count.rows[0]?.count || 0),
    counts: {
      all: Number(buckets.rows[0]?.total_all || 0),
      todo: Number(buckets.rows[0]?.todo || 0),
      active: Number(buckets.rows[0]?.live || 0),
      completed: Number(buckets.rows[0]?.completed || 0),
    },
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
    `INSERT INTO youtube_research_projects (name, brand_name, objective, industry, description, status, created_by, partner_id, saas_account_id, platform)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [name, clean(body.brand_name ?? body.brandName, 120), clean(body.objective, 2000), clean(body.industry, 120), clean(body.description, 5000), statusOf(body.status), userId, currentYoutubePartnerId(), currentSaasAccountId(), asPlatform(body.platform)]
  );
  await audit(userId, 'YouTube Project Created', rows[0].id, { name });
  return rows[0];
}

export async function updateProject(id: string, body: Record<string, unknown>, userId: string) {
  const project = await requireProject(id);
  const name = clean(body.name !== undefined ? body.name : project.name, 120);
  if (!name || name.length < 2) throw new FinanceValidationError('Project name is required.');
  const brand = body.brand_name !== undefined || body.brandName !== undefined ? clean(body.brand_name ?? body.brandName, 120) : project.brand_name;
  const objective = body.objective !== undefined ? clean(body.objective, 2000) : project.objective;
  const industry = body.industry !== undefined ? clean(body.industry, 120) : project.industry;
  const description = body.description !== undefined ? clean(body.description, 5000) : project.description;
  const status = body.status !== undefined ? statusOf(body.status) : project.status;
  const { rows } = await q(
    undefined,
    `UPDATE youtube_research_projects SET name=$2, brand_name=$3, objective=$4, industry=$5, description=$6, status=$7 WHERE id=$1 RETURNING *`,
    [id, name, brand, objective, industry, description, status]
  );
  await audit(userId, 'YouTube Project Updated', id, { name });
  return rows[0];
}

export async function duplicateProject(id: string, userId: string) {
  const project = await requireProject(id);
  const name = `${String(project.name || 'Project').slice(0, 110)} copy`;
  const created = await q(
    undefined,
    `INSERT INTO youtube_research_projects (name, brand_name, objective, industry, description, status, created_by, partner_id, saas_account_id, platform)
     VALUES ($1,$2,$3,$4,$5,'todo',$6,$7,$8,$9) RETURNING *`,
    [name, project.brand_name, project.objective, project.industry, project.description, userId, project.partner_id || currentYoutubePartnerId(), project.saas_account_id || currentSaasAccountId(), asPlatform(project.platform)]
  );
  await q(
    undefined,
    `INSERT INTO youtube_project_channels (project_id, channel_id, relationship)
     SELECT $2, channel_id, relationship FROM youtube_project_channels WHERE project_id=$1`,
    [id, created.rows[0].id]
  );
  await audit(userId, 'YouTube Project Created', created.rows[0].id, { name, duplicatedFrom: id });
  return created.rows[0];
}

export async function archiveProject(id: string, userId: string) {
  const project = await requireProject(id);
  if (project.legacy) throw new FinanceValidationError('The original research project stays available so earlier notes are not hidden.');
  await q(undefined, `UPDATE youtube_research_projects SET status='completed' WHERE id=$1`, [id]);
  await audit(userId, 'YouTube Project Completed', id, {});
  return { ok: true };
}

export async function listProjectChannels(projectId: string) {
  await requireProject(projectId);
  const connected = await connectedFacebookPageIds().catch(() => new Set<string>());
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
  return rows.map((row) => {
    const handle = String(row.channel_handle || '').replace(/^@/, '');
    const pageId = String(row.youtube_channel_id || '');
    return {
      ...presentChannel(row),
      id: row.id,
      youtube_channel_id: row.youtube_channel_id,
      relationship: row.relationship,
      meta_connected: connected.has(pageId.toLowerCase()) || Boolean(handle && connected.has(handle.toLowerCase())),
    };
  });
}

export async function addProjectChannel(projectId: string, input: string, relationship: unknown, userId: string, page?: unknown) {
  const project = await requireProject(projectId);
  if (project.status === 'completed') throw new FinanceValidationError('Mark this project In Progress before adding channels.');
  const kind = String(relationship || 'competitor');
  if (!['own', 'competitor'].includes(kind)) throw new FinanceValidationError('Choose own or competitor.');
  const channelId = await ensureChannel(input, userId, project.platform, page);
  const existing = await q(undefined, `SELECT relationship FROM youtube_project_channels WHERE project_id=$1 AND channel_id=$2`, [projectId, channelId]);
  if (existing.rows[0]) throw new FinanceConflictError('This channel is already in the project.');
  if (kind === 'competitor') {
    const counted = await q<{ count: string }>(undefined, `SELECT COUNT(*)::text AS count FROM youtube_project_channels WHERE project_id=$1 AND relationship='competitor'`, [projectId]);
    if (Number(counted.rows[0]?.count || 0) >= MAX_PROJECT_COMPETITORS) {
      throw new FinanceValidationError(`This project already has ${MAX_PROJECT_COMPETITORS} competitors.`);
    }
  }
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
  OR UPPER(COALESCE(v.category_id, '')) IN ('AD', 'BOOSTED')
  OR UPPER(COALESCE(v.public_details->>'media_type', '')) IN ('AD', 'BOOSTED')
  OR v.youtube_video_id ILIKE '%:ad:%'
  OR v.youtube_video_id ILIKE '%:adlib:%'
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
  duration_seconds: 'v.duration_seconds DESC NULLS LAST',
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
  const channelFilter = channelIdFilter(params.channelIds, values);
  if (channelFilter) where.push(channelFilter);
  if (params.topicId === 'none') where.push(`r.topic_id IS NULL`);
  else if (params.topicId) {
    values.push(params.topicId);
    where.push(`r.topic_id=$${values.length}`);
  }
  const tags = String(params.tag || '').split(',').map((item) => item.trim()).filter(Boolean);
  if (tags.length) {
    const tagClauses = tags.map((tag) => {
      values.push(`%${tag}%`);
      return `EXISTS (SELECT 1 FROM unnest(v.tags) tag WHERE tag ILIKE $${values.length})`;
    });
    where.push(`${fresh} AND (${tagClauses.join(' OR ')})`);
  }
  if (params.videoIds?.length) {
    values.push(params.videoIds);
    where.push(`v.id = ANY($${values.length}::uuid[])`);
  }
  const categories = String(params.categoryId || '').split(',').map((item) => item.trim()).filter(Boolean);
  if (categories.length) {
    values.push(categories);
    where.push(`${fresh} AND v.category_id = ANY($${values.length}::text[])`);
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
  const kinds = String(params.content || '').split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
  if (kinds.length) {
    const clauses = kinds.map((kind) => {
      if (kind === 'short') return `${fresh} AND ${SHORT_MATCH}`;
      if (kind === 'ad') return PAID_MATCH;
      if (['post', 'photo', 'reel', 'link', 'boosted'].includes(kind)) {
        values.push(kind.toUpperCase());
        return `${fresh} AND UPPER(COALESCE(v.category_id, v.public_details->>'media_type', '')) = $${values.length}`;
      }
      if (kind === 'video') {
        return `${fresh} AND CASE WHEN c.platform = 'youtube' THEN NOT ${SHORT_MATCH} ELSE UPPER(COALESCE(v.category_id, v.public_details->>'media_type', '')) = 'VIDEO' END`;
      }
      return '';
    }).filter(Boolean);
    if (clauses.length) where.push(`(${clauses.join(' OR ')})`);
  }
  return { values, where: where.join(' AND '), sort: SORTS[params.sort || ''] || SORTS.published_at };
}

function shapeVideo(row: Record<string, unknown>) {
  const video = presentVideo(row);
  const platform = asPlatform(row.channel_platform);
  const details = (video.public_details || row.public_details || {}) as Record<string, unknown>;
  const mediaType = String(details.media_type || '').toUpperCase();
  const copy = platformCopy(platform);
  return {
    ...video,
    id: row.id,
    relationship: row.relationship,
    category_label: categoryLabel(video.category_id),
    content_label: platform === 'youtube'
      ? contentLabel(video.duration_seconds as number | null, video.title as string | null, Array.isArray(video.tags) ? video.tags as string[] : null)
      : categoryLabel(video.category_id) || (mediaType ? titleCase(mediaType.toLowerCase()) : titleCase(copy.content)),
    thumbnail_url: youtubeThumbUrl(
      String(row.youtube_video_id || ''),
      savedThumbnailUrl(video.thumbnail_file as string | null) || (video.thumbnail_url as string | null)
    ) || null,
    duration_label: lengthLabel({
      duration_seconds: video.duration_seconds as number | null,
      duration: video.duration as string | null,
    }) || null,
    placement_label: video.stale
      ? null
      : mediaType === 'AD' || mediaType === 'BOOSTED' || isPaidPlacement({
        hasPaidProductPlacement: video.has_paid_product_placement as boolean | null,
        title: video.title as string | null,
        description: video.description as string | null,
        tags: Array.isArray(video.tags) ? video.tags as string[] : null,
      }) ? 'Paid' : 'Organic',
    click_count: Number.isFinite(Number(details.clicks)) ? Number(details.clicks) : null,
    impression_count: Number.isFinite(Number(details.impressions)) ? Number(details.impressions) : null,
    share_count: Number.isFinite(Number(details.shares)) ? Number(details.shares) : null,
    engaged_users: Number.isFinite(Number(details.engaged_users)) ? Number(details.engaged_users) : null,
  };
}

export type VideoLibrarySummary = {
  organic_videos: number;
  paid_videos: number;
  viewership: number | null;
  watch_hours: null;
  watch_hours_note: string;
};

async function videoLibrarySummary(filter: { values: unknown[]; where: string }): Promise<VideoLibrarySummary> {
  const fresh = `v.fetched_at > NOW() - INTERVAL '30 days'`;
  const { rows } = await q<{ organic: number; paid: number; viewership: string | null }>(
    undefined,
    `SELECT
       COUNT(*) FILTER (WHERE ${fresh} AND NOT ${PAID_MATCH})::int AS organic,
       COUNT(*) FILTER (WHERE ${fresh} AND ${PAID_MATCH})::int AS paid,
       SUM(CASE WHEN ${fresh} THEN v.view_count ELSE NULL END) AS viewership
     ${PROJECT_VIDEO_FROM}
     WHERE ${filter.where}`,
    filter.values,
  );
  const row = rows[0];
  return {
    organic_videos: Number(row?.organic || 0),
    paid_videos: Number(row?.paid || 0),
    viewership: numberCell(row?.viewership),
    watch_hours: null,
    watch_hours_note: WATCH_HOURS_NOTE,
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
  const summaryQuery = params.includeTotal === false ? Promise.resolve(null) : videoLibrarySummary(filter);
  const [{ rows }, count, summary] = await Promise.all([rowsQuery, countQuery, summaryQuery]);
  return {
    rows: rows.map((row) => shapeVideo(row)),
    total: Number(count.rows[0]?.count || 0),
    page,
    pageSize,
    notice: YOUTUBE_METRIC_NOTICE,
    summary,
  };
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

function insightTrunc(params: VideoQuery) {
  if (!params.from || !params.to) return 'month';
  const days = (new Date(params.to).getTime() - new Date(params.from).getTime()) / 86_400_000;
  return days <= 120 ? 'week' : 'month';
}

export async function projectVideoInsights(params: VideoQuery) {
  await requireProject(params.projectId);
  const filter = videoWhere(params);
  const grain = insightTrunc(params);
  const trunc = grain === 'week' ? "date_trunc('week', v.published_at)" : "date_trunc('month', v.published_at)";
  const bucketSql = grain === 'week' ? `to_char(${trunc}, 'YYYY-MM-DD')` : `to_char(${trunc}, 'YYYY-MM')`;
  const fresh = `v.fetched_at > NOW() - INTERVAL '30 days'`;
  const [months, series, formats, topics, categories, totals, top, recent] = await Promise.all([
    q<{ month: string; imported: number; shorts: number; long_videos: number; views: string | null }>(
      undefined,
      `SELECT ${bucketSql} AS month,
       COUNT(*)::int AS imported,
       COUNT(*) FILTER (WHERE ${fresh} AND ${SHORT_MATCH})::int AS shorts,
       COUNT(*) FILTER (WHERE ${fresh} AND NOT ${SHORT_MATCH})::int AS long_videos,
       SUM(CASE WHEN ${fresh} THEN v.view_count ELSE NULL END) AS views
     ${PROJECT_VIDEO_FROM}
     WHERE ${filter.where} AND v.published_at IS NOT NULL
     GROUP BY 1 ORDER BY 1`,
      filter.values
    ),
    q<{ relationship: string; bucket: string; imported: number; views: string | null }>(
      undefined,
      `SELECT pc.relationship, ${bucketSql} AS bucket,
       COUNT(*)::int AS imported,
       SUM(CASE WHEN ${fresh} THEN v.view_count ELSE NULL END) AS views
     ${PROJECT_VIDEO_FROM}
     WHERE ${filter.where} AND v.published_at IS NOT NULL
     GROUP BY 1, 2 ORDER BY 2`,
      filter.values
    ),
    q<{ format: string; count: number; views: string | null; avg_views: string | null }>(
      undefined,
      `SELECT CASE WHEN ${SHORT_MATCH} THEN 'short' ELSE 'video' END AS format,
       COUNT(*)::int AS count,
       SUM(CASE WHEN ${fresh} THEN v.view_count ELSE NULL END) AS views,
       AVG(CASE WHEN ${fresh} THEN v.view_count ELSE NULL END) AS avg_views
     ${PROJECT_VIDEO_FROM}
     WHERE ${filter.where} AND ${fresh}
     GROUP BY 1 ORDER BY avg_views DESC NULLS LAST`,
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
    grain,
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
    series: series.rows.map((item) => ({
      relationship: item.relationship,
      bucket: item.bucket,
      imported: Number(item.imported || 0),
      views: numberCell(item.views),
    })),
    formats: formats.rows.map((item) => ({
      id: item.format,
      label: item.format === 'short' ? 'Shorts' : 'Videos',
      count: Number(item.count || 0),
      views: numberCell(item.views),
      avg_views: numberCell(item.avg_views),
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
  const project = await requireProject(projectId);
  const platform = asPlatform(project.platform);
  const values: unknown[] = [projectId];
  const channelMatch = channelIdFilter(channelIds, values);
  const channelClause = channelMatch ? ` AND ${channelMatch}` : '';
  const fresh = `v.fetched_at > NOW() - INTERVAL '30 days'`;
  const base = `${PROJECT_VIDEO_FROM} WHERE c.status='active'${channelClause}`;
  const [channels, topics, counts, categories, tags, formats] = await Promise.all([
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
    q<{ kind: string; count: number }>(
      undefined,
      `SELECT UPPER(COALESCE(NULLIF(v.category_id, ''), v.public_details->>'media_type', 'POST')) AS kind, COUNT(*)::int AS count
       ${base} AND ${fresh}
       GROUP BY 1 ORDER BY count DESC`,
      values
    ),
  ]);
  const row = counts.rows[0];
  const formatCounts = new Map(formats.rows.map((item) => [String(item.kind || '').toLowerCase(), Number(item.count || 0)]));
  const facebookContent = FACEBOOK_CONTENT_FILTERS.map((item) => ({
    id: item.id,
    label: item.label,
    count: formatCounts.get(item.id) || 0,
  }));
  return {
    platform,
    channels: channels.map((channel) => ({
      id: channel.id,
      label: `${channel.relationship === 'own' ? 'Own · ' : ''}${channel.channel_name || channel.youtube_channel_id}`,
      relationship: channel.relationship,
    })),
    topics: topics.map((topic: { id: string; name: string }) => ({ id: topic.id, name: topic.name })),
    categories: (platform !== 'youtube' ? facebookContent.filter((item) => item.count) : categories.rows.map((item) => ({
      id: item.category_id,
      label: categoryLabel(item.category_id) || item.category_id,
      count: Number(item.count || 0),
    }))),
    content: platform === 'youtube'
      ? [
          ...(Number(row?.videos || 0) ? [{ id: 'video', label: 'Videos', count: Number(row.videos) }] : []),
          ...(Number(row?.shorts || 0) ? [{ id: 'short', label: 'Shorts', count: Number(row.shorts) }] : []),
        ]
      : facebookContent,
    placement: FACEBOOK_PLACEMENT_FILTERS.map((item) => ({
      id: item.id,
      label: item.label,
      count: item.id === 'paid' ? Number(row?.paid || 0) : Number(row?.organic || 0),
    })),
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

export async function importProjectVideosFromUrls(projectId: string, body: Record<string, unknown>, userId: string) {
  const project = await requireProject(projectId);
  const platform = asPlatform(project.platform);
  const copy = platformCopy(platform);
  const raw = String(body.text || body.urls || '');
  const mode = String(body.mode || 'multiple');
  const links = parseContentLinks(platform, raw);
  if (mode === 'single') {
    if (links.length !== 1) throw new FinanceValidationError(`Add a single ${copy.content} URL here. Use the multiple panel for a list.`);
  } else if (mode === 'multiple' && links.length < 2) {
    throw new FinanceValidationError(`Paste at least two ${copy.label} ${copy.content} URLs, one per line.`);
  }
  const imported = await importVideosByUrls(raw, userId, platform);
  const linked = await q<{ channel_id: string }>(undefined, `SELECT channel_id FROM youtube_project_channels WHERE project_id=$1`, [projectId]);
  const have = new Set(linked.rows.map((row) => String(row.channel_id)));
  let first = have.size === 0;
  for (const channelId of imported.channelIds) {
    if (have.has(channelId)) continue;
    await q(
      undefined,
      `INSERT INTO youtube_project_channels (project_id, channel_id, relationship) VALUES ($1,$2,$3)
       ON CONFLICT (project_id, channel_id) DO NOTHING`,
      [projectId, channelId, first ? 'own' : 'competitor'],
    );
    have.add(channelId);
    first = false;
  }
  const videoIds = imported.rows.map((row) => String(row.id));
  const listed = videoIds.length
    ? await listProjectVideos({ projectId, videoIds, page: 1, pageSize: 40, includeTotal: false, sort: 'published_at' })
    : { rows: [] };
  return { imported: listed.rows.length, rows: listed.rows };
}

export async function importProject(projectId: string, body: Record<string, unknown>, userId: string) {
  const project = await requireProject(projectId);
  const copy = platformCopy(project.platform);
  const channels = await listProjectChannels(projectId);
  const requested = Array.isArray(body.channel_ids) ? body.channel_ids.map(String).filter(Boolean) : [];
  const targets = (requested.length
    ? channels.filter((channel) => requested.includes(String(channel.id)) || requested.includes(String(channel.youtube_channel_id)))
    : channels
  ).map((channel) => String(channel.id));
  if (!targets.length) throw new FinanceValidationError(`Add a ${copy.entity} before importing ${copy.contentPlural}.`);
  const results = await Promise.all(targets.map(async (channelId) => {
    try {
      const job = await startImport({ ...body, channel_id: channelId, project_id: projectId }, userId);
      return { channel_id: channelId, status: job.status, inserted_count: job.inserted_count, updated_count: job.updated_count, skipped_count: job.skipped_count, error: job.error_summary || null };
    } catch (err) {
      return { channel_id: channelId, status: 'failed', inserted_count: 0, updated_count: 0, skipped_count: 0, error: err instanceof Error ? err.message : 'Import failed' };
    }
  }));
  const listed = await listProjectVideos({
    projectId,
    channelIds: targets,
    page: 1,
    pageSize: 1,
    includeTotal: true,
  }).catch(() => ({ total: 0 }));
  return { channels: results.length, results, total: listed.total };
}

export async function projectExportRows(params: VideoQuery) {
  await requireProject(params.projectId);
  const filter = videoWhere(params);
  const { rows } = await q(undefined, `${PROJECT_VIDEO_SELECT} WHERE ${filter.where} ORDER BY ${filter.sort} LIMIT 5001`, filter.values);
  if (rows.length > 5000) throw new FinanceValidationError('Narrow the filters. Exports include up to 5,000 rows.');
  return rows.map((row) => shapeVideo(row));
}
