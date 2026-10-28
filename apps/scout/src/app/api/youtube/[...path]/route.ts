import { cache } from 'react';
import { NextResponse } from 'next/server';
import { financeErrorResponse, fileResponse } from '@/lib/finance/http';
import { YoutubeApiError } from '@/lib/youtube/client';
import { firstNameFrom, researchHome } from '@/lib/youtube/home';
import { hasYoutubePermission, permissionsForRole, type YoutubePermission } from '@/lib/youtube/permissions';
import { FEATURE_YOUTUBE, resolveAccess } from '@/lib/saas/catalog';
import { getPlatformActor } from '@/lib/saas/session';
import { currentSaasAccountId, currentYoutubePartnerId, protectPartnerScope, withYoutubeContext, withYoutubePartner } from '@/lib/youtube/scope';
import { projectAnalysis, summarizeAnalysisVideo, summarizeProjectAnalysis } from '@/lib/youtube/analysis';
import {
  addProjectChannel,
  archiveProject,
  archiveProjectTopic,
  compareProjectChannels,
  compareProjectVideos,
  createProject,
  getProject,
  getProjectVideo,
  importProject,
  importProjectVideosFromUrls,
  listProjectChannels,
  listProjectTopics,
  listProjects,
  listProjectVideos,
  projectFilterOptions,
  projectOverview,
  projectVideoInsights,
  removeProjectChannel,
  saveProjectResearch,
  saveProjectTopic,
  setPrimaryChannel,
  updateProject,
  duplicateProject,
} from '@/lib/youtube/projects';
import {
  archiveResearchReport,
  createAiAnalysis,
  generateAiInsights,
  createResearchReport,
  deleteAiAnalysis,
  deleteResearchReport,
  getAiAnalysis,
  getResearchReport,
  listAiAnalyses,
  listQuickAnalyses,
  listQuickReports,
  listResearchReports,
  updateAiAction,
} from '@/lib/youtube/ai-research';
import { exportResearchReport } from '@/lib/youtube/ai-research-export';
import { deleteYoutubeTraining, importYoutubeTrainingFile, listYoutubeTraining, saveYoutubeTraining } from '@/lib/youtube/youtube-master';
import { exportResearch } from '@/lib/youtube/reports';
import {
  archiveTopic,
  compareChannels,
  dashboard,
  getChannel,
  getImport,
  getSettings,
  getVideo,
  grantsFor,
  listAccess,
  listChannels,
  listImports,
  listTopics,
  listVideos,
  previewImport,
  refreshChannel,
  refreshVideos,
  removeChannel,
  resolveChannel,
  searchChannels,
  retryImport,
  saveChannel,
  saveTopic,
  setAccess,
  startImport,
  testConnection,
  updateChannel,
  updateResearch,
  updateSettings,
  videoAnalytics,
} from '@/lib/youtube/service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

function videoQuery(projectId: string, url: URL) {
  return {
    projectId,
    q: url.searchParams.get('q') || '',
    channelIds: (url.searchParams.get('channelIds') || '').split(',').filter(Boolean),
    topicId: url.searchParams.get('topicId') || '',
    tag: url.searchParams.get('tag') || '',
    categoryId: url.searchParams.get('categoryId') || '',
    from: url.searchParams.get('from') || '',
    to: url.searchParams.get('to') || '',
    minViews: url.searchParams.get('minViews') || '',
    maxViews: url.searchParams.get('maxViews') || '',
    minLikes: url.searchParams.get('minLikes') || '',
    maxLikes: url.searchParams.get('maxLikes') || '',
    minComments: url.searchParams.get('minComments') || '',
    maxComments: url.searchParams.get('maxComments') || '',
    minDuration: url.searchParams.get('minDuration') || '',
    maxDuration: url.searchParams.get('maxDuration') || '',
    content: url.searchParams.get('content') || '',
    placement: url.searchParams.get('placement') || '',
    sort: url.searchParams.get('sort') || '',
    page: Number(url.searchParams.get('page') || 1),
    pageSize: Number(url.searchParams.get('pageSize') || 20),
  };
}

