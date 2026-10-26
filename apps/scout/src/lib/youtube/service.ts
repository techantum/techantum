import { decryptSecret, encryptSecret, isEncryptionReady, secretHint } from '../ai/crypto';
import { q } from '../finance/db';
import { FinanceConflictError, FinanceNotFoundError, FinanceValidationError } from '../finance/errors';
import { createYoutube, normalizeYoutubeApiKey, YoutubeApiError, YOUTUBE_CONNECTED_MESSAGE, type ResolvedChannel, type ResolvedVideo, type YoutubeFetch } from './client';
import { presentChannel, presentVideo } from './mask';
import { durationSeconds, shortsPlaylistId, YOUTUBE_METRIC_NOTICE, publishingBuckets } from './parse';
import { isYoutubePermission, permissionsForRole, type YoutubePermission } from './permissions';

const SORTS: Record<string, string> = {
  published_at: 'v.published_at DESC NULLS LAST',
  view_count: 'v.view_count DESC NULLS LAST',
  like_count: 'v.like_count DESC NULLS LAST',
  comment_count: 'v.comment_count DESC NULLS LAST',
  title: 'v.title ASC NULLS LAST',
};

export const VIDEO_UPSERT_SQL = `INSERT INTO youtube_videos (
  channel_id, youtube_video_id, title, video_url, description, published_at, duration, thumbnail_url,
  view_count, like_count, comment_count, tags, category_id, default_language, default_audio_language, duration_seconds, has_paid_product_placement, fetched_at
) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,NOW())
ON CONFLICT (youtube_video_id) DO UPDATE SET
  channel_id=EXCLUDED.channel_id, title=EXCLUDED.title, video_url=EXCLUDED.video_url,
  description=EXCLUDED.description, published_at=EXCLUDED.published_at, duration=EXCLUDED.duration,
  thumbnail_url=EXCLUDED.thumbnail_url, view_count=EXCLUDED.view_count, like_count=EXCLUDED.like_count,
  comment_count=EXCLUDED.comment_count, tags=EXCLUDED.tags, category_id=EXCLUDED.category_id,
  default_language=EXCLUDED.default_language, default_audio_language=EXCLUDED.default_audio_language,
  duration_seconds=EXCLUDED.duration_seconds, has_paid_product_placement=EXCLUDED.has_paid_product_placement, fetched_at=NOW()`;

const VIDEO_SELECT = `SELECT v.*, c.channel_name, c.youtube_channel_id, c.last_refreshed_at AS channel_refreshed_at,
  c.classification, r.topic_id, r.thumbnail_caption, r.research_notes, t.name AS topic_name
  FROM youtube_videos v
  JOIN youtube_channels c ON c.id = v.channel_id
  LEFT JOIN youtube_video_research r ON r.video_id = v.id
  LEFT JOIN youtube_research_topics t ON t.id = r.topic_id`;

function dateOrNull(value: unknown) {
  const text = String(value || '').trim();
  if (!text) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new FinanceValidationError('Use a YYYY-MM-DD date.');
  return text;
}

function classificationOf(value: unknown) {
  const text = String(value || 'other');
  if (!['own', 'competitor', 'other'].includes(text)) throw new FinanceValidationError('Choose Own, Competitor, or Other.');
  return text;
}

function modeOf(value: unknown) {
  const text = String(value || 'available');
  if (!['new', 'refresh', 'available'].includes(text)) throw new FinanceValidationError('Choose an import mode.');
  return text as 'new' | 'refresh' | 'available';
}

async function audit(userId: string, action: string, entityType: string, entityId: string | null, metadata: Record<string, unknown>) {
  const safe = { ...metadata };
  delete safe.apiKey;
  delete safe.api_key;
  delete safe.key;
  delete safe.api_key_ciphertext;
  await q(
    undefined,
    `INSERT INTO youtube_audit_logs (actor_user_id, action, entity_type, entity_id, metadata) VALUES ($1,$2,$3,$4,$5::jsonb)`,
    [userId, action, entityType, entityId, JSON.stringify(safe)]
  );
}

export async function grantsFor(userId: string) {
  const { rows } = await q<{ permission: string }>(undefined, `SELECT permission FROM youtube_admin_grants WHERE user_id=$1`, [userId]);
  return rows.map((row) => row.permission);
}

export async function sessionAccess(role: string, userId: string) {
  const grants = role === 'SUPER_ADMIN' ? [] : await grantsFor(userId);
  return { role, permissions: permissionsForRole(role, grants) };
}

async function settingsRow() {
  const existing = await q(undefined, `SELECT * FROM youtube_module_settings WHERE id=1`);
  if (existing.rows[0]) return existing.rows[0];
  await q(undefined, `INSERT INTO youtube_module_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING`);
  const { rows } = await q(undefined, `SELECT * FROM youtube_module_settings WHERE id=1`);
  return rows[0];
}

export async function readApiKey() {
  const row = await settingsRow();
  if (row?.api_key_ciphertext) {
    try {
      const saved = normalizeYoutubeApiKey(decryptSecret(String(row.api_key_ciphertext)));
      if (saved) return saved;
    } catch {
      throw new FinanceValidationError('The saved YouTube API key could not be read. Save it again.');
    }
    throw new FinanceValidationError('The saved YouTube API key could not be read. Save it again.');
  }
  const envKey = normalizeYoutubeApiKey(process.env.YOUTUBE_API_KEY || '');
  if (envKey) return envKey;
  throw new FinanceValidationError('Add a YouTube Data API key in YouTube Research settings.');
}

