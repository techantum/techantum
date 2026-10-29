import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { classifyYoutubeError, createYoutube, normalizeYoutubeApiKey, YOUTUBE_CONNECTED_MESSAGE } from './client.ts';
import { presentVideo } from './mask.ts';
import { readFileSync } from 'node:fs';
import { categoryLabel, contentLabel, csvCell, durationSeconds, isPaidPlacement, lengthLabel, parseChannelInput, publishingBuckets, shortsPlaylistId, WATCH_HOURS_NOTE, YOUTUBE_METRIC_NOTICE } from './parse.ts';
import { hasYoutubePermission, permissionsForRole, YOUTUBE_PERMISSIONS } from './permissions.ts';
import { firstNameFrom, greetingForHour, nextStepFor, projectInitials } from './home-display.ts';
import { partnerYoutubeAccess, youtubePortalFrom } from './scope.ts';
import { visibleAdminNav } from '../cms/admin-nav.ts';
import { canAccessAdminPath } from '../admin/roles.ts';
import { pdfFile, wordFile } from './reports.ts';
import { actionsPerThousandViews, ANALYSIS_LENSES, clockDuration, contrastNotes, engagementActions, insightCards, parseAnalysisLens, performanceNote } from './analysis.ts';
import { performanceSummary, VIDEO_UPSERT_SQL } from './service.ts';
import { ANALYTICS_UNAVAILABLE, buildFallbackObservations, buildVideoBriefs, classifyVideos, parseAiResearchConfig } from './ai-research.ts';
import { COMPARISON_UNAVAILABLE, buildGapCards, comparisonTable, thumbnailContent } from './gap-cards.ts';
import { imageMimeFromBytes, parseThumbnailReading } from './thumbnail-read.ts';
import { captionLanguageNames, clipSpokenText, enrichSpokenContent, formatSpokenCaptions, parseTimedText, selectCaptionTracks } from './video-content.ts';
import { FinanceValidationError } from '../finance/errors.ts';

const CHANNEL_ID = 'UC1234567890123456789012';

describe('channel input', () => {
  it('accepts a channel id, handle, and channel URL', () => {
    assert.deepEqual(parseChannelInput(CHANNEL_ID), { ok: true, kind: 'id', value: CHANNEL_ID });
    assert.deepEqual(parseChannelInput('@techantum'), { ok: true, kind: 'handle', value: 'techantum' });
    assert.deepEqual(parseChannelInput(`https://www.youtube.com/channel/${CHANNEL_ID}`), { ok: true, kind: 'id', value: CHANNEL_ID });
    assert.deepEqual(parseChannelInput('https://www.youtube.com/@techantum/videos'), { ok: true, kind: 'handle', value: 'techantum' });
    assert.deepEqual(parseChannelInput('https://www.youtube.com/@abhilashlaparoscopycentre'), { ok: true, kind: 'handle', value: 'abhilashlaparoscopycentre' });
    assert.deepEqual(parseChannelInput('https://www.youtube.com/user/LegacyName'), { ok: true, kind: 'username', value: 'LegacyName' });
  });

  it('rejects video links and custom links that cannot be resolved', () => {
    assert.equal(parseChannelInput('https://youtu.be/abcdefghijk').ok, false);
    assert.equal(parseChannelInput('https://www.youtube.com/c/SomeName').ok, false);
    assert.equal(parseChannelInput('').ok, false);
    assert.equal(parseChannelInput('https://example.com/@techantum').ok, false);
  });
});