function fail(err: unknown) {
  if (err instanceof YoutubeApiError) {
    return NextResponse.json({ error: err.message, code: err.code, googleStatus: err.googleStatus, googleReason: err.googleReason }, { status: err.status });
  }
  return financeErrorResponse(err);
}

const resolveYoutubeActor = cache(async () => {
  const actor = await getPlatformActor();
  if (!actor) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  if (actor.role === 'SUPER_ADMIN') {
    return {
      user: { id: actor.userId, email: actor.email } as { id: string; email?: string },
      role: 'SUPER_ADMIN',
      permissions: permissionsForRole('SUPER_ADMIN', []),
      partnerId: null as string | null,
      saasAccountId: null as string | null,
      displayName: firstNameFrom(actor.name, actor.email),
    };
  }
  const access = await resolveAccess(actor.account, actor.role);
  if (!access.has(FEATURE_YOUTUBE)) {
    return { error: NextResponse.json({ error: 'YouTube Research is not included in your package.' }, { status: 402 }) };
  }
  const grants = await grantsFor(actor.userId);
  return {
    user: { id: actor.userId, email: actor.email } as { id: string; email?: string },
    role: actor.role,
    permissions: permissionsForRole(actor.role, grants),
    partnerId: null as string | null,
    saasAccountId: actor.account?.id || null,
    displayName: firstNameFrom(actor.name, actor.email),
  };
});

async function gate(permission: YoutubePermission) {
  const auth = await resolveYoutubeActor();
  if ('error' in auth) return auth;
  if (!hasYoutubePermission(auth.role, auth.permissions, permission)) {
    return { error: NextResponse.json({ error: 'You do not have permission for this action' }, { status: 403 }) };
  }
  return auth;
}

async function enterPartnerScope<T>(run: () => Promise<T>) {
  if (currentYoutubePartnerId() || currentSaasAccountId()) return run();
  try {
    const actor = await resolveYoutubeActor();
    if ('error' in actor) return actor.error as T;
    if (actor.saasAccountId) return withYoutubeContext({ partnerId: actor.partnerId, saasAccountId: actor.saasAccountId }, run);
    if (actor.partnerId) return withYoutubePartner(actor.partnerId, run);
    return run();
  } catch (err) {
    return fail(err) as T;
  }
}

async function readBody(request: Request) {
  const type = request.headers.get('content-type') || '';
  if (!type.includes('application/json')) return {};
  return request.json();
}

export async function GET(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  return enterPartnerScope(() => handleGet(request, context));
}