function keySource(row: { api_key_ciphertext?: string | null }) {
  if (row?.api_key_ciphertext) return 'saved';
  if (process.env.YOUTUBE_API_KEY?.trim()) return 'environment';
  return 'missing';
}

export async function getSettings(includeHint: boolean) {
  const row = await settingsRow();
  const source = keySource(row);
  let keyHint: string | null = null;
  if (includeHint && source === 'saved') {
    try {
      keyHint = secretHint(decryptSecret(String(row.api_key_ciphertext)));
    } catch {
      keyHint = null;
    }
  }
  return {
    defaultImportLimit: Number(row.default_import_limit),
    maxImportLimit: Number(row.max_import_limit),
    defaultSort: row.default_sort,
    keyConfigured: source !== 'missing',
    keySource: source,
    keyHint,
    encryptionReady: isEncryptionReady(),
    lastTestStatus: row.last_test_status,
    lastTestMessage: row.last_test_message,
    lastTestAt: row.last_test_at,
    notice: YOUTUBE_METRIC_NOTICE,
  };
}

export async function updateSettings(body: Record<string, unknown>, userId: string) {
  const current = await settingsRow();
  const maxImportLimit = Number(body.max_import_limit ?? body.maxImportLimit ?? current.max_import_limit);
  const defaultImportLimit = Number(body.default_import_limit ?? body.defaultImportLimit ?? current.default_import_limit);
  const defaultSort = String(body.default_sort ?? body.defaultSort ?? current.default_sort);
  if (!Number.isInteger(maxImportLimit) || maxImportLimit < 1 || maxImportLimit > 500) {
    throw new FinanceValidationError('Maximum import results must be a whole number from 1 to 500.');
  }
  if (!Number.isInteger(defaultImportLimit) || defaultImportLimit < 1 || defaultImportLimit > maxImportLimit) {
    throw new FinanceValidationError('The default import limit cannot be higher than the maximum.');
  }
  if (!SORTS[defaultSort]) throw new FinanceValidationError('Choose a supported sort order.');
  let ciphertext = current.api_key_ciphertext;
  const clear = body.clear_key === true || body.clearKey === true;
  const incoming = normalizeYoutubeApiKey(String(body.api_key ?? body.apiKey ?? ''));
  if (clear) ciphertext = null;
  else if (incoming && !/^[•*]/.test(incoming)) {
    if (!isEncryptionReady()) throw new FinanceValidationError('Set AI_SECRETS_ENCRYPTION_KEY on the server before saving a YouTube API key.');
    ciphertext = encryptSecret(incoming);
  }
  await q(
    undefined,
    `UPDATE youtube_module_settings SET api_key_ciphertext=$1, default_import_limit=$2, max_import_limit=$3, default_sort=$4, updated_by=$5 WHERE id=1`,
    [ciphertext, defaultImportLimit, maxImportLimit, defaultSort, userId]
  );
  await audit(userId, 'YouTube Settings Saved', 'youtube_settings', '1', { keyChanged: Boolean(incoming) || clear, defaultImportLimit, maxImportLimit, defaultSort });
  return getSettings(true);
}

const TEST_STATUS: Record<string, string> = {
  invalid_key: 'invalid_credentials',
  ip_restricted: 'ip_restricted',
  referrer_restricted: 'referrer_restricted',
  app_restricted: 'app_restricted',
  quota: 'quota_exhausted',
  disabled: 'api_disabled',
  timeout: 'network_error',
  network: 'network_error',
};

export async function testConnection(userId: string) {
  const apiKey = await readApiKey();
  try {
    await createYoutube(apiKey).test();
    await q(undefined, `UPDATE youtube_module_settings SET last_test_status='connected', last_test_message=$1, last_test_at=NOW() WHERE id=1`, [YOUTUBE_CONNECTED_MESSAGE]);
    await audit(userId, 'YouTube Connection Tested', 'youtube_settings', '1', { status: 'connected' });
    return { ok: true, status: 'connected', message: YOUTUBE_CONNECTED_MESSAGE, googleStatus: 200, googleReason: null };
  } catch (err) {
    const code = err instanceof YoutubeApiError ? err.code : 'unknown';
    const status = TEST_STATUS[code] || 'request_failed';
    const message = err instanceof Error ? err.message : 'The connection test failed.';
    await q(undefined, `UPDATE youtube_module_settings SET last_test_status=$1, last_test_message=$2, last_test_at=NOW() WHERE id=1`, [status, message]);
    await audit(userId, 'YouTube Connection Tested', 'youtube_settings', '1', { status, googleStatus: err instanceof YoutubeApiError ? err.googleStatus : null, googleReason: err instanceof YoutubeApiError ? err.googleReason : null });
    throw err;
  }
}

export async function listAccess() {
  const admins = await q<{ user_id: string; email: string; role: string }>(
    undefined,
    `SELECT user_id, email, role FROM admin_users ORDER BY email`
  );
  const grants = await q<{ user_id: string; permission: string }>(undefined, `SELECT user_id, permission FROM youtube_admin_grants`);
  return admins.rows.map((admin) => ({
    user_id: admin.user_id,
    email: admin.email,
    role: admin.role,
    locked: admin.role === 'SUPER_ADMIN',
    permissions: permissionsForRole(admin.role, grants.rows.filter((grant) => grant.user_id === admin.user_id).map((grant) => grant.permission)),
  }));
}