describe('YouTube client', () => {
  it('resolves a channel only through the official API host', async () => {
    const fetchImpl = async (url: string) => {
      const parsed = new URL(url);
      assert.equal(parsed.hostname, 'www.googleapis.com');
      assert.equal(parsed.pathname, '/youtube/v3/channels');
      assert.equal(parsed.searchParams.get('key'), 'test-key');
      assert.equal(parsed.searchParams.get('forHandle'), '@techantum');
      assert.equal(parsed.searchParams.get('mine'), null);
      assert.match(parsed.searchParams.get('part') || '', /snippet,statistics,contentDetails/);
      return new Response(JSON.stringify({
        items: [{
          id: CHANNEL_ID,
          snippet: { title: 'Techantum', customUrl: '@techantum', description: 'About', thumbnails: { default: { url: 'https://i.ytimg.com/example.jpg' } } },
          statistics: { subscriberCount: '4' },
          contentDetails: { relatedPlaylists: { uploads: 'UU1234567890123456789012' } },
        }],
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    };
    const channel = await createYoutube('test-key', fetchImpl).resolve('@techantum');
    assert.equal(channel.youtubeChannelId, CHANNEL_ID);
    assert.equal(channel.channelName, 'Techantum');
    assert.equal(channel.subscriberCount, 4);
    assert.equal(channel.viewCount, null);
  });

  it('classifies quota, invalid key, and missing statistics without turning gaps into zero', () => {
    const quota = classifyYoutubeError(403, { error: { errors: [{ reason: 'quotaExceeded' }] } });
    assert.equal(quota.code, 'quota');
    assert.equal(quota.googleStatus, 403);
    const invalid = classifyYoutubeError(400, { error: { message: 'API key not valid. Please pass a valid API key.', errors: [{ reason: 'badRequest' }], details: [{ reason: 'API_KEY_INVALID' }] } });
    assert.equal(invalid.code, 'invalid_key');
    assert.equal(invalid.googleReason, 'API_KEY_INVALID');
    const hidden = presentVideo({
      youtube_video_id: 'abcdefghijk',
      fetched_at: new Date().toISOString(),
      view_count: '12',
      like_count: null,
      comment_count: null,
      thumbnail_caption: 'Manual caption',
      research_notes: 'Keep this',
      channel_refreshed_at: new Date().toISOString(),
    });
    assert.equal(hidden.view_count, 12);
    assert.equal(hidden.like_count, null);
    assert.equal(hidden.thumbnail_caption, 'Manual caption');
  });
});

describe('connection diagnostics', () => {
  const ipBody = {
    error: {
      code: 403,
      message: 'The provided API key has an IP address restriction. The originating IP address of the call (106.222.229.71) violates this restriction.',
      errors: [{ reason: 'forbidden', message: 'The provided API key has an IP address restriction.' }],
      details: [{ reason: 'API_KEY_IP_ADDRESS_BLOCKED', metadata: { callerIp: '106.222.229.71' } }],
    },
  };

  it('keeps an IP restriction separate from an invalid key', () => {
    const error = classifyYoutubeError(403, ipBody);
    assert.equal(error.code, 'ip_restricted');
    assert.equal(error.googleStatus, 403);
    assert.equal(error.googleReason, 'API_KEY_IP_ADDRESS_BLOCKED');
    assert.match(error.message, /106\.222\.229\.71/);
    assert.doesNotMatch(error.message, /API key was rejected/);
  });

  it('separates referrer, app, disabled API, quota, and a leaked key string', () => {
    assert.equal(classifyYoutubeError(403, { error: { message: 'Requests from referer <empty> are blocked.', details: [{ reason: 'API_KEY_HTTP_REFERRER_BLOCKED' }] } }).code, 'referrer_restricted');
    assert.equal(classifyYoutubeError(403, { error: { details: [{ reason: 'API_KEY_ANDROID_APP_BLOCKED' }] } }).code, 'app_restricted');
    const disabled = classifyYoutubeError(403, { error: { message: 'YouTube Data API v3 has not been used in project 1 before or it is disabled.', errors: [{ reason: 'accessNotConfigured' }] } });
    assert.equal(disabled.code, 'disabled');
    assert.match(disabled.message, /Enable it in Google Cloud/);
    const leaked = classifyYoutubeError(400, { error: { message: 'API key not valid. Please pass a valid API key. AIzaSyExampleKeyShouldNotLeak' } });
    assert.equal(leaked.code, 'invalid_key');
    assert.doesNotMatch(leaked.message, /AIza/);
    assert.equal(normalizeYoutubeApiKey('  "AIza example"  '), 'AIzaexample');
    assert.equal(YOUTUBE_CONNECTED_MESSAGE, 'YouTube Data API connected successfully.');
  });

  it('marks the connection successful only when the public test channel is returned', async () => {
    const fetchImpl = async (url: string) => {
      const parsed = new URL(url);
      assert.equal(parsed.hostname, 'www.googleapis.com');
      assert.equal(parsed.pathname, '/youtube/v3/channels');
      assert.equal(parsed.searchParams.get('part'), 'snippet');
      assert.equal(parsed.searchParams.get('id'), 'UC_x5XG1OV2P6uZZ5FSM9Ttw');
      assert.equal(parsed.searchParams.get('mine'), null);
      assert.equal(parsed.searchParams.get('key'), 'server-key');
      return new Response(JSON.stringify({ items: [{ id: 'UC_x5XG1OV2P6uZZ5FSM9Ttw', snippet: { title: 'Google for Developers' } }] }), { status: 200 });
    };
    const result = await createYoutube('server-key', fetchImpl).test();
    assert.equal(result.ok, true);
    assert.equal(result.channelId, 'UC_x5XG1OV2P6uZZ5FSM9Ttw');
  });

  it('does not report success when YouTube returns no channel', async () => {
    const fetchImpl = async () => new Response(JSON.stringify({ items: [] }), { status: 200 });
    await assert.rejects(() => createYoutube('server-key', fetchImpl).test(), (err: unknown) => err instanceof Error && /not marked successful/.test(err.message));
  });

  it('returns the IP restriction from a live-shaped Google response and a network failure separately', async () => {
    const blocked = async () => new Response(JSON.stringify(ipBody), { status: 403, headers: { 'content-type': 'application/json' } });
    await assert.rejects(() => createYoutube('server-key', blocked).test(), (err: unknown) => {
      assert.equal((err as { code?: string }).code, 'ip_restricted');
      return true;
    });
    const offline = async () => { throw new TypeError('fetch failed'); };
    await assert.rejects(() => createYoutube('server-key', offline).test(), (err: unknown) => (err as { code?: string }).code === 'network');
    const timedOut = async () => {
      const error = new Error('timed out');
      error.name = 'TimeoutError';
      throw error;
    };
    await assert.rejects(() => createYoutube('server-key', timedOut).test(), (err: unknown) => (err as { code?: string }).code === 'timeout');
  });

  it('looks up a channel id with id and leaves an unknown channel as not found', async () => {
    const fetchImpl = async (url: string) => {
      const parsed = new URL(url);
      assert.equal(parsed.searchParams.get('id'), CHANNEL_ID);
      assert.equal(parsed.searchParams.get('forHandle'), null);
      return new Response(JSON.stringify({ items: [] }), { status: 200 });
    };
    await assert.rejects(() => createYoutube('server-key', fetchImpl).resolve(CHANNEL_ID), (err: unknown) => (err as { code?: string }).code === 'not_found');
  });
});

describe('retention and research separation', () => {
  it('hides YouTube fields after 30 days and keeps manual research', () => {
    const old = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    const row = presentVideo({
      youtube_video_id: 'abcdefghijk',
      title: 'Old title',
      view_count: 99,
      fetched_at: old,
      channel_refreshed_at: old,
      channel_name: 'Old channel',
      thumbnail_caption: 'Caption stays',
      research_notes: 'Notes stay',
      topic_name: 'Hiring',
    });
    assert.equal(row.stale, true);
    assert.equal(row.title, null);
    assert.equal(row.view_count, null);
    assert.equal(row.channel_name, null);
    assert.equal(row.thumbnail_caption, 'Caption stays');
    assert.equal(row.research_notes, 'Notes stay');
    assert.equal(row.topic_name, 'Hiring');
    assert.match(String(row.watch_url), /abcdefghijk/);
  });

  it('does not write manual research from the video upsert', () => {
    assert.match(VIDEO_UPSERT_SQL, /tags/);
    assert.doesNotMatch(VIDEO_UPSERT_SQL, /thumbnail_caption|research_notes|topic_id/);
    assert.equal(durationSeconds('PT1H2M3S'), 3723);
    assert.equal(contentLabel(45), 'Short');
    assert.equal(contentLabel(180), 'Short');
    assert.equal(contentLabel(181), 'Video');
    assert.equal(contentLabel(240, 'Clinic tour #Shorts'), 'Short');
    assert.equal(isPaidPlacement({ hasPaidProductPlacement: true }), true);
    assert.equal(isPaidPlacement({ tags: ['#ad'] }), true);
    assert.equal(isPaidPlacement({ title: 'Normal vlog' }), false);
    assert.equal(shortsPlaylistId(CHANNEL_ID), `UUSH${CHANNEL_ID.slice(2)}`);
    assert.equal(categoryLabel('27'), 'Education');
    assert.equal(categoryLabel(''), null);
    assert.match(VIDEO_UPSERT_SQL, /has_paid_product_placement/);
  });

  it('adds projects without deleting existing research', () => {
    const sql = readFileSync(new URL('../../../supabase/migrations/20261022133000_youtube_research_projects.sql', import.meta.url), 'utf8');
    assert.match(sql, /youtube_project_one_own/);
    assert.match(sql, /youtube_project_video_research/);
    assert.doesNotMatch(sql, /DELETE FROM public\.youtube_video_research|DROP TABLE public\.youtube_channels/);
  });
});

describe('analytics policy', () => {
  it('counts library records and does not calculate engagement rate', () => {
    const summary = performanceSummary([{ view_count: 10 }, { view_count: null }]);
    assert.equal(summary.videosAnalyzed, 2);
    assert.equal(summary.videosWithViewCounts, 1);
    assert.equal(summary.officialAnalytics, false);
    assert.equal('engagementRate' in summary, false);
    assert.match(YOUTUBE_METRIC_NOTICE, /not YouTube Analytics/i);
    assert.match(WATCH_HOURS_NOTE, /Watch hours are not returned/);
    assert.deepEqual(publishingBuckets(['2026-01-02', '2026-01-20', null]), [{ month: '2026-01', count: 2 }]);
    const projects = readFileSync(new URL('./projects.ts', import.meta.url), 'utf8');
    assert.match(projects, /historicalGrowth: false/);
    assert.doesNotMatch(projects, /engagementRate|subscriberGrowth/);
  });

  it('ranks likes plus comments without naming it engagement rate', () => {
    assert.equal(engagementActions(10, 2), 12);
    assert.equal(engagementActions(null, null), null);
    assert.equal(actionsPerThousandViews(20, 1000), 20);
    assert.equal(actionsPerThousandViews(5, 0), null);
    assert.equal(parseAnalysisLens('why'), 'why');
    assert.equal(ANALYSIS_LENSES.some((lens) => lens.id === 'likes'), true);
    const notes = contrastNotes(
      [{ stale: false, content_label: 'Short', placement_label: 'Organic', title: 'Clinic tour #shorts', tags: ['clinic'], view_count: 9000 } as never],
      [{ stale: false, content_label: 'Video', placement_label: 'Paid', title: 'Long hospital film about facilities and parking', tags: [], view_count: 80 } as never],
    );
    assert.match(notes.join(' '), /Shorts are 100%/);
    assert.equal(clockDuration(125), '2:05');
    assert.match(performanceNote({ title: 'What is hernia?', tags: [], content_label: 'Video', comment_count: 0, like_count: 1 } as never, 'low'), /hook|interaction|tags/i);
    const cards = insightCards(
      [{ stale: false, content_label: 'Short', title: 'Tips', tags: ['a', 'b', 'c'], view_count: 9000, like_count: 100, weekday: 'Tue', topic_name: 'Recovery' } as never],
      [{ stale: false, content_label: 'Video', title: 'Long film', tags: [], view_count: 80, like_count: 1, weekday: 'Sun', topic_name: 'Parking' } as never],
    );
    assert.equal(cards.length, 4);
    assert.match(cards[0].body, /× more views/);
    assert.doesNotMatch(readFileSync(new URL('./analysis.ts', import.meta.url), 'utf8'), /engagementRate/);
  });
});

describe('permissions and exports', () => {
  it('gives every key to Super Admin and none to an ungranted admin', () => {
    assert.equal(hasYoutubePermission('SUPER_ADMIN', [], 'youtube_research.settings.manage'), true);
    assert.equal(hasYoutubePermission('ADMIN', [], 'youtube_research.view'), false);
    assert.equal(hasYoutubePermission('ADMIN', ['youtube_research.view'], 'youtube_research.reports.export'), false);
    assert.equal(hasYoutubePermission('ADMIN', ['youtube_research.settings.manage'], 'youtube_research.settings.manage'), false);
    assert.equal(hasYoutubePermission('partner_admin', YOUTUBE_PERMISSIONS, 'youtube_research.settings.manage'), false);
    assert.equal(hasYoutubePermission('partner_user', [], 'youtube_research.view'), true);
    assert.equal(permissionsForRole('partner_admin', []).includes('youtube_research.settings.manage'), false);
    assert.equal(YOUTUBE_PERMISSIONS.length, 9);
    assert.equal(partnerYoutubeAccess('GET', ['home']), 'allow');
    assert.equal(partnerYoutubeAccess('GET', ['projects']), 'allow');
    assert.equal(partnerYoutubeAccess('GET', ['projects', 'project-1', 'videos']), 'project');
    assert.equal(partnerYoutubeAccess('POST', ['channels', 'resolve']), 'allow');
    assert.equal(partnerYoutubeAccess('GET', ['channels']), 'deny');
    assert.equal(partnerYoutubeAccess('GET', ['channels', 'channel-1']), 'channel');
    assert.equal(partnerYoutubeAccess('PATCH', ['channels', 'channel-1']), 'channel');
    assert.equal(partnerYoutubeAccess('POST', ['channels', 'channel-1', 'refresh']), 'channel');
    assert.equal(partnerYoutubeAccess('DELETE', ['channels', 'channel-1']), 'deny');
    assert.equal(partnerYoutubeAccess('POST', ['videos', 'refresh']), 'videos');
    assert.equal(partnerYoutubeAccess('POST', ['settings', 'test-connection']), 'deny');
    assert.equal(partnerYoutubeAccess('GET', ['access']), 'deny');
    assert.equal(youtubePortalFrom('partner', 'https://techantum.com/admin/youtube-research'), 'partner');
    assert.equal(youtubePortalFrom(null, 'https://techantum.com/partner/youtube-research/videos'), 'partner');
    assert.equal(youtubePortalFrom(null, 'https://techantum.com/admin/youtube-research'), 'admin');
    assert.equal(youtubePortalFrom(null, ''), '');
    assert.equal(firstNameFrom('Sridhar Kumar', 'x@y.com'), 'Sridhar');
    assert.equal(projectInitials('Existing research'), 'ER');
    assert.equal(nextStepFor({ id: 'p1' }).key, 'own');
    assert.equal(nextStepFor({ status: 'archived', own_youtube_channel_id: 'UC1' }).label, 'Archived');
    assert.equal(nextStepFor({ id: 'p1', own_youtube_channel_id: 'UC1', competitor_count: 1, video_count: 3 }).key, 'analysis');
    const morning = new Date('2026-10-25T08:00:00');
    assert.equal(greetingForHour(morning), 'Good morning');
  });

  it('hides YouTube Research settings from partner and admin sessions', () => {
    const hrefs = (role: string) => {
      const found: string[] = [];
      const walk = (items: ReturnType<typeof visibleAdminNav>) => {
        for (const item of items) {
          if (item.href) found.push(item.href);
          if (item.children) walk(item.children);
        }
      };
      walk(visibleAdminNav(role));
      return found;
    };
    const sales = visibleAdminNav('SUPER_ADMIN').find((item) => item.label === 'Sales & Marketing');
    const seoNav = sales?.children?.find((item) => item.id === 'seo');
    assert.equal(seoNav?.children?.some((item) => item.href === '/admin/seo-ads'), true);
    assert.equal(sales?.children?.some((item) => item.id === 'youtube-research'), true);
    assert.equal(visibleAdminNav('SUPER_ADMIN').some((item) => item.id === 'youtube-research'), false);
    assert.equal(hrefs('SUPER_ADMIN').includes('/admin/youtube-research/settings'), true);
    assert.equal(hrefs('ADMIN').includes('/admin/youtube-research/settings'), false);
    assert.equal(canAccessAdminPath('SUPER_ADMIN', '/admin/youtube-research/settings'), true);
    assert.equal(canAccessAdminPath('ADMIN', '/admin/youtube-research/settings'), false);
    assert.equal(canAccessAdminPath('ADMIN', '/admin/youtube-research'), true);
  });

  it('escapes spreadsheet formulas and quotes', () => {
    assert.equal(csvCell('=cmd'), "'=cmd");
    assert.equal(csvCell('safe'), 'safe');
    assert.equal(csvCell('say "hi"'), '"say ""hi"""');
    assert.equal(csvCell(null), '');
  });

  it('writes a table-style PDF', async () => {
    const body = await pdfFile('videos', [{
      project: 'Existing research',
      title: 'Open Surgery Laparoscopy',
      channel: 'Demo Channel',
      relationship: 'own',
      published: '2026-10-01',
      duration: '10:12',
      views: 1200,
      likes: 40,
      comments: 8,
      topic: 'Hiring',
      tags: 'hernia, surgery',
    }]);
    assert.equal(body.subarray(0, 4).toString(), '%PDF');
    assert.ok(body.length > 800);
  });

  it('writes a Word table that ignores non-ASCII characters', async () => {
    const body = await wordFile('comparison', [{
      project: 'Existing research',
      title: 'Open Surgery',
      channel: 'Demo Channel',
      relationship: 'own',
      content: 'Video',
      placement: 'Organic',
      published: '2026-10-01',
      views: 1200,
      likes: 40,
      comments: 8,
      topic: 'Hiring',
    }]);
    assert.equal(body.subarray(0, 2).toString(), 'PK');
  });
});

describe('AI research configuration', () => {
  it('requires a goal and keeps desired audience as a user target', async () => {
    assert.throws(() => parseAiResearchConfig({}), (err: unknown) => err instanceof FinanceValidationError);
    const config = parseAiResearchConfig({
      goals: ['views', 'retention', 'views'],
      source: 'own',
      targetAge: '25–44',
      targetGeography: 'Telangana, India',
      outputs: ['improve_existing'],
    });
    assert.deepEqual(config.goals, ['views', 'retention']);
    assert.equal(config.targetAge, '25–44');
    assert.equal(config.targetGeography, 'Telangana, India');
    assert.equal(config.source, 'own');
    const wizard = parseAiResearchConfig({
      goals: ['views'],
      source: 'selected',
      videoIds: ['a'],
      contentFocus: ['titles', 'thumbnails'],
      targetAges: ['25–34', '35–44'],
      geographies: ['India', 'Telangana'],
      languages: ['English', 'Telugu'],
    });
    assert.deepEqual(wizard.contentFocus, ['titles', 'thumbnails']);
    assert.deepEqual(wizard.targetAges, ['25–34', '35–44']);
    assert.equal(wizard.targetGeography, 'India, Telangana');
  });

  it('classifies public counts without inventing retention and labels missing analytics', async () => {
    const videos = [
      { id: 'a', youtube_video_id: 'aaaaaaaaaaa', title: 'How hernia repair actually works', channel_name: 'Own', relationship: 'own', content_label: 'Video', placement_label: 'Organic', topic_name: 'Surgery', published_at: '2026-01-01', duration_label: '08:12', tags: ['hernia'], view_count: 4000, like_count: 80, comment_count: 12, watch_url: null, thumbnail_url: null, description: 'Walkthrough' },
      { id: 'b', youtube_video_id: 'bbbbbbbbbbb', title: 'Clinic update', channel_name: 'Own', relationship: 'own', content_label: 'Video', placement_label: 'Organic', topic_name: null, published_at: '2026-02-01', duration_label: '03:10', tags: [], view_count: 120, like_count: 0, comment_count: 0, watch_url: null, thumbnail_url: null, description: null },
    ];
    const groups = classifyVideos(videos);
    assert.equal(groups.highViews[0].id, 'a');
    assert.equal(groups.quiet[0].id, 'b');
    const observations = buildFallbackObservations(videos, parseAiResearchConfig({ goals: ['views', 'retention'] }));
    assert.ok(observations.some((item) => item.category === 'Audience Retention' && item.observation === ANALYTICS_UNAVAILABLE));
    assert.ok(observations.every((item) => !/will increase views/i.test(`${item.headline} ${item.observation}`)));
    const pair = buildGapCards([
      { id: 'own', title: 'Clinic update', relationship: 'own', channel_name: 'Own', view_count: 120, like_count: 2, comment_count: 0, description: 'Short', thumbnail_caption: null },
      { id: 'comp', title: 'How hernia repair actually works', relationship: 'competitor', channel_name: 'Rival', view_count: 4000, like_count: 80, comment_count: 12, description: 'A longer public description that states the outcome and the next step for the viewer.', thumbnail_caption: 'Hernia repair' },
    ]);
    assert.equal(pair?.left.roleLabel, 'Own video');
    assert.equal(pair?.right.roleLabel, 'Competitor video');
    assert.match(pair?.left.segments.find((item) => item.id === 'views')?.negative || '', /lower than the other video/);
    assert.match(pair?.right.segments.find((item) => item.id === 'views')?.positive || '', /higher than the other video/);
    assert.equal(pair?.left.segments.find((item) => item.id === 'watch_hours')?.value, 'Not shared');
    assert.match(pair?.left.segments.find((item) => item.id === 'ages')?.negative || '', /does not share the ages/);
    assert.match(pair?.left.segments.find((item) => item.id === 'genders')?.negative || '', /does not share the genders/);
    assert.match(pair?.left.segments.find((item) => item.id === 'geography')?.negative || '', /does not share where/);
    assert.ok(pair?.left.alternatives.titles.length);
    assert.ok(pair?.right.actions.length);
    assert.doesNotMatch(JSON.stringify(pair), /18–24|male viewers|watch hours are \d/i);
    const table = comparisonTable([
      { id: 'own', title: 'Clinic update', relationship: 'own', view_count: 120, duration_seconds: 125, thumbnail_text: 'Clinic hours', thumbnail_scene: 'A clinic doorway' },
      { id: 'comp', title: 'How hernia repair works', relationship: 'competitor', view_count: 4000, duration: 'PT8M12S' },
    ]);
    assert.equal(table.videos.length, 2);
    assert.equal(lengthLabel({ duration_seconds: 125 }), '2:05');
    assert.equal(lengthLabel({ duration: 'PT1H2M3S' }), '1:02:03');
    assert.equal(table.rows.find((row) => row.label === 'Length')?.values[0], '2:05');
    assert.equal(table.rows.find((row) => row.label === 'Length')?.values[1], '8:12');
    assert.match(table.rows.find((row) => row.label === 'Text on thumbnail')?.values[0] || '', /Clinic hours/);
    assert.match(table.rows.find((row) => row.label === 'Image on thumbnail')?.values[0] || '', /clinic doorway/);
    assert.equal(thumbnailContent({ thumbnail_caption: 'Saved line' }), 'Saved line');
    assert.equal(parseThumbnailReading('{"text":"Hello","scene":"A doctor in a clinic"}').text, 'Hello');
    const multilingual = parseThumbnailReading(JSON.stringify({
      languages: [
        { name: 'English', text: 'Clinic hours' },
        { name: 'Hindi', text: 'क्लिनिक' },
        { name: 'Telugu', text: 'క్లినిక్ సమయాలు' },
      ],
      scene: 'A clinic doorway',
    }));
    assert.match(multilingual.text, /Clinic hours/);
    assert.match(multilingual.text, /क्लिनिक/);
    assert.match(multilingual.text, /క్లినిక్ సమయాలు/);
    assert.equal(parseThumbnailReading('{"text":"watch hours are 12","scene":"demographic chart"}').text, '');
    assert.equal(imageMimeFromBytes(Buffer.from([0xff, 0xd8, 0xff, 0x00])), 'image/jpeg');
    assert.equal(imageMimeFromBytes(Buffer.from([0x00, 0x01]), 'image/jpg'), 'image/jpeg');
    assert.equal(parseTimedText('<transcript><text>Hello</text><text>clinic hours</text></transcript>'), 'Hello clinic hours');
    assert.match(parseTimedText('<transcript><text>&#3077; &#3128;&#3120;&#3149;&#3093;&#3120;&#3136;</text></transcript>'), /అ/);
    assert.equal(parseTimedText('{"events":[{"segs":[{"utf8":"How "},{"utf8":"hernia repair works"}]}]}'), 'How hernia repair works');
    assert.equal(clipSpokenText('a'.repeat(20), 10).length, 10);
    const picked = selectCaptionTracks([
      { languageCode: 'en', kind: 'asr', baseUrl: 'https://www.youtube.com/api/timedtext?lang=en-asr' },
      { languageCode: 'en-US', baseUrl: 'https://www.youtube.com/api/timedtext?lang=en' },
      { languageCode: 'te', baseUrl: 'https://www.youtube.com/api/timedtext?lang=te' },
      { languageCode: 'hi', kind: 'asr', baseUrl: 'https://www.youtube.com/api/timedtext?lang=hi' },
      { languageCode: 'fr', baseUrl: 'https://www.youtube.com/api/timedtext?lang=fr' },
      { languageCode: 'te', baseUrl: 'https://evil.example/timedtext' },
    ]);
    assert.deepEqual(picked.map((track) => track.name), ['Telugu', 'Hindi', 'English']);
    assert.match(picked.find((track) => track.name === 'English')?.url || '', /lang=en$/);
    assert.equal(formatSpokenCaptions([
      { name: 'Telugu', text: 'ఏ సర్జరీ బెటర్' },
      { name: 'Hindi', text: '' },
      { name: 'English', text: 'Which surgery is better' },
    ]), 'Telugu: ఏ సర్జరీ బెటర్\n\nEnglish: Which surgery is better');
    const withCaptions = await enrichSpokenContent(
      [{ youtube_video_id: 'abcdefghijk', description: 'Published blurb', spoken_text: 'Old English only', spoken_source: 'captions' }],
      async (url: string) => {
        if (String(url).includes('youtubei/v1/player')) {
          return new Response(JSON.stringify({
            captions: { playerCaptionsTracklistRenderer: { captionTracks: [{ languageCode: 'en', baseUrl: 'https://www.youtube.com/api/timedtext?v=abcdefghijk' }] } },
          }), { status: 200 });
        }
        return new Response('<transcript><text>Spoken from captions</text></transcript>', { status: 200 });
      },
    );
    assert.equal(withCaptions[0].spoken_source, 'captions');
    assert.match(withCaptions[0].spoken_text || '', /English: Spoken from captions/);
    const multilingualCaptions = await enrichSpokenContent(
      [{ youtube_video_id: 'bbcdefghijk', description: 'Published blurb' }],
      async (url: string) => {
        const target = String(url);
        if (target.includes('youtubei/v1/player')) {
          return new Response(JSON.stringify({
            captions: {
              playerCaptionsTracklistRenderer: {
                captionTracks: [
                  { languageCode: 'te', baseUrl: 'https://www.youtube.com/api/timedtext?v=bbcdefghijk&lang=te' },
                  { languageCode: 'hi', baseUrl: 'https://www.youtube.com/api/timedtext?v=bbcdefghijk&lang=hi' },
                  { languageCode: 'en', baseUrl: 'https://www.youtube.com/api/timedtext?v=bbcdefghijk&lang=en' },
                  { languageCode: 'fr', baseUrl: 'https://www.youtube.com/api/timedtext?v=bbcdefghijk&lang=fr' },
                ],
              },
            },
          }), { status: 200 });
        }
        if (target.includes('lang=te')) return new Response('{"events":[{"segs":[{"utf8":"ఏ సర్జరీ బెటర్"}]}]}', { status: 200 });
        if (target.includes('lang=hi')) return new Response('<transcript><text>कौन सी सर्जरी बेहतर है</text></transcript>', { status: 200 });
        if (target.includes('lang=en')) return new Response('<transcript><text>Which surgery is better</text></transcript>', { status: 200 });
        return new Response('<transcript><text>French only</text></transcript>', { status: 200 });
      },
    );
    assert.equal(multilingualCaptions[0].spoken_source, 'captions');
    assert.match(multilingualCaptions[0].spoken_text || '', /Telugu: ఏ సర్జరీ బెటర్/);
    assert.match(multilingualCaptions[0].spoken_text || '', /Hindi: कौन सी सर्जरी बेहतर है/);
    assert.match(multilingualCaptions[0].spoken_text || '', /English: Which surgery is better/);
    assert.doesNotMatch(multilingualCaptions[0].spoken_text || '', /French/);
    assert.deepEqual(captionLanguageNames(multilingualCaptions[0].spoken_text), ['Telugu', 'Hindi', 'English']);
    const described = await enrichSpokenContent(
      [{ youtube_video_id: 'cbcdefghijk', description: 'Published blurb only' }],
      async () => new Response(JSON.stringify({ captions: {} }), { status: 200 }),
    );
    assert.equal(described[0].spoken_source, 'description');
    assert.match(described[0].spoken_text || '', /Published blurb only/);
    const briefs = buildVideoBriefs([{
      id: 'own',
      youtube_video_id: 'abcdefghijk',
      title: 'Clinic update',
      channel_name: 'Own',
      relationship: 'own',
      content_label: 'Video',
      placement_label: 'Organic',
      topic_name: null,
      published_at: null,
      duration_label: '2:05',
      duration_seconds: 125,
      duration: null,
      thumbnail_text: 'Clinic hours',
      thumbnail_scene: 'A clinic doorway',
      tags: [],
      view_count: 120,
      like_count: 2,
      comment_count: 0,
      watch_url: null,
      thumbnail_url: 'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg',
      thumbnail_caption: null,
      description: 'Come in this week.',
      spoken_text: 'Telugu: ఏ సర్జరీ బెటర్\n\nHindi: कौन सी सर्जरी\n\nEnglish: Which surgery is better',
      spoken_source: 'captions',
    }]);
    assert.match(briefs[0].thumbnail_summary, /Clinic hours/);
    assert.match(briefs[0].thumbnail_summary, /clinic doorway/i);
    assert.equal(briefs[0].content_source, 'captions');
    assert.match(briefs[0].content_summary, /Telugu: ఏ సర్జరీ బెటర్/);
    assert.match(briefs[0].content_summary, /Hindi: कौन सी सर्जरी/);
    assert.match(briefs[0].content_summary, /English: Which surgery is better/);
    const captionGap = buildGapCards([
      { id: 'own', title: 'Own', relationship: 'own', spoken_source: 'captions', spoken_text: 'Telugu: ఏ సర్జరీ బెటర్\n\nHindi: कौन सी सर्जरी\n\nEnglish: Which surgery is better' },
      { id: 'comp', title: 'Other', relationship: 'competitor', spoken_source: 'description', description: 'A public description' },
    ]);
    assert.equal(captionGap?.left.spokenSource, 'captions');
    assert.deepEqual(captionGap?.left.captionLanguages, ['Telugu', 'Hindi', 'English']);
    assert.equal(captionGap?.right.spokenSource, 'description');
    assert.equal(table.rows.find((row) => row.label === 'Watch hours')?.values[0], COMPARISON_UNAVAILABLE);
    assert.equal(table.rows.find((row) => row.label === 'Geography')?.values[1], COMPARISON_UNAVAILABLE);
    assert.equal(table.rows.find((row) => row.label === 'Ages watched')?.values[0], COMPARISON_UNAVAILABLE);
    assert.equal(table.rows.find((row) => row.label === 'Genders watched')?.values[0], COMPARISON_UNAVAILABLE);
  });
});