async function handleGet(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  try {
    const path = (await context.params).path || [];
    const url = new URL(request.url);
    await protectPartnerScope('GET', path);
    if (path[0] === 'session') {
      const auth = await resolveYoutubeActor();
      if ('error' in auth) return auth.error;
      return NextResponse.json({ role: auth.role, permissions: auth.permissions, firstName: auth.displayName });
    }
    if (path[0] === 'quick' && path[1] === 'analyses') {
      const auth = await gate('youtube_research.view');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await listQuickAnalyses());
    }
    if (path[0] === 'quick' && path[1] === 'reports') {
      const auth = await gate('youtube_research.view');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await listQuickReports());
    }
    if (path[0] === 'projects' && path[1] && path[2] === 'overview') {
      const auth = await gate('youtube_research.view');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await projectOverview(path[1]));
    }
    if (path[0] === 'projects' && path[1] && path[2] === 'channels') {
      const auth = await gate('youtube_research.view');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await listProjectChannels(path[1]));
    }
    if (path[0] === 'projects' && path[1] && path[2] === 'videos' && path[3]) {
      const auth = await gate('youtube_research.view');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await getProjectVideo(path[1], path[3]));
    }
    if (path[0] === 'projects' && path[1] && path[2] === 'videos') {
      const auth = await gate('youtube_research.view');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await listProjectVideos(videoQuery(path[1], url)));
    }
    if (path[0] === 'projects' && path[1] && path[2] === 'topics') {
      const auth = await gate('youtube_research.view');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await listProjectTopics(path[1]));
    }
    if (path[0] === 'projects' && path[1] && path[2] === 'compare' && path[3] === 'videos') {
      const auth = await gate('youtube_research.analytics.view');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await compareProjectVideos(path[1], (url.searchParams.get('ids') || '').split(',')));
    }
    if (path[0] === 'projects' && path[1] && path[2] === 'compare' && path[3] === 'channels') {
      const auth = await gate('youtube_research.competitors.view');
      if ('error' in auth && auth.error) return auth.error;
      const query = videoQuery(path[1], url);
      return NextResponse.json(await compareProjectChannels(path[1], (url.searchParams.get('ids') || '').split(','), {
        from: query.from,
        to: query.to,
        topicId: query.topicId,
        tag: query.tag,
        q: query.q,
        categoryId: query.categoryId,
        content: query.content,
        placement: query.placement,
        minViews: query.minViews,
        maxViews: query.maxViews,
        minDuration: query.minDuration,
        maxDuration: query.maxDuration,
      }));
    }
    if (path[0] === 'projects' && path[1] && path[2] === 'insights') {
      const auth = await gate('youtube_research.view');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await projectVideoInsights(videoQuery(path[1], url)));
    }
    if (path[0] === 'projects' && path[1] && path[2] === 'filters') {
      const auth = await gate('youtube_research.view');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await projectFilterOptions(path[1], (url.searchParams.get('channelIds') || '').split(',').filter(Boolean)));
    }
    if (path[0] === 'projects' && path[1] && path[2] === 'analysis') {
      const auth = await gate('youtube_research.analytics.view');
      if ('error' in auth && auth.error) return auth.error;
      const query = videoQuery(path[1], url);
      return NextResponse.json(await projectAnalysis(path[1], url.searchParams.get('lens') || 'why', url.searchParams.get('limit'), query));
    }
    if (path[0] === 'projects' && path[1] && path[2] === 'ai-analyses' && path[3]) {
      const auth = await gate('youtube_research.analytics.view');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await getAiAnalysis(path[1], path[3]));
    }
    if (path[0] === 'projects' && path[1] && path[2] === 'ai-analyses') {
      const auth = await gate('youtube_research.analytics.view');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await listAiAnalyses(path[1]));
    }
    if (path[0] === 'projects' && path[1] && path[2] === 'research-reports' && path[3] && path[4] === 'export') {
      const auth = await gate('youtube_research.reports.export');
      if ('error' in auth && auth.error) return auth.error;
      const file = await exportResearchReport(path[1], path[3]);
      return fileResponse(file.body, file.filename, file.mime);
    }
    if (path[0] === 'projects' && path[1] && path[2] === 'research-reports' && path[3]) {
      const auth = await gate('youtube_research.view');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await getResearchReport(path[1], path[3]));
    }
    if (path[0] === 'projects' && path[1] && path[2] === 'research-reports') {
      const auth = await gate('youtube_research.view');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await listResearchReports(path[1]));
    }
    if (path[0] === 'projects' && path[1]) {
      const auth = await gate('youtube_research.view');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await getProject(path[1]));
    }
    if (path[0] === 'projects') {
      const auth = await gate('youtube_research.view');
      if ('error' in auth && auth.error) return auth.error;
      const bucket = url.searchParams.get('bucket') || '';
      return NextResponse.json(await listProjects({
        q: url.searchParams.get('q') || '',
        status: url.searchParams.get('status') || (bucket ? '' : 'active'),
        bucket,
        page: Number(url.searchParams.get('page') || 1),
        pageSize: Number(url.searchParams.get('pageSize') || 20),
      }));
    }
    if (path[0] === 'channels' && path[1] === 'search') {
      const auth = await gate('youtube_research.channels.manage');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json({
        rows: await searchChannels(url.searchParams.get('q') || '', url.searchParams.get('platform') || 'youtube'),
      });
    }
    if (path[0] === 'channels' && path[1]) {
      const auth = await gate('youtube_research.view');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await getChannel(path[1]));
    }
    if (path[0] === 'channels') {
      const auth = await gate('youtube_research.view');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await listChannels(url.searchParams.get('q') || '', url.searchParams.get('classification') || '', url.searchParams.get('status') || 'active'));
    }
    if (path[0] === 'imports' && path[1]) {
      const auth = await gate('youtube_research.view');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await getImport(path[1]));
    }
    if (path[0] === 'imports') {
      const auth = await gate('youtube_research.view');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await listImports(url.searchParams.get('channelId') || ''));
    }
    if (path[0] === 'videos' && path[1]) {
      const auth = await gate('youtube_research.view');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await getVideo(path[1]));
    }
    if (path[0] === 'videos') {
      const auth = await gate('youtube_research.view');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await listVideos({
        q: url.searchParams.get('q') || '',
        channelId: url.searchParams.get('channelId') || '',
        topicId: url.searchParams.get('topicId') || '',
        from: url.searchParams.get('from') || '',
        to: url.searchParams.get('to') || '',
        sort: url.searchParams.get('sort') || '',
        page: Number(url.searchParams.get('page') || 1),
        pageSize: Number(url.searchParams.get('pageSize') || 20),
      }));
    }
    if (path[0] === 'topics') {
      const auth = await gate('youtube_research.view');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await listTopics(url.searchParams.get('all') === '1'));
    }
    if (path[0] === 'home') {
      const auth = await gate('youtube_research.view');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await researchHome());
    }
    if (path[0] === 'dashboard') {
      const auth = await gate('youtube_research.view');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await dashboard());
    }
    if (path[0] === 'analytics' && path[1] === 'videos') {
      const auth = await gate('youtube_research.analytics.view');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await videoAnalytics({
        channelId: url.searchParams.get('channelId') || '',
        topicId: url.searchParams.get('topicId') || '',
        from: url.searchParams.get('from') || '',
        to: url.searchParams.get('to') || '',
        sort: url.searchParams.get('sort') || '',
        limit: Number(url.searchParams.get('limit') || 25),
      }));
    }
    if (path[0] === 'analytics' && path[1] === 'channels' && path[2] === 'compare') {
      const auth = await gate('youtube_research.competitors.view');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await compareChannels(url.searchParams.get('ids')?.split(',') || [], {
        from: url.searchParams.get('from') || '',
        to: url.searchParams.get('to') || '',
        topicId: url.searchParams.get('topicId') || '',
      }));
    }
    if (path[0] === 'ai-training') {
      const auth = await gate('youtube_research.view');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json({ rows: await listYoutubeTraining() });
    }
    if (path[0] === 'settings') {
      const auth = await gate('youtube_research.view');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await getSettings(auth.permissions.includes('youtube_research.settings.manage')));
    }
    if (path[0] === 'access') {
      const auth = await gate('youtube_research.settings.manage');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await listAccess());
    }
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  return enterPartnerScope(() => handlePost(request, context));
}