export async function setAccess(userId: string, permissions: unknown, actorId: string) {
  const { rows } = await q(undefined, `SELECT user_id, role, email FROM admin_users WHERE user_id=$1`, [userId]);
  const admin = rows[0];
  if (!admin) throw new FinanceNotFoundError('Admin user not found');
  if (admin.role === 'SUPER_ADMIN') throw new FinanceValidationError('Super Admin already has full YouTube Research access.');
  const next = Array.isArray(permissions) ? [...new Set(permissions.map(String))] : [];
  if (next.some((key) => !isYoutubePermission(key))) throw new FinanceValidationError('One of the permissions is not part of YouTube Research.');
  await q(undefined, `DELETE FROM youtube_admin_grants WHERE user_id=$1`, [userId]);
  for (const permission of next) {
    await q(undefined, `INSERT INTO youtube_admin_grants (user_id, permission) VALUES ($1,$2)`, [userId, permission]);
  }
  await audit(actorId, 'YouTube Access Updated', 'admin_user', userId, { permissions: next });
  return { user_id: userId, permissions: next };
}

async function channelById(id: string) {
  const { rows } = await q(undefined, `SELECT c.*, (SELECT COUNT(*) FROM youtube_videos v WHERE v.channel_id=c.id) AS videos_imported FROM youtube_channels c WHERE c.id=$1`, [id]);
  if (!rows[0]) throw new FinanceNotFoundError('Channel not found');
  return rows[0];
}

export async function listChannels(query = '', classification = '', status = 'active') {
  const values: unknown[] = [];
  const where = ['1=1'];
  if (status === 'active' || status === 'removed') {
    values.push(status);
    where.push(`c.status=$${values.length}`);
  }
  if (classification) {
    values.push(classificationOf(classification));
    where.push(`c.classification=$${values.length}`);
  }
  if (query.trim()) {
    values.push(`%${query.trim()}%`);
    where.push(`(c.channel_name ILIKE $${values.length} OR c.channel_handle ILIKE $${values.length} OR c.youtube_channel_id ILIKE $${values.length})`);
  }
  const { rows } = await q(
    undefined,
    `SELECT c.*, (SELECT COUNT(*) FROM youtube_videos v WHERE v.channel_id=c.id) AS videos_imported
     FROM youtube_channels c WHERE ${where.join(' AND ')} ORDER BY c.channel_name NULLS LAST, c.youtube_channel_id`,
    values
  );
  return rows.map((row) => presentChannel(row));
}

export async function resolveChannel(input: string) {
  const channel = await createYoutube(await readApiKey()).resolve(input);
  return channel;
}

function channelValues(channel: ResolvedChannel) {
  return [
    channel.youtubeChannelId,
    channel.channelName,
    channel.channelHandle,
    channel.channelUrl,
    channel.description,
    channel.thumbnailUrl,
    channel.uploadsPlaylistId,
    channel.subscriberCount,
    channel.videoCount,
    channel.viewCount,
  ];
}

export async function saveChannel(input: string, classification: unknown, notes: unknown, userId: string) {
  const channel = await createYoutube(await readApiKey()).resolve(input);
  const kind = classificationOf(classification);
  const researchNotes = String(notes || '').trim() || null;
  if (researchNotes && researchNotes.length > 5000) throw new FinanceValidationError('Research notes are too long.');
  const existing = await q(undefined, `SELECT id, status FROM youtube_channels WHERE youtube_channel_id=$1`, [channel.youtubeChannelId]);
  if (existing.rows[0]?.status === 'active') throw new FinanceConflictError('This channel is already in YouTube Research.');
  const values = [...channelValues(channel), kind, researchNotes, userId];
  const { rows } = existing.rows[0]
    ? await q(
        undefined,
        `UPDATE youtube_channels SET
           channel_name=$2, channel_handle=$3, channel_url=$4, description=$5, thumbnail_url=$6, uploads_playlist_id=$7,
           subscriber_count=$8, video_count=$9, view_count=$10, classification=$11,
           research_notes=COALESCE($12, research_notes), status='active', last_refreshed_at=NOW(), created_by=COALESCE(created_by,$13)
         WHERE id=$1 RETURNING *`,
        [existing.rows[0].id, ...values.slice(1)]
      )
    : await q(
        undefined,
        `INSERT INTO youtube_channels (
           youtube_channel_id, channel_name, channel_handle, channel_url, description, thumbnail_url, uploads_playlist_id,
           subscriber_count, video_count, view_count, classification, research_notes, status, last_refreshed_at, created_by
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'active',NOW(),$13) RETURNING *`,
        values
      );
  await stampChannelPublished(rows[0].id, channel.publishedAt);
  await audit(userId, 'YouTube Channel Saved', 'youtube_channel', rows[0].id, { youtube_channel_id: channel.youtubeChannelId, classification: kind });
  return presentChannel({ ...rows[0], videos_imported: 0 });
}

export async function ensureChannel(input: string, userId: string) {
  const channel = await createYoutube(await readApiKey()).resolve(input);
  const existing = await q(undefined, `SELECT id FROM youtube_channels WHERE youtube_channel_id=$1`, [channel.youtubeChannelId]);
  if (existing.rows[0]) {
    await rememberChannel(existing.rows[0].id, channel);
    await q(undefined, `UPDATE youtube_channels SET status='active' WHERE id=$1 AND status='removed'`, [existing.rows[0].id]);
    return String(existing.rows[0].id);
  }
  const values = [...channelValues(channel), 'other', null, userId];
  const { rows } = await q(
    undefined,
    `INSERT INTO youtube_channels (
       youtube_channel_id, channel_name, channel_handle, channel_url, description, thumbnail_url, uploads_playlist_id,
       subscriber_count, video_count, view_count, classification, research_notes, status, last_refreshed_at, created_by
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'active',NOW(),$13) RETURNING id`,
    values
  );
  await stampChannelPublished(rows[0].id, channel.publishedAt);
  await audit(userId, 'YouTube Channel Saved', 'youtube_channel', rows[0].id, { youtube_channel_id: channel.youtubeChannelId, classification: 'other' });
  return String(rows[0].id);
}

