import { generateAIChat } from '../ai/gateway';
import { parseModelJson } from '../ai/json';
import { q } from '../finance/db';
import { FinanceNotFoundError, FinanceValidationError } from '../finance/errors';
import { presentVideo } from './mask';
import { categoryLabel, contentLabel, isPaidPlacement, SHORT_MAX_SECONDS, YOUTUBE_METRIC_NOTICE } from './parse';

const FROM = `FROM youtube_videos v
  JOIN youtube_channels c ON c.id = v.channel_id
  JOIN youtube_project_channels pc ON pc.channel_id = c.id AND pc.project_id = $1
  LEFT JOIN youtube_project_video_research r ON r.video_id = v.id AND r.project_id = pc.project_id
  LEFT JOIN youtube_research_topics t ON t.id = r.topic_id AND t.project_id = pc.project_id`;

const SELECT = `SELECT v.*, c.channel_name, c.youtube_channel_id, c.last_refreshed_at AS channel_refreshed_at,
  pc.relationship, r.topic_id, r.thumbnail_caption, r.research_notes, t.name AS topic_name
  ${FROM}`;

const FRESH = `v.fetched_at > NOW() - INTERVAL '30 days'`;
const ACTIONS = `(COALESCE(v.like_count, 0) + COALESCE(v.comment_count, 0))`;
const PER_1K = `CASE WHEN COALESCE(v.view_count, 0) > 0 THEN (${ACTIONS}::numeric / v.view_count) * 1000 ELSE NULL END`;
const SHORT_MATCH = `(
  (v.duration_seconds IS NOT NULL AND v.duration_seconds <= ${SHORT_MAX_SECONDS})
  OR COALESCE(v.title, '') ILIKE '%#shorts%'
  OR EXISTS (SELECT 1 FROM unnest(COALESCE(v.tags, ARRAY[]::text[])) tag WHERE lower(btrim(tag)) IN ('shorts', '#shorts'))
)`;

export const ANALYSIS_NOTICE =
  `${YOUTUBE_METRIC_NOTICE} Analysis rankings use those public view, like, and comment counts. Likes + comments are derived here; they are not YouTube Analytics.`;

export const ANALYSIS_LENSES = [
  { id: 'views', label: 'Highest views', hint: 'Videos with the most public views in this project.' },
  { id: 'likes', label: 'Highest liked videos', hint: 'Videos with the most public likes.' },
  { id: 'engagement', label: 'Highest engagement', hint: 'Ranked by likes + comments, then likes+comments per 1,000 views.' },
  { id: 'quiet', label: 'No / low engagement', hint: 'Videos that have views but few or no likes and comments.' },
  { id: 'why', label: 'Why more engagement', hint: 'Contrast high- and low-engagement videos and summarise with AI.' },
] as const;

export type AnalysisLens = (typeof ANALYSIS_LENSES)[number]['id'];

export type AnalysisFilter = {
  q?: string;
  channelIds?: string[];
  topicId?: string;
  content?: string;
  from?: string;
  to?: string;
};

export function parseAnalysisLens(value: unknown): AnalysisLens {
  const id = String(value || 'why');
  if (ANALYSIS_LENSES.some((lens) => lens.id === id)) return id as AnalysisLens;
  throw new FinanceValidationError('Choose Highest views, Highest liked videos, Highest engagement, No / low engagement, or Why more engagement.');
}

export function engagementActions(likes: number | null | undefined, comments: number | null | undefined) {
  if (likes == null && comments == null) return null;
  return (Number(likes) || 0) + (Number(comments) || 0);
}

export function actionsPerThousandViews(actions: number | null | undefined, views: number | null | undefined) {
  if (actions == null || views == null || views <= 0) return null;
  return Math.round((actions / views) * 1000 * 10) / 10;
}