async function handlePost(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  try {
    const path = (await context.params).path || [];
    const body = await readBody(request);
    await protectPartnerScope('POST', path, body);
    if (path[0] === 'ai-training' && (request.headers.get('content-type') || '').includes('multipart/form-data')) {
      const auth = await gate('youtube_research.hookooh.knowledge');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await importYoutubeTrainingFile(await request.formData(), auth.user.id));
    }
    if (path[0] === 'projects' && path[1] && path[2] === 'channels' && path[4] === 'primary') {
      const auth = await gate('youtube_research.channels.manage');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await setPrimaryChannel(path[1], path[3], auth.user.id));
    }
    if (path[0] === 'projects' && path[1] && path[2] === 'channels') {
      const auth = await gate('youtube_research.channels.manage');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await addProjectChannel(path[1], String(body.input || ''), body.relationship, auth.user.id));
    }
    if (path[0] === 'projects' && path[1] && path[2] === 'analysis' && path[3] === 'summarize') {
      const auth = await gate('youtube_research.analytics.view');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await summarizeProjectAnalysis(path[1], body));
    }
    if (path[0] === 'projects' && path[1] && path[2] === 'analysis' && path[3] === 'video') {
      const auth = await gate('youtube_research.analytics.view');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await summarizeAnalysisVideo(path[1], String(body.videoId || body.video_id || ''), body.mode, body));
    }
    if (path[0] === 'projects' && path[1] && path[2] === 'ai-analyses' && path[3] && path[4] === 'insights') {
      const auth = await gate('youtube_research.analytics.view');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await generateAiInsights(path[1], path[3], body, auth.user.id));
    }
    if (path[0] === 'ai-training') {
      const auth = await gate('youtube_research.hookooh.knowledge');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await saveYoutubeTraining(body, auth.user.id));
    }
    if (path[0] === 'projects' && path[1] && path[2] === 'ai-analyses') {
      const auth = await gate('youtube_research.analytics.view');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await createAiAnalysis(path[1], body, auth.user.id));
    }
    if (path[0] === 'projects' && path[1] && path[2] === 'research-reports' && path[3] && path[4] === 'archive') {
      const auth = await gate('youtube_research.reports.export');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await archiveResearchReport(path[1], path[3], auth.user.id));
    }
    if (path[0] === 'projects' && path[1] && path[2] === 'research-reports') {
      const auth = await gate('youtube_research.analytics.view');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await createResearchReport(path[1], body, auth.user.id));
    }
    if (path[0] === 'projects' && path[1] && path[2] === 'duplicate') {
      const auth = await gate('youtube_research.channels.manage');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await duplicateProject(path[1], auth.user.id));
    }
    if (path[0] === 'projects' && path[1] && path[2] === 'import') {
      const auth = await gate('youtube_research.videos.import');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await importProject(path[1], body, auth.user.id));
    }
    if (path[0] === 'projects' && path[1] && path[2] === 'videos' && path[3] === 'urls') {
      const auth = await gate('youtube_research.videos.import');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await importProjectVideosFromUrls(path[1], body, auth.user.id));
    }
    if (path[0] === 'projects' && path[1] && path[2] === 'topics') {
      const auth = await gate('youtube_research.research.edit');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await saveProjectTopic(path[1], body, auth.user.id));
    }
    if (path[0] === 'projects') {
      const auth = await gate('youtube_research.channels.manage');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await createProject(body, auth.user.id));
    }
    if (path[0] === 'channels' && path[1] === 'resolve') {
      const auth = await gate('youtube_research.channels.manage');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await resolveChannel(String(body.input || ''), body.platform));
    }
    if (path[0] === 'channels' && path[2] === 'refresh') {
      const auth = await gate('youtube_research.channels.manage');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await refreshChannel(path[1], auth.user.id));
    }
    if (path[0] === 'channels') {
      const auth = await gate('youtube_research.channels.manage');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await saveChannel(String(body.input || ''), body.classification, body.research_notes ?? body.researchNotes, auth.user.id, body.platform));
    }
    if (path[0] === 'imports' && path[1] === 'preview') {
      const auth = await gate('youtube_research.videos.import');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await previewImport(body));
    }
    if (path[0] === 'imports' && path[2] === 'retry') {
      const auth = await gate('youtube_research.videos.import');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await retryImport(path[1], auth.user.id));
    }
    if (path[0] === 'imports') {
      const auth = await gate('youtube_research.videos.import');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await startImport(body, auth.user.id));
    }
    if (path[0] === 'videos' && path[1] === 'refresh') {
      const auth = await gate('youtube_research.videos.refresh');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await refreshVideos(body.ids, auth.user.id));
    }
    if (path[0] === 'topics') {
      const auth = await gate('youtube_research.research.edit');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await saveTopic(body, auth.user.id));
    }
    if (path[0] === 'reports' && path[1] === 'export') {
      const auth = await gate('youtube_research.reports.export');
      if ('error' in auth && auth.error) return auth.error;
      const file = await exportResearch({
        type: String(body.type || 'videos'),
        format: String(body.format || 'xlsx'),
        channelId: String(body.channel_id || body.channelId || ''),
        channelIds: Array.isArray(body.channel_ids) ? body.channel_ids.map(String) : String(body.channelIds || '').split(',').filter(Boolean),
        topicId: String(body.topic_id || body.topicId || ''),
        from: String(body.from || ''),
        to: String(body.to || ''),
        projectId: String(body.project_id || body.projectId || ''),
        tag: String(body.tag || ''),
        q: String(body.q || ''),
        categoryId: String(body.category_id || body.categoryId || ''),
        content: String(body.content || ''),
        placement: String(body.placement || ''),
        videoIds: Array.isArray(body.video_ids) ? body.video_ids.map(String) : String(body.videoIds || '').split(',').filter(Boolean),
        projectName: String(body.project_name || body.projectName || ''),
      });
      return fileResponse(file.body, file.filename, file.mime);
    }
    if (path[0] === 'settings' && path[1] === 'test-connection') {
      const auth = await gate('youtube_research.settings.manage');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await testConnection(auth.user.id));
    }
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (err) {
    return fail(err);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  return enterPartnerScope(() => handlePatch(request, context));
}