export async function getChannel(id: string) {
  const channel = presentChannel(await channelById(id));
  const videos = await q(undefined, `${VIDEO_SELECT} WHERE v.channel_id=$1 ORDER BY v.published_at DESC NULLS LAST LIMIT 25`, [id]);
  const jobs = await q(undefined, `SELECT * FROM youtube_import_jobs WHERE channel_id=$1 ORDER BY created_at DESC LIMIT 8`, [id]);
  return { channel, videos: videos.rows.map((row) => presentVideo(row)), imports: jobs.rows };
}

export async function updateChannel(id: string, body: Record<string, unknown>, userId: string) {
  await channelById(id);
  const fields: string[] = [];
  const values: unknown[] = [id];
  if (body.classification != null) {
    values.push(classificationOf(body.classification));
    fields.push(`classification=$${values.length}`);
  }
  if (body.research_notes != null || body.researchNotes != null) {
    const notes = String(body.research_notes ?? body.researchNotes ?? '').trim() || null;
    if (notes && notes.length > 5000) throw new FinanceValidationError('Research notes are too long.');
    values.push(notes);
    fields.push(`research_notes=$${values.length}`);
  }
  if (body.status != null) {
    const status = String(body.status);
    if (!['active', 'removed'].includes(status)) throw new FinanceValidationError('Status must be active or removed.');
    values.push(status);
    fields.push(`status=$${values.length}`);
  }
  if (!fields.length) throw new FinanceValidationError('Nothing to update.');
  const { rows } = await q(undefined, `UPDATE youtube_channels SET ${fields.join(', ')} WHERE id=$1 RETURNING *`, values);
  await audit(userId, 'YouTube Channel Updated', 'youtube_channel', id, { fields: fields.map((field) => field.split('=')[0]) });
  return presentChannel(rows[0]);
}

export async function refreshChannel(id: string, userId: string, fetchImpl?: YoutubeFetch) {
  const current = await channelById(id);
  if (current.status !== 'active') throw new FinanceValidationError('Restore this channel before refreshing it.');
  const resolved = await createYoutube(await readApiKey(), fetchImpl).resolve(current.youtube_channel_id);
  const { rows } = await q(
    undefined,
    `UPDATE youtube_channels SET
       channel_name=$2, channel_handle=$3, channel_url=$4, description=$5, thumbnail_url=$6, uploads_playlist_id=$7,
       subscriber_count=$8, video_count=$9, view_count=$10, last_refreshed_at=NOW()
     WHERE id=$1 RETURNING *`,
    [id, ...channelValues(resolved).slice(1)]
  );
  await stampChannelPublished(id, resolved.publishedAt);
  await audit(userId, 'YouTube Channel Refreshed', 'youtube_channel', id, {});
  return presentChannel({ ...rows[0], videos_imported: current.videos_imported });
}

export async function removeChannel(id: string, userId: string) {
  await channelById(id);
  await q(undefined, `UPDATE youtube_channels SET status='removed' WHERE id=$1`, [id]);
  await audit(userId, 'YouTube Channel Removed', 'youtube_channel', id, {});
  return { ok: true };
}

function limitOf(value: unknown, settings: { default_import_limit?: unknown; max_import_limit?: unknown }) {
  const max = Number(settings.max_import_limit);
  const fallback = Number(settings.default_import_limit);
  const requested = value == null || value === '' ? fallback : Number(value);
  if (!Number.isInteger(requested) || requested < 1) throw new FinanceValidationError('Maximum results must be a positive whole number.');
  if (requested > max) throw new FinanceValidationError(`Maximum results cannot be more than ${max}.`);
  return requested;
}

async function stampChannelPublished(channelId: string, publishedAt: string | null) {
  if (!publishedAt) return;
  await q(undefined, `UPDATE youtube_channels SET channel_published_at=$2 WHERE id=$1`, [channelId, publishedAt]);
}

async function rememberChannel(channelId: string, resolved: ResolvedChannel) {
  await q(
    undefined,
    `UPDATE youtube_channels SET
       channel_name=$2, channel_handle=$3, channel_url=$4, description=$5, thumbnail_url=$6, uploads_playlist_id=$7,
       subscriber_count=$8, video_count=$9, view_count=$10, last_refreshed_at=NOW()
     WHERE id=$1`,
    [channelId, ...channelValues(resolved).slice(1)]
  );
  await stampChannelPublished(channelId, resolved.publishedAt);
}

async function upsertVideo(channelId: string, video: ResolvedVideo) {
  await q(undefined, VIDEO_UPSERT_SQL, [
    channelId,
    video.youtubeVideoId,
    video.title,
    `https://www.youtube.com/watch?v=${video.youtubeVideoId}`,
    video.description,
    video.publishedAt,
    video.duration,
    video.thumbnailUrl,
    video.viewCount,
    video.likeCount,
    video.commentCount,
    video.tags || [],
    video.categoryId,
    video.defaultLanguage,
    video.defaultAudioLanguage,
    durationSeconds(video.duration),
    video.hasPaidProductPlacement,
  ]);
}

async function playlistItems(youtube: ReturnType<typeof createYoutube>, playlistId: string | null, options: { limit: number; from?: string | null; to?: string | null }) {
  if (!playlistId) return { videos: [] as { videoId: string; publishedAt: string | null }[], truncated: false };
  try {
    return await youtube.uploads(playlistId, options);
  } catch (err) {
    if (err instanceof YoutubeApiError && (err.code === 'not_found' || err.status === 404 || String(err.googleReason || '').includes('playlistNotFound'))) {
      return { videos: [], truncated: false };
    }
    throw err;
  }
}

