import { AsyncLocalStorage } from 'node:async_hooks';
import { q } from '../finance/db';
import { FinanceNotFoundError } from '../finance/errors';

type YoutubeScope = { partnerId: string };

const storage = new AsyncLocalStorage<YoutubeScope>();

export function currentYoutubePartnerId() {
  return storage.getStore()?.partnerId || null;
}

export function withYoutubePartner<T>(partnerId: string | null, fn: () => Promise<T>) {
  if (!partnerId) return fn();
  return storage.run({ partnerId }, fn);
}

/** Which portal issued the YouTube API call. An admin cookie must not override a partner page. */
export function youtubePortalFrom(explicit: string | null | undefined, referer: string | null | undefined) {
  if (explicit === 'partner' || explicit === 'admin') return explicit;
  try {
    const path = new URL(referer || '').pathname;
    if (path.startsWith('/partner/')) return 'partner' as const;
    if (path.startsWith('/admin/')) return 'admin' as const;
  } catch {
    /* referer is not a URL */
  }
  return '' as const;
}

/** How a partner session may use a YouTube API path. Admin sessions are not filtered here. */
export function partnerYoutubeAccess(method: string, path: string[]) {
  const head = path[0] || '';
  if (head === 'session') return method === 'GET' ? 'allow' : 'deny';
  if (head === 'settings') return method === 'GET' ? 'allow' : 'deny';
  if (head === 'projects') {
    if (!path[1]) return method === 'GET' || method === 'POST' ? 'allow' : 'deny';
    return 'project';
  }
  if (head === 'channels' && method === 'POST' && path[1] === 'resolve') return 'allow';
  if (head === 'channels' && method === 'POST' && path[2] === 'refresh' && path[1]) return 'channel';
  if (head === 'channels' && path[1] && path[1] !== 'resolve' && (method === 'GET' || method === 'PATCH')) return 'channel';
  if (head === 'videos' && method === 'POST' && path[1] === 'refresh') return 'videos';
  if (head === 'reports' && method === 'POST' && path[1] === 'export') return 'export';
  return 'deny';
}

export async function assertYoutubeProject(projectId: string) {
  const partnerId = currentYoutubePartnerId();
  if (!partnerId || !projectId) return;
  const { rows } = await q<{ partner_id: string | null }>(
    undefined,
    `SELECT partner_id FROM youtube_research_projects WHERE id=$1`,
    [projectId]
  );
  if (rows[0]?.partner_id !== partnerId) throw new FinanceNotFoundError('Research project not found');
}

export async function assertYoutubeChannel(channelId: string) {
  const partnerId = currentYoutubePartnerId();
  if (!partnerId || !channelId) return;
  const { rows } = await q(
    undefined,
    `SELECT 1
     FROM youtube_project_channels pc
     JOIN youtube_research_projects p ON p.id = pc.project_id
     WHERE pc.channel_id=$1 AND p.partner_id=$2
     LIMIT 1`,
    [channelId, partnerId]
  );
  if (!rows[0]) throw new FinanceNotFoundError('Channel not found');
}

export async function assertYoutubeVideos(ids: unknown) {
  const partnerId = currentYoutubePartnerId();
  if (!partnerId) return;
  const list = Array.isArray(ids) ? [...new Set(ids.map(String).filter(Boolean))] : [];
  if (!list.length) throw new FinanceNotFoundError('Video not found');
  const { rows } = await q<{ count: string }>(
    undefined,
    `SELECT COUNT(DISTINCT v.id)::text AS count
     FROM youtube_videos v
     JOIN youtube_project_channels pc ON pc.channel_id = v.channel_id
     JOIN youtube_research_projects p ON p.id = pc.project_id
     WHERE v.id = ANY($1::uuid[]) AND p.partner_id=$2`,
    [list, partnerId]
  );
  if (Number(rows[0]?.count || 0) !== list.length) throw new FinanceNotFoundError('Video not found');
}

export async function protectPartnerScope(method: string, path: string[], body?: Record<string, unknown>) {
  if (!currentYoutubePartnerId()) return;
  const access = partnerYoutubeAccess(method, path);
  if (access === 'deny') throw new FinanceNotFoundError('Not found');
  if (access === 'project') await assertYoutubeProject(path[1]);
  if (access === 'channel') await assertYoutubeChannel(path[1]);
  if (access === 'videos') await assertYoutubeVideos(body?.ids);
  if (access === 'export') {
    const projectId = String(body?.project_id || body?.projectId || '');
    if (!projectId) throw new FinanceNotFoundError('Research project not found');
    await assertYoutubeProject(projectId);
  }
}