async function handlePatch(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  try {
    const path = (await context.params).path || [];
    const body = await readBody(request);
    await protectPartnerScope('PATCH', path, body);
    if (path[0] === 'projects' && path[1] && path[2] === 'ai-actions' && path[3]) {
      const auth = await gate('youtube_research.research.edit');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await updateAiAction(path[1], path[3], body, auth.user.id));
    }
    if (path[0] === 'projects' && path[1] && path[2] === 'videos' && path[4] === 'research') {
      const auth = await gate('youtube_research.research.edit');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await saveProjectResearch(path[1], path[3], body, auth.user.id));
    }
    if (path[0] === 'projects' && path[1] && !path[2]) {
      const auth = await gate('youtube_research.channels.manage');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await updateProject(path[1], body, auth.user.id));
    }
    if (path[0] === 'channels' && path[1]) {
      const auth = await gate('youtube_research.channels.manage');
      if ('error' in auth && auth.error) return auth.error;
      const patch = currentYoutubePartnerId() ? { ...body, status: undefined } : body;
      return NextResponse.json(await updateChannel(path[1], patch, auth.user.id));
    }
    if (path[0] === 'videos' && path[1] && path[2] === 'research') {
      const auth = await gate('youtube_research.research.edit');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await updateResearch(path[1], body, auth.user.id));
    }
    if (path[0] === 'topics' && path[1]) {
      const auth = await gate('youtube_research.research.edit');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await saveTopic(body, auth.user.id, path[1]));
    }
    if (path[0] === 'settings') {
      const auth = await gate('youtube_research.settings.manage');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await updateSettings(body, auth.user.id));
    }
    if (path[0] === 'access') {
      const auth = await gate('youtube_research.settings.manage');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await setAccess(String(body.user_id || body.userId || ''), body.permissions, auth.user.id));
    }
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ path?: string[] }> }) {
  return enterPartnerScope(() => handleDelete(context));
}