function mergePlaylistVideos(
  primary: { videoId: string; publishedAt: string | null }[],
  extra: { videoId: string; publishedAt: string | null }[],
  limit: number
) {
  const seen = new Set<string>();
  const merged: { videoId: string; publishedAt: string | null }[] = [];
  for (const item of [...primary, ...extra]) {
    if (!item.videoId || seen.has(item.videoId)) continue;
    seen.add(item.videoId);
    merged.push(item);
    if (merged.length >= limit) break;
  }
  return merged;
}

async function runImport(channelId: string, body: Record<string, unknown>, userId: string, fetchImpl?: YoutubeFetch) {
  const current = await channelById(channelId);
  if (current.status !== 'active') throw new FinanceValidationError('Restore this channel before importing videos.');
  const settings = await settingsRow();
  const limit = limitOf(body.limit ?? body.maximum_results, settings);
  const mode = modeOf(body.mode ?? body.import_mode ?? body.import_type);
  const dateFrom = dateOrNull(body.date_from ?? body.from);
  const dateTo = dateOrNull(body.date_to ?? body.to);
  if (dateFrom && dateTo && dateFrom > dateTo) throw new FinanceValidationError('The start date is after the end date.');
  await q(undefined, `UPDATE youtube_import_jobs SET status='failed', error_summary='The import stopped before it finished.', completed_at=NOW() WHERE status='running' AND started_at < NOW() - INTERVAL '10 minutes'`);
  const running = await q(undefined, `SELECT id FROM youtube_import_jobs WHERE channel_id=$1 AND status='running'`, [channelId]);
  if (running.rows[0]) throw new FinanceConflictError('An import is already running for this channel.');
  const youtube = createYoutube(await readApiKey(), fetchImpl);
  const resolved = await youtube.resolve(current.youtube_channel_id);
  if (!resolved.uploadsPlaylistId) throw new FinanceValidationError('This channel has no public uploads playlist.');
  await rememberChannel(channelId, resolved);
  const { rows } = await q(
    undefined,
    `INSERT INTO youtube_import_jobs (channel_id, requested_by, import_type, date_from, date_to, requested_limit, status, started_at, project_id)
     VALUES ($1,$2,$3,$4,$5,$6,'running',NOW(),$7) RETURNING *`,
    [channelId, userId, mode, dateFrom, dateTo, limit, body.project_id || null]
  );
  const jobId = rows[0].id;
  let processed = 0;
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let summary: string | null = null;
  try {
    const uploads = await playlistItems(youtube, resolved.uploadsPlaylistId, { limit, from: dateFrom, to: dateTo });
    const shorts = await playlistItems(youtube, shortsPlaylistId(resolved.youtubeChannelId), { limit, from: dateFrom, to: dateTo });
    const collectedVideos = mergePlaylistVideos(shorts.videos, uploads.videos, limit);
    if (uploads.truncated || shorts.truncated) summary = 'Scanning stopped after 1,000 playlist items. Narrow the dates to reach older videos.';
    const ids = collectedVideos.map((item) => item.videoId);
    const known = ids.length
      ? await q<{ youtube_video_id: string }>(undefined, `SELECT youtube_video_id FROM youtube_videos WHERE youtube_video_id = ANY($1::text[])`, [ids])
      : { rows: [] };
    const existing = new Set(known.rows.map((row) => row.youtube_video_id));
    const targets = mode === 'new' ? ids.filter((id) => !existing.has(id)) : ids;
    skipped += ids.length - targets.length;
    const details = await youtube.videos(targets);
    const found = new Set(details.map((video) => video.youtubeVideoId));
    skipped += targets.filter((id) => !found.has(id)).length;
    for (const video of details) {
      const published = video.publishedAt ? video.publishedAt.slice(0, 10) : '';
      if (dateFrom && published && published < dateFrom) {
        skipped += 1;
        continue;
      }
      if (dateTo && published && published > dateTo) {
        skipped += 1;
        continue;
      }
      await upsertVideo(channelId, video);
      if (existing.has(video.youtubeVideoId)) updated += 1;
      else inserted += 1;
      processed += 1;
    }
    const status = summary ? 'partially_completed' : 'completed';
    await q(
      undefined,
      `UPDATE youtube_import_jobs SET processed_count=$2, inserted_count=$3, updated_count=$4, skipped_count=$5, status=$6, error_summary=$7, completed_at=NOW() WHERE id=$1`,
      [jobId, processed, inserted, updated, skipped, status, summary]
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Import failed';
    await q(
      undefined,
      `UPDATE youtube_import_jobs SET processed_count=$2, inserted_count=$3, updated_count=$4, skipped_count=$5, status=$6, error_summary=$7, completed_at=NOW() WHERE id=$1`,
      [jobId, processed, inserted, updated, skipped, processed ? 'partially_completed' : 'failed', message]
    );
    if (!processed) throw err;
  }
  await audit(userId, 'YouTube Videos Imported', 'youtube_import', jobId, { channelId, mode, processed, inserted, updated, skipped });
  const job = await q(undefined, `SELECT * FROM youtube_import_jobs WHERE id=$1`, [jobId]);
  return job.rows[0];
}

export async function previewImport(body: Record<string, unknown>, fetchImpl?: YoutubeFetch) {
  const channelId = String(body.channel_id || body.channelId || '');
  const current = await channelById(channelId);
  const settings = await settingsRow();
  const limit = Math.min(10, limitOf(body.limit ?? body.maximum_results, settings));
  const dateFrom = dateOrNull(body.date_from ?? body.from);
  const dateTo = dateOrNull(body.date_to ?? body.to);
  const youtube = createYoutube(await readApiKey(), fetchImpl);
  const resolved = await youtube.resolve(current.youtube_channel_id);
  if (!resolved.uploadsPlaylistId) throw new FinanceValidationError('This channel has no public uploads playlist.');
  const uploads = await playlistItems(youtube, resolved.uploadsPlaylistId, { limit, from: dateFrom, to: dateTo });
  const shorts = await playlistItems(youtube, shortsPlaylistId(resolved.youtubeChannelId), { limit, from: dateFrom, to: dateTo });
  const collected = { videos: mergePlaylistVideos(shorts.videos, uploads.videos, limit), truncated: uploads.truncated || shorts.truncated };
  const details = await youtube.videos(collected.videos.map((item) => item.videoId));
  return {
    channel_id: channelId,
    sample: details.map((video) => ({
      youtube_video_id: video.youtubeVideoId,
      title: video.title,
      published_at: video.publishedAt,
      view_count: video.viewCount,
      like_count: video.likeCount,
      comment_count: video.commentCount,
    })),
    truncated: collected.truncated,
    notice: 'Preview does not save videos. Start import to store them.',
  };
}

export async function startImport(body: Record<string, unknown>, userId: string) {
  const channelId = String(body.channel_id || body.channelId || '');
  if (!channelId) throw new FinanceValidationError('Choose a channel.');
  return runImport(channelId, body, userId);
}

export async function retryImport(id: string, userId: string) {
  const { rows } = await q(undefined, `SELECT * FROM youtube_import_jobs WHERE id=$1`, [id]);
  const job = rows[0];
  if (!job) throw new FinanceNotFoundError('Import not found');
  if (job.status === 'running') throw new FinanceConflictError('This import is still running.');
  return runImport(job.channel_id, { mode: job.import_type, date_from: job.date_from, date_to: job.date_to, limit: job.requested_limit }, userId);
}

export async function listImports(channelId = '') {
  const values: unknown[] = [];
  let where = '';
  if (channelId) {
    values.push(channelId);
    where = `WHERE j.channel_id=$1`;
  }
  const { rows } = await q(
    undefined,
    `SELECT j.*, c.youtube_channel_id, c.channel_name, c.last_refreshed_at AS channel_refreshed_at
     FROM youtube_import_jobs j
     JOIN youtube_channels c ON c.id = j.channel_id ${where}
     ORDER BY j.created_at DESC LIMIT 50`,
    values
  );
  return rows.map((row) => ({
    ...row,
    channel_name: presentChannel({ ...row, last_refreshed_at: row.channel_refreshed_at, videos_imported: 0 }).channel_name,
  }));
}

export async function getImport(id: string) {
  const { rows } = await q(undefined, `SELECT * FROM youtube_import_jobs WHERE id=$1`, [id]);
  if (!rows[0]) throw new FinanceNotFoundError('Import not found');
  return rows[0];
}

function videoFilters(params: { q?: string; channelId?: string; topicId?: string; from?: string; to?: string; freshOnly?: boolean }) {
  const values: unknown[] = [];
  const where = [`c.status='active'`];
  if (params.q?.trim()) {
    values.push(`%${params.q.trim()}%`);
    where.push(`(v.title ILIKE $${values.length} OR v.youtube_video_id ILIKE $${values.length})`);
  }
  if (params.channelId) {
    values.push(params.channelId);
    where.push(`v.channel_id=$${values.length}`);
  }
  if (params.topicId === 'none') where.push(`r.topic_id IS NULL`);
  else if (params.topicId) {
    values.push(params.topicId);
    where.push(`r.topic_id=$${values.length}`);
  }
  if (params.from) {
    values.push(dateOrNull(params.from));
    where.push(`v.published_at >= $${values.length}::date`);
  }
  if (params.to) {
    values.push(dateOrNull(params.to));
    where.push(`v.published_at < ($${values.length}::date + INTERVAL '1 day')`);
  }
  if (params.freshOnly) where.push(`v.fetched_at > NOW() - INTERVAL '30 days'`);
  return { values, where: where.join(' AND ') };
}

export async function listVideos(params: { q?: string; channelId?: string; topicId?: string; from?: string; to?: string; sort?: string; page?: number; pageSize?: number }) {
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 20));
  const sort = SORTS[params.sort || ''] || SORTS.published_at;
  const filter = videoFilters(params);
  const { rows } = await q(undefined, `${VIDEO_SELECT} WHERE ${filter.where} ORDER BY ${sort} LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`, filter.values);
  const count = await q<{ count: string }>(undefined, `SELECT COUNT(*)::text AS count FROM youtube_videos v JOIN youtube_channels c ON c.id=v.channel_id LEFT JOIN youtube_video_research r ON r.video_id=v.id WHERE ${filter.where}`, filter.values);
  return { rows: rows.map((row) => presentVideo(row)), total: Number(count.rows[0]?.count || 0), page, pageSize };
}

