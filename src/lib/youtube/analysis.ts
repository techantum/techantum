import { generateAIChat } from '@/lib/ai';
import { parseModelJson } from '@/lib/ai/json';
import { q } from '../finance/db';
import { FinanceNotFoundError, FinanceValidationError } from '../finance/errors';
import { presentVideo } from './mask';
import { categoryLabel, contentLabel, isPaidPlacement, YOUTUBE_METRIC_NOTICE } from './parse';

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

export const ANALYSIS_NOTICE =
  `${YOUTUBE_METRIC_NOTICE} Analysis rankings use those public view, like, and comment counts. Likes + comments and likes+comments per 1,000 views are derived here; they are not YouTube Analytics.`;

export const ANALYSIS_LENSES = [
  { id: 'views', label: 'Highest views', hint: 'Videos with the most public views in this project.' },
  { id: 'likes', label: 'Highest liked videos', hint: 'Videos with the most public likes.' },
  { id: 'engagement', label: 'Highest engagement', hint: 'Ranked by likes + comments, then likes+comments per 1,000 views.' },
  { id: 'quiet', label: 'No / low engagement', hint: 'Videos that have views but few or no likes and comments.' },
  { id: 'why', label: 'Why more engagement', hint: 'Contrast high- and low-engagement videos and summarise with AI.' },
] as const;

export type AnalysisLens = (typeof ANALYSIS_LENSES)[number]['id'];

export function parseAnalysisLens(value: unknown): AnalysisLens {
  const id = String(value || 'views');
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

export type CompactVideo = {
  id: string;
  youtube_video_id: string;
  title: string | null;
  channel_name: string | null;
  relationship: string | null;
  content_label: string | null;
  placement_label: string | null;
  category_label: string | null;
  published_at: string | null;
  duration_seconds: number | null;
  tags: string[];
  view_count: number | null;
  like_count: number | null;
  comment_count: number | null;
  engagement_actions: number | null;
  actions_per_1k_views: number | null;
  stale: boolean;
  thumbnail_url: string | null;
  watch_url: string | null;
};

function shape(row: Record<string, unknown>): CompactVideo {
  const video = presentVideo(row);
  const likes = video.like_count as number | null;
  const comments = video.comment_count as number | null;
  const views = video.view_count as number | null;
  const actions = engagementActions(likes, comments);
  const tags = Array.isArray(video.tags) ? (video.tags as string[]) : [];
  return {
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
    published_at: video.published_at ? String(video.published_at).slice(0, 10) : null,
    duration_seconds: (video.duration_seconds as number | null) ?? null,
    tags: tags.slice(0, 12),
    view_count: views,
    like_count: likes,
    comment_count: comments,
    engagement_actions: actions,
    actions_per_1k_views: actionsPerThousandViews(actions, views),
    stale: Boolean(video.stale),
    thumbnail_url: (video.thumbnail_url as string | null) || null,
    watch_url: (video.watch_url as string | null) || null,
  };
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
  const avg = (rows: CompactVideo[], pick: (row: CompactVideo) => number | null) => {
    const values = rows.map(pick).filter((value): value is number => value != null);
    if (!values.length) return null;
    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
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
  const highTitle = avg(high, (row) => (row.title ? row.title.length : null));
  const lowTitle = avg(low, (row) => (row.title ? row.title.length : null));
  if (highTitle != null && lowTitle != null) {
    notes.push(`Average title length is ${highTitle} characters on high-engagement videos and ${lowTitle} on low-engagement videos.`);
  }
  const highTags = avg(high, (row) => row.tags.length);
  const lowTags = avg(low, (row) => row.tags.length);
  if (highTags != null && lowTags != null) {
    notes.push(`High-engagement videos average ${highTags} public tags; low-engagement videos average ${lowTags}.`);
  }
  const highViews = avg(high, (row) => row.view_count);
  const lowViews = avg(low, (row) => row.view_count);
  if (highViews != null && lowViews != null) {
    notes.push(`Typical public views in the high set are ${highViews.toLocaleString('en-IN')} vs ${lowViews.toLocaleString('en-IN')} in the low set.`);
  }
  const countTags = (rows: CompactVideo[]) => {
    const map = new Map<string, number>();
    for (const row of rows) {
      for (const tag of row.tags) {
        const key = tag.replace(/^#/, '').trim().toLowerCase();
        if (!key) continue;
        map.set(key, (map.get(key) || 0) + 1);
      }
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([tag]) => tag);
  };
  const highTagList = countTags(high);
  const lowTagList = countTags(low);
  if (highTagList.length) notes.push(`Frequent tags on high-engagement videos: ${highTagList.join(', ')}.`);
  if (lowTagList.length) notes.push(`Frequent tags on low-engagement videos: ${lowTagList.join(', ')}.`);
  notes.push('These patterns are hypotheses from public title, tags, type, placement, and counts. They are not YouTube Analytics causes.');
  return notes;
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

async function loadRanked(projectId: string, lens: AnalysisLens, limit: number) {
  const extra = lens === 'quiet' ? `AND COALESCE(v.view_count, 0) > 0` : '';
  const { rows } = await q(
    undefined,
    `${SELECT} WHERE c.status='active' AND ${FRESH} ${extra} ORDER BY ${orderSql(lens)} LIMIT ${limit}`,
    [projectId]
  );
  return rows.map((row) => shape(row));
}

export async function projectAnalysis(projectId: string, lensRaw: unknown, limitRaw?: unknown) {
  await requireProject(projectId);
  const lens = parseAnalysisLens(lensRaw);
  const limit = Math.min(50, Math.max(5, Number(limitRaw) || 20));
  if (lens === 'why') {
    const high = await loadRanked(projectId, 'engagement', 8);
    const low = await loadRanked(projectId, 'quiet', 8);
    return {
      lens,
      notice: ANALYSIS_NOTICE,
      high,
      low,
      rows: high,
      observations: contrastNotes(high, low),
    };
  }
  const rows = await loadRanked(projectId, lens, limit);
  return { lens, notice: ANALYSIS_NOTICE, rows, high: [], low: [], observations: [] as string[] };
}

type SummaryJson = {
  headline?: string;
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
    published: row.published_at,
    duration_seconds: row.duration_seconds,
    tags: row.tags.slice(0, 8),
    views: row.view_count,
    likes: row.like_count,
    comments: row.comment_count,
    likes_plus_comments: row.engagement_actions,
    likes_plus_comments_per_1000_views: row.actions_per_1k_views,
  };
}

export async function summarizeProjectAnalysis(projectId: string) {
  const analysis = await projectAnalysis(projectId, 'why', 8);
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
      why_high: Array.isArray(parsed.why_high) ? parsed.why_high.map(String).filter(Boolean).slice(0, 8) : [],
      why_low: Array.isArray(parsed.why_low) ? parsed.why_low.map(String).filter(Boolean).slice(0, 8) : [],
      patterns: Array.isArray(parsed.patterns) ? parsed.patterns.map(String).filter(Boolean).slice(0, 8) : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.map(String).filter(Boolean).slice(0, 8) : [],
      provider: generated.provider,
      model: generated.model,
    },
  };
}