async function handleDelete(context: { params: Promise<{ path?: string[] }> }) {
  try {
    const path = (await context.params).path || [];
    await protectPartnerScope('DELETE', path);
    if (path[0] === 'ai-training' && path[1]) {
      const auth = await gate('youtube_research.hookooh.knowledge');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await deleteYoutubeTraining(path[1]));
    }
    if (path[0] === 'projects' && path[1] && path[2] === 'ai-analyses' && path[3]) {
      const auth = await gate('youtube_research.analytics.view');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await deleteAiAnalysis(path[1], path[3], auth.user.id));
    }
    if (path[0] === 'projects' && path[1] && path[2] === 'research-reports' && path[3]) {
      const auth = await gate('youtube_research.reports.export');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await deleteResearchReport(path[1], path[3], auth.user.id));
    }
    if (path[0] === 'projects' && path[1] && path[2] === 'channels' && path[3]) {
      const auth = await gate('youtube_research.channels.manage');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await removeProjectChannel(path[1], path[3], auth.user.id));
    }
    if (path[0] === 'projects' && path[1] && path[2] === 'topics' && path[3]) {
      const auth = await gate('youtube_research.research.edit');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await archiveProjectTopic(path[1], path[3]));
    }
    if (path[0] === 'projects' && path[1]) {
      const auth = await gate('youtube_research.channels.manage');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await archiveProject(path[1], auth.user.id));
    }
    if (path[0] === 'channels' && path[1]) {
      const auth = await gate('youtube_research.channels.manage');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await removeChannel(path[1], auth.user.id));
    }
    if (path[0] === 'topics' && path[1]) {
      const auth = await gate('youtube_research.research.edit');
      if ('error' in auth && auth.error) return auth.error;
      return NextResponse.json(await archiveTopic(path[1], auth.user.id));
    }
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (err) {
    return fail(err);
  }
}