export async function getVideo(id: string) {
  const { rows } = await q(undefined, `${VIDEO_SELECT} WHERE v.id=$1`, [id]);
  if (!rows[0]) throw new FinanceNotFoundError('Video not found');
  return presentVideo(rows[0]);
}

export async function updateResearch(id: string, body: Record<string, unknown>, userId: string) {
  const video = await q(undefined, `SELECT id FROM youtube_videos WHERE id=$1`, [id]);
  if (!video.rows[0]) throw new FinanceNotFoundError('Video not found');
  const topicId = body.topic_id === undefined && body.topicId === undefined ? undefined : String(body.topic_id ?? body.topicId ?? '').trim() || null;
  if (topicId) {
    const topic = await q(undefined, `SELECT id FROM youtube_research_topics WHERE id=$1 AND active`, [topicId]);
    if (!topic.rows[0]) throw new FinanceValidationError('Choose a topic from the list.');
  }
  const caption = body.thumbnail_caption === undefined && body.thumbnailCaption === undefined ? undefined : String(body.thumbnail_caption ?? body.thumbnailCaption ?? '').trim() || null;
  const notes = body.research_notes === undefined && body.researchNotes === undefined ? undefined : String(body.research_notes ?? body.researchNotes ?? '').trim() || null;
  if (caption && caption.length > 500) throw new FinanceValidationError('The thumbnail caption is too long.');
  if (notes && notes.length > 5000) throw new FinanceValidationError('Research notes are too long.');
  const existing = await q(undefined, `SELECT * FROM youtube_video_research WHERE video_id=$1`, [id]);
  const nextTopic = topicId === undefined ? existing.rows[0]?.topic_id || null : topicId;
  const nextCaption = caption === undefined ? existing.rows[0]?.thumbnail_caption || null : caption;
  const nextNotes = notes === undefined ? existing.rows[0]?.research_notes || null : notes;
  await q(
    undefined,
    `INSERT INTO youtube_video_research (video_id, topic_id, thumbnail_caption, research_notes, updated_by)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (video_id) DO UPDATE SET topic_id=$2, thumbnail_caption=$3, research_notes=$4, updated_by=$5`,
    [id, nextTopic, nextCaption, nextNotes, userId]
  );
  await audit(userId, 'YouTube Research Saved', 'youtube_video', id, { topicId: nextTopic });
  return getVideo(id);
}