export function clockDuration(seconds: number | null | undefined) {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return '';
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = total % 60;
  if (hours) return `${hours}:${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function weekdayLabel(iso: string | null | undefined) {
  if (!iso) return null;
  const stamp = iso.length === 10 ? `${iso}T12:00:00Z` : iso;
  const date = new Date(stamp);
  if (Number.isNaN(date.getTime())) return null;
  return WEEKDAYS[date.getUTCDay()];
}

export type CompactVideo = {
  id: string;
  youtube_video_id: string;
  title: string | null;
  channel_name: string | null;
  relationship: string | null;
  content_label: string | null;
  placement_label: string | null;
  category_label: string | null;
  topic_name: string | null;
  published_at: string | null;
  weekday: string | null;
  duration_seconds: number | null;
  duration_label: string;
  tags: string[];
  view_count: number | null;
  like_count: number | null;
  comment_count: number | null;
  engagement_actions: number | null;
  actions_per_1k_views: number | null;
  note: string;
  stale: boolean;
  thumbnail_url: string | null;
  watch_url: string | null;
};

export type InsightCard = {
  id: string;
  icon: string;
  title: string;
  body: string;
};

function mean(rows: CompactVideo[], pick: (row: CompactVideo) => number | null) {
  const values = rows.map(pick).filter((value): value is number => value != null);
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function ratio(high: number | null, low: number | null) {
  if (high == null || low == null || low <= 0) return null;
  return Math.round((high / low) * 10) / 10;
}

export function performanceNote(video: CompactVideo, kind: 'high' | 'low') {
  const title = video.title || '';
  const question = /\b(what|why|how|when|vs|versus|explained|guide|tips)\b/i.test(title) || title.includes('?');
  if (kind === 'high') {
    const bits: string[] = [];
    if (video.content_label === 'Short') bits.push('Short, clear hook');
    else if (question) bits.push('Clear, specific title');
    if (video.tags.length >= 3) bits.push('relevant tags');
    if (video.topic_name) bits.push(`${video.topic_name} topic`);
    if ((video.comment_count || 0) > 10) bits.push('real questions in comments');
    if (!bits.length) bits.push('High public views and likes in this set');
    return `${bits.join(', ')}.`;
  }
  const gaps: string[] = [];
  if (!question && title.length > 48) gaps.push('Title is long or generic');
  else if (!question) gaps.push('Needs a stronger hook');
  if (video.tags.length < 3) gaps.push('add relevant tags');
  if ((video.comment_count || 0) === 0 && (video.like_count || 0) <= 3) gaps.push('almost no public interaction');
  if (!gaps.length) gaps.push('Compare title, topic, and format with the high set');
  return `${gaps.join('. ')}.`;
}

function shape(row: Record<string, unknown>, kind: 'high' | 'low' = 'high'): CompactVideo {
  const video = presentVideo(row);
  const likes = video.like_count as number | null;
  const comments = video.comment_count as number | null;
  const views = video.view_count as number | null;
  const actions = engagementActions(likes, comments);
  const tags = Array.isArray(video.tags) ? (video.tags as string[]) : [];
  const published = video.published_at ? String(video.published_at).slice(0, 10) : null;
  const compact: CompactVideo = {
    id: String(row.id),
    youtube_video_id: String(row.youtube_video_id || ''),
    title: (video.title as string | null) || null,
    channel_name: (video.channel_name as string | null) || null,
    relationship: (row.relationship as string | null) || null,
    content_label: contentLabel(video.duration_seconds as number | null, video.title as string | null, tags),
    placement_label: video.stale
      ? null
      : isPaidPlacement({
        hasPaidProductPlacement: video.has_paid_product_placement as boolean | null,
        title: video.title as string | null,
        description: video.description as string | null,
        tags,
      }) ? 'Paid' : 'Organic',
    category_label: categoryLabel(video.category_id as string | null),
    topic_name: (row.topic_name as string | null) || null,
    published_at: published,
    weekday: weekdayLabel(published),
    duration_seconds: (video.duration_seconds as number | null) ?? null,
    duration_label: clockDuration(video.duration_seconds as number | null),
    tags: tags.slice(0, 12),
    view_count: views,
    like_count: likes,
    comment_count: comments,
    engagement_actions: actions,
    actions_per_1k_views: actionsPerThousandViews(actions, views),
    note: '',
    stale: Boolean(video.stale),
    thumbnail_url: (video.thumbnail_url as string | null) || null,
    watch_url: (video.watch_url as string | null) || null,
  };
  compact.note = performanceNote(compact, kind);
  return compact;
}

export function contrastNotes(high: CompactVideo[], low: CompactVideo[]) {
  const notes: string[] = [];
  if (!high.length || !low.length) {
    notes.push('Import and refresh more videos so high- and low-engagement groups can be compared.');
    return notes;
  }
  const share = (rows: CompactVideo[], test: (row: CompactVideo) => boolean) => {
    const known = rows.filter((row) => !row.stale);
    if (!known.length) return null;
    return Math.round((known.filter(test).length / known.length) * 100);
  };
  const highShort = share(high, (row) => row.content_label === 'Short');
  const lowShort = share(low, (row) => row.content_label === 'Short');
  if (highShort != null && lowShort != null && highShort !== lowShort) {
    notes.push(`Shorts are ${highShort}% of the high-engagement set and ${lowShort}% of the low-engagement set.`);
  }
  const highPaid = share(high, (row) => row.placement_label === 'Paid');
  const lowPaid = share(low, (row) => row.placement_label === 'Paid');
  if (highPaid != null && lowPaid != null) {
    notes.push(`Paid placement appears on ${highPaid}% of high-engagement videos and ${lowPaid}% of low-engagement videos.`);
  }
  const highTitle = mean(high, (row) => (row.title ? row.title.length : null));
  const lowTitle = mean(low, (row) => (row.title ? row.title.length : null));
  if (highTitle != null && lowTitle != null) {
    notes.push(`Average title length is ${Math.round(highTitle)} characters on high-engagement videos and ${Math.round(lowTitle)} on low-engagement videos.`);
  }
  const highTags = mean(high, (row) => row.tags.length);
  const lowTags = mean(low, (row) => row.tags.length);
  if (highTags != null && lowTags != null) {
    notes.push(`High-engagement videos average ${Math.round(highTags)} public tags; low-engagement videos average ${Math.round(lowTags)}.`);
  }
  const highViews = mean(high, (row) => row.view_count);
  const lowViews = mean(low, (row) => row.view_count);
  if (highViews != null && lowViews != null) {
    notes.push(`Typical public views in the high set are ${Math.round(highViews).toLocaleString('en-IN')} vs ${Math.round(lowViews).toLocaleString('en-IN')} in the low set.`);
  }
  notes.push('These patterns are hypotheses from public title, tags, type, placement, and counts. They are not YouTube Analytics causes.');
  return notes;
}

export function insightCards(high: CompactVideo[], low: CompactVideo[]): InsightCard[] {
  const cards: InsightCard[] = [];
  const shortHigh = high.filter((row) => row.content_label === 'Short');
  const longHigh = high.filter((row) => row.content_label === 'Video');
  const shortLow = low.filter((row) => row.content_label === 'Short');
  const longLow = low.filter((row) => row.content_label === 'Video');
  const viewRatio = ratio(mean(shortHigh, (row) => row.view_count), mean([...longHigh, ...longLow], (row) => row.view_count));
  const likeRatio = ratio(mean(shortHigh, (row) => row.like_count), mean([...longHigh, ...longLow], (row) => row.like_count));
  if (shortHigh.length && viewRatio && viewRatio > 1) {
    cards.push({
      id: 'shorts',
      icon: 'PlayCircleIcon',
      title: 'Shorts drive higher engagement',
      body: `Shorts in the high set have about ${viewRatio}× more views${likeRatio && likeRatio > 1 ? ` and ${likeRatio}× more likes` : ''} than longer videos in this filter.`,
    });
  } else if (shortHigh.length || shortLow.length) {
    cards.push({
      id: 'shorts',
      icon: 'PlayCircleIcon',
      title: 'Shorts vs long form',
      body: 'This filter does not show a clear public-view advantage for Shorts over longer videos.',
    });
  } else {
    cards.push({
      id: 'shorts',
      icon: 'PlayCircleIcon',
      title: 'Shorts vs long form',
      body: 'Not enough Shorts in this filter to compare with longer videos.',
    });
  }

  const topics = new Map<string, { high: number; low: number; actions: number[] }>();
  for (const row of high) {
    const key = row.topic_name || row.category_label;
    if (!key) continue;
    const item = topics.get(key) || { high: 0, low: 0, actions: [] };
    item.high += 1;
    if (row.engagement_actions != null) item.actions.push(row.engagement_actions);
    topics.set(key, item);
  }
  for (const row of low) {
    const key = row.topic_name || row.category_label;
    if (!key) continue;
    const item = topics.get(key) || { high: 0, low: 0, actions: [] };
    item.low += 1;
    topics.set(key, item);
  }
  const bestTopic = [...topics.entries()].sort((a, b) => (b[1].high - b[1].low) - (a[1].high - a[1].low) || b[1].high - a[1].high)[0];
  if (bestTopic && bestTopic[1].high > bestTopic[1].low) {
    cards.push({
      id: 'topic',
      icon: 'ChartBarIcon',
      title: `${bestTopic[0]} performs best`,
      body: `“${bestTopic[0]}” appears more often in the high-engagement set (${bestTopic[1].high} vs ${bestTopic[1].low} in the low set).`,
    });
  } else {
    cards.push({
      id: 'topic',
      icon: 'ChartBarIcon',
      title: 'Topics in this set',
      body: 'Assign research topics or refresh categories to compare which subjects collect more likes and comments.',
    });
  }

  const highTags = mean(high, (row) => row.tags.length);
  const lowTags = mean(low, (row) => row.tags.length);
  const highQuestion = high.filter((row) => /\?|\b(what|why|how|vs)\b/i.test(row.title || '')).length;
  cards.push({
    id: 'titles',
    icon: 'TagIcon',
    title: 'Clear titles and relevant tags help',
    body: highTags != null && lowTags != null && highTags > lowTags
      ? `High-engagement videos average ${Math.round(highTags)} tags vs ${Math.round(lowTags)} on quieter videos${highQuestion ? `, and ${highQuestion} use a question or comparison in the title` : ''}.`
      : 'Specific titles and a few accurate tags show up more often on videos with likes and comments.',
  });

  const midweek = (row: CompactVideo) => row.weekday === 'Tue' || row.weekday === 'Wed' || row.weekday === 'Thu';
  const highMid = high.filter(midweek).length;
  const lowMid = low.filter(midweek).length;
  const highShare = high.length ? Math.round((highMid / high.length) * 100) : 0;
  const lowShare = low.length ? Math.round((lowMid / low.length) * 100) : 0;
  cards.push({
    id: 'schedule',
    icon: 'ClockIcon',
    title: highShare > lowShare ? 'Tuesday – Thursday shows up more' : 'Publish day in this library',
    body: highShare > lowShare
      ? `${highShare}% of high-engagement videos were published Tue–Thu, versus ${lowShare}% of the low set. This is publish day of imported rows, not Analytics posting time.`
      : 'Publish weekday does not clearly separate high- and low-interaction videos in this filter.',
  });
  return cards;
}

function analysisFilter(params: AnalysisFilter) {
  const values: unknown[] = [];
  const where = [`c.status='active'`, FRESH];
  if (params.q?.trim()) {
    values.push(`%${params.q.trim()}%`);
    const n = values.length + 1;
    where.push(`(v.youtube_video_id ILIKE $${n} OR v.title ILIKE $${n} OR v.description ILIKE $${n} OR EXISTS (SELECT 1 FROM unnest(v.tags) tag WHERE tag ILIKE $${n}))`);
  }
  if (params.channelIds?.length) {
    values.push(params.channelIds);
    where.push(`v.channel_id = ANY($${values.length + 1}::uuid[])`);
  }
  if (params.topicId === 'none') where.push('r.topic_id IS NULL');
  else if (params.topicId) {
    values.push(params.topicId);
    where.push(`r.topic_id=$${values.length + 1}`);
  }
  if (params.content === 'short') where.push(SHORT_MATCH);
  if (params.content === 'video') where.push(`NOT ${SHORT_MATCH}`);
  if (params.from) {
    values.push(params.from);
    where.push(`v.published_at >= $${values.length + 1}::date`);
  }
  if (params.to) {
    values.push(params.to);
    where.push(`v.published_at < ($${values.length + 1}::date + INTERVAL '1 day')`);
  }
  return { values, where: where.join(' AND ') };
}

function readFilter(input: Record<string, unknown> | undefined): AnalysisFilter {
  const channelIds = Array.isArray(input?.channelIds)
    ? input.channelIds.map(String).filter(Boolean)
    : String(input?.channelIds || '').split(',').filter(Boolean);
  return {
    q: String(input?.q || ''),
    channelIds,
    topicId: String(input?.topicId || ''),
    content: String(input?.content || ''),
    from: String(input?.from || ''),
    to: String(input?.to || ''),
  };
}

function orderSql(lens: AnalysisLens) {
  if (lens === 'likes') return 'v.like_count DESC NULLS LAST, v.view_count DESC NULLS LAST';
  if (lens === 'engagement' || lens === 'why') return `${ACTIONS} DESC, ${PER_1K} DESC NULLS LAST, v.view_count DESC NULLS LAST`;
  if (lens === 'quiet') return `${ACTIONS} ASC, v.view_count DESC NULLS LAST`;
  return 'v.view_count DESC NULLS LAST, v.like_count DESC NULLS LAST';
}

async function requireProject(id: string) {
  const { rows } = await q(undefined, `SELECT id, name FROM youtube_research_projects WHERE id=$1`, [id]);
  if (!rows[0]) throw new FinanceNotFoundError('Research project not found');
  return rows[0];
}

async function loadRanked(projectId: string, lens: AnalysisLens, limit: number, filter: AnalysisFilter) {
  const extra = lens === 'quiet' ? `AND COALESCE(v.view_count, 0) > 0` : '';
  const parsed = analysisFilter(filter);
  const { rows } = await q(
    undefined,
    `${SELECT} WHERE ${parsed.where} ${extra} ORDER BY ${orderSql(lens)} LIMIT ${limit}`,
    [projectId, ...parsed.values]
  );
  return rows.map((row) => shape(row, lens === 'quiet' ? 'low' : 'high'));
}

export async function projectAnalysis(projectId: string, lensRaw: unknown, limitRaw?: unknown, filterRaw?: Record<string, unknown>) {
  await requireProject(projectId);
  const lens = parseAnalysisLens(lensRaw);
  const limit = Math.min(50, Math.max(5, Number(limitRaw) || 12));
  const filter = readFilter(filterRaw);
  if (lens === 'why') {
    const high = await loadRanked(projectId, 'engagement', limit, filter);
    const highIds = new Set(high.map((row) => row.id));
    const low = (await loadRanked(projectId, 'quiet', limit + high.length, filter)).filter((row) => !highIds.has(row.id)).slice(0, limit);
    return {
      lens,
      notice: ANALYSIS_NOTICE,
      high,
      low,
      rows: high,
      observations: contrastNotes(high, low),
      insights: insightCards(high, low),
    };
  }
  const rows = await loadRanked(projectId, lens, limit, filter);
  return { lens, notice: ANALYSIS_NOTICE, rows, high: lens === 'quiet' ? [] : rows, low: lens === 'quiet' ? rows : [], observations: [] as string[], insights: [] as InsightCard[] };
}

type SummaryJson = {
  headline?: string;
  body?: string;
  why_high?: string[];
  why_low?: string[];
  patterns?: string[];
  suggestions?: string[];
};

function compactForAi(row: CompactVideo) {
  return {
    title: row.title || row.youtube_video_id,
    channel: row.channel_name,
    role: row.relationship,
    type: row.content_label,
    placement: row.placement_label,
    category: row.category_label,
    topic: row.topic_name,
    published: row.published_at,
    weekday: row.weekday,
    duration_seconds: row.duration_seconds,
    tags: row.tags.slice(0, 8),
    views: row.view_count,
    likes: row.like_count,
    comments: row.comment_count,
    likes_plus_comments: row.engagement_actions,
    likes_plus_comments_per_1000_views: row.actions_per_1k_views,
  };
}

export async function summarizeProjectAnalysis(projectId: string, filterRaw?: Record<string, unknown>) {
  const analysis = await projectAnalysis(projectId, 'why', 8, filterRaw);
  if (!analysis.high.length) {
    throw new FinanceValidationError('Import and refresh videos in this project before asking AI to summarise engagement.');
  }
  const generated = await generateAIChat({
    purpose: 'youtube_research_analysis',
    json: true,
    temperature: 0.3,
    maxTokens: 1400,
    timeoutMs: 45000,
    messages: [
      {
        role: 'system',
        content: `You analyse competitor YouTube research for Techantum using only the public Data API fields provided.
Rules:
- Do not invent watch time, CTR, impressions, subscribers gained, or YouTube Analytics.
- Treat likes + comments as public interaction counts, not official engagement rate.
- Explain likely reasons high videos outperform low videos using title, tags, Short vs Video, organic vs paid placement, duration, and counts.
- Be specific and practical. If evidence is thin, say so.
- Return JSON only.`,
      },
      {
        role: 'user',
        content: `HIGH INTERACTION VIDEOS:
${JSON.stringify(analysis.high.map(compactForAi), null, 2)}

LOW INTERACTION VIDEOS (views with few likes/comments):
${JSON.stringify(analysis.low.map(compactForAi), null, 2)}

LIBRARY OBSERVATIONS:
${analysis.observations.join('\n')}

Return JSON:
{
  "headline": "one sentence",
  "body": "2-4 sentences for the banner",
  "why_high": ["reason"],
  "why_low": ["reason"],
  "patterns": ["pattern"],
  "suggestions": ["what to test next"]
}`,
      },
    ],
  });
  const parsed = parseModelJson<SummaryJson>(generated.text);
  return {
    ...analysis,
    summary: {
      headline: String(parsed.headline || '').trim() || 'High- and low-interaction videos differ in public title, format, and tags.',
      body: String(parsed.body || '').trim(),
      why_high: Array.isArray(parsed.why_high) ? parsed.why_high.map(String).filter(Boolean).slice(0, 8) : [],
      why_low: Array.isArray(parsed.why_low) ? parsed.why_low.map(String).filter(Boolean).slice(0, 8) : [],
      patterns: Array.isArray(parsed.patterns) ? parsed.patterns.map(String).filter(Boolean).slice(0, 8) : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.map(String).filter(Boolean).slice(0, 8) : [],
      provider: generated.provider,
      model: generated.model,
    },
  };
}

export async function summarizeAnalysisVideo(projectId: string, videoId: string, modeRaw: unknown, filterRaw?: Record<string, unknown>) {
  const mode = String(modeRaw || '') === 'gap' ? 'gap' : 'high';
  if (!videoId) throw new FinanceValidationError('Choose a video to summarise.');
  const analysis = await projectAnalysis(projectId, 'why', 8, filterRaw);
  const video = [...analysis.high, ...analysis.low].find((row) => row.id === videoId);
  if (!video) throw new FinanceNotFoundError('That video is not in this analysis set. Run Analyze again.');
  const generated = await generateAIChat({
    purpose: 'youtube_research_video',
    json: true,
    temperature: 0.3,
    maxTokens: 600,
    timeoutMs: 30000,
    messages: [
      {
        role: 'system',
        content: 'Explain this YouTube video using only provided public Data API fields. No watch time, CTR, or Analytics. Return JSON { "note": "1-2 sentences" }.',
      },
      {
        role: 'user',
        content: `MODE: ${mode === 'gap' ? 'why little interaction and what to try' : 'why it likely performed well'}
VIDEO: ${JSON.stringify(compactForAi(video))}
HIGH SET TITLES: ${analysis.high.map((row) => row.title).filter(Boolean).slice(0, 5).join(' | ')}`,
      },
    ],
  });
  const parsed = parseModelJson<{ note?: string }>(generated.text);
  return { id: video.id, note: String(parsed.note || video.note).trim() };
}