export async function refreshVideos(ids: unknown, userId: string) {
  const list = Array.isArray(ids) ? ids.map(String).filter(Boolean).slice(0, 50) : [];
  if (!list.length) throw new FinanceValidationError('Choose at least one video.');
  const { rows } = await q(undefined, `SELECT id, youtube_video_id, channel_id FROM youtube_videos WHERE id = ANY($1::uuid[])`, [list]);
  if (!rows.length) throw new FinanceNotFoundError('Video not found');
  const youtube = createYoutube(await readApiKey());
  const details = await youtube.videos(rows.map((row) => row.youtube_video_id));
  const byYt = new Map(details.map((video) => [video.youtubeVideoId, video]));
  let updated = 0;
  for (const row of rows) {
    const video = byYt.get(row.youtube_video_id);
    if (!video) continue;
    await upsertVideo(row.channel_id, video);
    updated += 1;
  }
  await audit(userId, 'YouTube Videos Refreshed', 'youtube_video', null, { requested: list.length, updated });
  return { updated, missing: rows.length - updated };
}

export async function listTopics(includeInactive = false) {
  const { rows } = await q(undefined, `SELECT * FROM youtube_research_topics ${includeInactive ? '' : 'WHERE active'} ORDER BY name`);
  return rows;
}

export async function saveTopic(body: Record<string, unknown>, userId: string, id?: string) {
  const name = String(body.name || '').trim();
  if (name.length < 2 || name.length > 80) throw new FinanceValidationError('Topic name must be 2 to 80 characters.');
  const description = String(body.description || '').trim() || null;
  const active = body.active === undefined ? true : Boolean(body.active);
  try {
    const { rows } = id
      ? await q(undefined, `UPDATE youtube_research_topics SET name=$2, description=$3, active=$4 WHERE id=$1 RETURNING *`, [id, name, description, active])
      : await q(undefined, `INSERT INTO youtube_research_topics (name, description, active, created_by) VALUES ($1,$2,$3,$4) RETURNING *`, [name, description, active, userId]);
    if (!rows[0]) throw new FinanceNotFoundError('Topic not found');
    await audit(userId, id ? 'YouTube Topic Updated' : 'YouTube Topic Created', 'youtube_topic', rows[0].id, { name });
    return rows[0];
  } catch (err) {
    if (err instanceof Error && /youtube_topics_name_lower|duplicate key/i.test(err.message)) {
      throw new FinanceConflictError('A topic with that name already exists.');
    }
    throw err;
  }
}

export async function archiveTopic(id: string, userId: string) {
  const { rows } = await q(undefined, `UPDATE youtube_research_topics SET active=FALSE WHERE id=$1 RETURNING id`, [id]);
  if (!rows[0]) throw new FinanceNotFoundError('Topic not found');
  await audit(userId, 'YouTube Topic Archived', 'youtube_topic', id, {});
  return { ok: true };
}

export function performanceSummary(videos: { view_count?: number | null }[]) {
  return {
    videosAnalyzed: videos.length,
    videosWithViewCounts: videos.filter((video) => video.view_count != null).length,
    officialAnalytics: false as const,
    notice: YOUTUBE_METRIC_NOTICE,
  };
}

export async function videoAnalytics(params: { channelId?: string; topicId?: string; from?: string; to?: string; sort?: string; limit?: number }) {
  const settings = await settingsRow();
  const limit = Math.min(100, Math.max(1, Number(params.limit) || 25));
  const sort = SORTS[params.sort || settings.default_sort] || SORTS.published_at;
  const filter = videoFilters({ ...params, freshOnly: true });
  const { rows } = await q(undefined, `${VIDEO_SELECT} WHERE ${filter.where} ORDER BY ${sort} LIMIT ${limit}`, filter.values);
  const videos = rows.map((row) => presentVideo(row));
  return {
    ...performanceSummary(videos),
    videos,
    publishing: publishingBuckets(videos.map((video) => (video.published_at ? String(video.published_at) : null))),
    topics: topicCounts(videos),
  };
}

function topicCounts(videos: { topic_name?: unknown }[]) {
  const map = new Map<string, number>();
  for (const video of videos) {
    const name = video.topic_name ? String(video.topic_name) : 'Uncategorized';
    map.set(name, (map.get(name) || 0) + 1);
  }
  return [...map.entries()].map(([topic, count]) => ({ topic, count }));
}

export async function compareChannels(ids: string[], params: { from?: string; to?: string; topicId?: string }) {
  const unique = [...new Set(ids.map(String).filter(Boolean))].slice(0, 6);
  if (unique.length < 2) throw new FinanceValidationError('Select at least two channels.');
  const channels = [];
  for (const id of unique) {
    const filter = videoFilters({ channelId: id, from: params.from, to: params.to, topicId: params.topicId, freshOnly: true });
    const { rows } = await q(undefined, `${VIDEO_SELECT} WHERE ${filter.where} ORDER BY v.view_count DESC NULLS LAST LIMIT 50`, filter.values);
    const videos = rows.map((row) => presentVideo(row));
    const channel = presentChannel(await channelById(id));
    channels.push({
      id,
      channel_name: channel.channel_name,
      youtube_channel_id: channel.youtube_channel_id,
      classification: channel.classification,
      stale: channel.stale,
      videosIncluded: videos.length,
      videos,
      publishing: publishingBuckets(videos.map((video) => (video.published_at ? String(video.published_at) : null))),
    });
  }
  const topics = new Map<string, Record<string, number>>();
  for (const channel of channels) {
    for (const video of channel.videos) {
      const name = String(video.topic_name || 'Uncategorized');
      const row = topics.get(name) || {};
      row[channel.id] = (row[channel.id] || 0) + 1;
      topics.set(name, row);
    }
  }
  return {
    notice: YOUTUBE_METRIC_NOTICE,
    officialAnalytics: false,
    channels,
    topicCoverage: [...topics.entries()].map(([topic, counts]) => ({ topic, counts })),
  };
}

export async function dashboard() {
  const channels = await q<{ count: string }>(undefined, `SELECT COUNT(*)::text AS count FROM youtube_channels WHERE status='active'`);
  const videos = await q<{ count: string }>(undefined, `SELECT COUNT(*)::text AS count FROM youtube_videos v JOIN youtube_channels c ON c.id=v.channel_id WHERE c.status='active'`);
  const categorized = await q<{ count: string }>(undefined, `SELECT COUNT(*)::text AS count FROM youtube_video_research r JOIN youtube_videos v ON v.id=r.video_id JOIN youtube_channels c ON c.id=v.channel_id WHERE c.status='active' AND r.topic_id IS NOT NULL`);
  const recentChannels = await q(undefined, `SELECT c.*, (SELECT COUNT(*) FROM youtube_videos v WHERE v.channel_id=c.id) AS videos_imported FROM youtube_channels c WHERE c.status='active' ORDER BY c.created_at DESC LIMIT 5`);
  const recentImports = await q(undefined, `SELECT j.*, c.channel_name, c.last_refreshed_at FROM youtube_import_jobs j JOIN youtube_channels c ON c.id=j.channel_id ORDER BY j.created_at DESC LIMIT 5`);
  const recentVideos = await q(undefined, `${VIDEO_SELECT} WHERE c.status='active' ORDER BY v.published_at DESC NULLS LAST LIMIT 6`);
  const topVideos = await q(undefined, `${VIDEO_SELECT} WHERE c.status='active' AND v.fetched_at > NOW() - INTERVAL '30 days' AND v.view_count IS NOT NULL ORDER BY v.view_count DESC LIMIT 5`);
  const topics = await q(undefined, `SELECT COALESCE(t.name, 'Uncategorized') AS topic, COUNT(*)::int AS count
    FROM youtube_videos v JOIN youtube_channels c ON c.id=v.channel_id
    LEFT JOIN youtube_video_research r ON r.video_id=v.id
    LEFT JOIN youtube_research_topics t ON t.id=r.topic_id
    WHERE c.status='active' GROUP BY t.name ORDER BY count DESC, topic`);
  const videoCount = Number(videos.rows[0]?.count || 0);
  const categorizedCount = Number(categorized.rows[0]?.count || 0);
  return {
    notice: YOUTUBE_METRIC_NOTICE,
    channels: Number(channels.rows[0]?.count || 0),
    videos: videoCount,
    categorized: categorizedCount,
    awaitingReview: Math.max(0, videoCount - categorizedCount),
    recentChannels: recentChannels.rows.map((row) => presentChannel(row)),
    recentImports: recentImports.rows,
    recentVideos: recentVideos.rows.map((row) => presentVideo(row)),
    topVideos: topVideos.rows.map((row) => presentVideo(row)),
    topics: topics.rows,
  };
}

export async function rowsForExport(params: { channelId?: string; topicId?: string; from?: string; to?: string }) {
  const filter = videoFilters(params);
  const { rows } = await q(undefined, `${VIDEO_SELECT} WHERE ${filter.where} ORDER BY c.channel_name NULLS LAST, v.published_at DESC NULLS LAST LIMIT 5001`, filter.values);
  if (rows.length > 5000) throw new FinanceValidationError('Narrow the filters. Exports include up to 5,000 rows.');
  return rows.map((row) => presentVideo(row));
}
