import { generateAIChat } from '../ai/gateway';
import { parseModelJson } from '../ai/json';
import { q } from '../finance/db';
import { FinanceNotFoundError, FinanceValidationError } from '../finance/errors';
import { listProjectChannels, listProjectVideos } from './projects';
import { enrichComparisonVideos } from './thumbnail-read';
import { captionLanguageNames, enrichSpokenContent } from './video-content';
import { assertYoutubeProject } from './scope';
import { lengthLabel, YOUTUBE_METRIC_NOTICE } from './parse';

export const ANALYTICS_UNAVAILABLE = 'Not available through the current YouTube integration.';
export const ANALYTICS_HINT = 'Connect an authorized YouTube channel for additional audience insights.';
export const AI_RESEARCH_NOTICE =
  `${YOUTUBE_METRIC_NOTICE} AI recommendations use those public fields plus your selected goals. They are hypotheses to test, not guarantees. Audience targets are desired goals unless authorized YouTube Analytics is connected.`;

export const IMPROVEMENT_GOALS = [
  { id: 'views', label: 'Views', group: 'reach' },
  { id: 'likes', label: 'Likes', group: 'engagement' },
  { id: 'comments', label: 'Comments', group: 'engagement' },
  { id: 'engagement', label: 'Engagement', group: 'engagement' },
  { id: 'retention', label: 'Retention', group: 'audience' },
  { id: 'audience', label: 'Audience', group: 'audience' },
  { id: 'discoverability', label: 'Discoverability', group: 'reach' },
] as const;

export const RESEARCH_SOURCES = [
  { id: 'own', label: 'Own channel videos' },
  { id: 'own_and_competitors', label: 'Own channel + competitor videos' },
  { id: 'selected', label: 'Manually selected videos' },
] as const;

export const OUTPUT_OPTIONS = [
  { id: 'improve_existing', label: 'Improve existing videos' },
  { id: 'new_ideas', label: 'Suggest new video ideas' },
  { id: 'gap_report', label: 'Create performance & gap report' },
] as const;

export const REPORT_TYPES = [
  { id: 'performance', label: 'Existing Performance Report' },
  { id: 'gap', label: 'Video Gap Analysis Report' },
  { id: 'high_performing', label: 'High-Performing Content Research Report' },
  { id: 'competitor', label: 'Own vs Competitor Research Report' },
  { id: 'improvement_plan', label: 'Content Improvement Plan' },
  { id: 'executive', label: 'Executive Research Report' },
] as const;

export const ACTION_STATUSES = ['proposed', 'approved', 'in_progress', 'implemented', 'under_review', 'completed', 'rejected'] as const;
export const CONTENT_FOCUS = [
  { id: 'titles', label: 'Titles', hint: 'Improve title clarity and SEO' },
  { id: 'thumbnails', label: 'Thumbnails', hint: 'Get thumbnail suggestions' },
  { id: 'descriptions', label: 'Descriptions', hint: 'Optimize descriptions and tags' },
  { id: 'content_ideas', label: 'Content Ideas', hint: 'Discover new topic opportunities' },
  { id: 'publishing', label: 'Publishing Strategy', hint: 'Best time, frequency and format' },
  { id: 'competitor_insights', label: 'Competitor Insights', hint: 'Learn from top-performing videos' },
] as const;
export const TARGET_AGES = ['All ages', '13–17', '18–24', '25–34', '35–44', '45–54', '55–64', '65+'];
export const TARGET_GENDERS = ['All audiences', 'Male', 'Female'];
export const TARGET_DEVICES = ['All devices', 'Mobile', 'Desktop', 'TV'];
export const LANGUAGE_SUGGESTIONS = ['English', 'Hindi', 'Telugu', 'Tamil', 'Kannada', 'Malayalam', 'Marathi', 'Bengali'];
export const GEO_SUGGESTIONS = ['India', 'United States', 'United Kingdom', 'United Arab Emirates', 'Singapore', 'Australia'];

export type ImprovementGoal = (typeof IMPROVEMENT_GOALS)[number]['id'];
export type ResearchSource = (typeof RESEARCH_SOURCES)[number]['id'];
export type OutputOption = (typeof OUTPUT_OPTIONS)[number]['id'];
export type ReportType = (typeof REPORT_TYPES)[number]['id'];

export type ContentFocus = (typeof CONTENT_FOCUS)[number]['id'];

export type AiResearchConfig = {
  goals: ImprovementGoal[];
  source: ResearchSource;
  videoIds: string[];
  contentFocus: ContentFocus[];
  targetAges: string[];
  targetAge: string;
  targetGenders: string[];
  targetGender: string;
  geographies: string[];
  targetGeography: string;
  languages: string[];
  interests: string[];
  devices: string[];
  audienceNotes: string;
  outputs: OutputOption[];
};

type EvidenceVideo = {
  id: string;
  youtube_video_id: string;
  title: string | null;
  channel_id: string | null;
  channel_name: string | null;
  channel_handle: string | null;
  subscriber_count: number | null;
  relationship: string | null;
  content_label: string | null;
  placement_label: string | null;
  topic_name: string | null;
  published_at: string | null;
  duration_label: string | null;
  duration_seconds: number | null;
  duration: string | null;
  thumbnail_text: string | null;
  thumbnail_scene: string | null;
  tags: string[];
  view_count: number | null;
  like_count: number | null;
  comment_count: number | null;
  watch_url: string | null;
  thumbnail_url: string | null;
  thumbnail_caption: string | null;
  description: string | null;
  spoken_text: string | null;
  spoken_source: 'captions' | 'description' | null;
};

function listText(value: unknown, extra?: unknown, max = 12, size = 60) {
  const raw = Array.isArray(value) ? value : extra != null && extra !== '' ? [extra] : [];
  return [...new Set(raw.map((item) => cleanText(item, size)).filter(Boolean))].slice(0, max);
}

export function parseAiResearchConfig(body: Record<string, unknown>): AiResearchConfig {
  const goals = uniqueIds(body.goals, IMPROVEMENT_GOALS.map((item) => item.id)) as ImprovementGoal[];
  if (!goals.length) throw new FinanceValidationError('Select at least one improvement goal.');
  const videoIds = Array.isArray(body.videoIds) ? [...new Set(body.videoIds.map(String).filter(Boolean))].slice(0, 40) : [];
  const sourceRaw = String(body.source || (videoIds.length ? 'selected' : 'own'));
  const source = RESEARCH_SOURCES.some((item) => item.id === sourceRaw) ? (sourceRaw as ResearchSource) : 'own';
  if (source === 'selected' && videoIds.length < 1) throw new FinanceValidationError('Select at least one video for a manual analysis.');
  const outputs = uniqueIds(body.outputs, OUTPUT_OPTIONS.map((item) => item.id)) as OutputOption[];
  const targetAges = uniqueIds(body.targetAges ?? body.targetAge, TARGET_AGES);
  const targetGenders = uniqueIds(body.targetGenders ?? body.targetGender, TARGET_GENDERS);
  const devices = uniqueIds(body.devices, TARGET_DEVICES);
  const geographies = listText(body.geographies, body.targetGeography);
  return {
    goals,
    source,
    videoIds,
    contentFocus: uniqueIds(body.contentFocus, CONTENT_FOCUS.map((item) => item.id)) as ContentFocus[],
    targetAges,
    targetAge: targetAges.join(', ') || cleanText(body.targetAge, 80) || 'All ages',
    targetGenders,
    targetGender: targetGenders.join(', ') || cleanText(body.targetGender, 80) || 'All audiences',
    geographies,
    targetGeography: geographies.join(', '),
    languages: listText(body.languages, body.targetLanguage),
    interests: listText(body.interests, undefined, 16, 40),
    devices: devices.length ? devices : ['All devices'],
    audienceNotes: cleanText(body.audienceNotes, 500),
    outputs: outputs.length ? outputs : ['improve_existing', 'new_ideas', 'gap_report'],
  };
}

function uniqueIds(value: unknown, allowed: readonly string[]) {
  const list = Array.isArray(value) ? value.map(String) : [];
  return [...new Set(list.filter((item) => allowed.includes(item)))];
}

function cleanText(value: unknown, max: number) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function compactVideo(row: Record<string, any>, channels: { id: string; youtube_channel_id?: string; channel_handle?: string | null; subscriber_count?: number | null }[] = []): EvidenceVideo {
  const channel = channels.find((item) => String(item.id) === String(row.channel_id) || item.youtube_channel_id === row.youtube_channel_id);
  return {
    id: String(row.id),
    youtube_video_id: String(row.youtube_video_id || ''),
    title: row.title || null,
    channel_id: row.channel_id ? String(row.channel_id) : null,
    channel_name: row.channel_name || null,
    channel_handle: channel?.channel_handle || row.channel_handle || null,
    subscriber_count: channel?.subscriber_count == null && row.subscriber_count == null ? null : Number(channel?.subscriber_count ?? row.subscriber_count),
    relationship: row.relationship || null,
    content_label: row.content_label || null,
    placement_label: row.placement_label || null,
    topic_name: row.topic_name || null,
    published_at: row.published_at ? String(row.published_at).slice(0, 10) : null,
    duration_label: lengthLabel(row) || null,
    duration_seconds: row.duration_seconds == null ? null : Number(row.duration_seconds),
    duration: row.duration || null,
    thumbnail_text: row.thumbnail_text || null,
    thumbnail_scene: row.thumbnail_scene || null,
    tags: Array.isArray(row.tags) ? row.tags.map(String).slice(0, 12) : [],
    view_count: row.view_count == null ? null : Number(row.view_count),
    like_count: row.like_count == null ? null : Number(row.like_count),
    comment_count: row.comment_count == null ? null : Number(row.comment_count),
    watch_url: row.watch_url || null,
    thumbnail_url: row.thumbnail_url || null,
    thumbnail_caption: row.thumbnail_caption || null,
    description: row.description ? String(row.description).slice(0, 2500) : null,
    spoken_text: row.spoken_text ? String(row.spoken_text).slice(0, 14000) : null,
    spoken_source: row.spoken_source === 'captions' || row.spoken_source === 'description' ? row.spoken_source : null,
  };
}

function clipCaptionSummary(spoken: string) {
  return spoken
    .split(/\n\n(?=(?:Telugu|Hindi|English):)/)
    .map((block) => {
      const text = block.replace(/\s+/g, ' ').trim();
      return text.length > 500 ? `${text.slice(0, 499).trim()}…` : text;
    })
    .filter(Boolean)
    .join(' ');
}

export function buildVideoBriefs(videos: EvidenceVideo[]) {
  return videos.slice(0, 12).map((video) => {
    const imageBits = [
      video.thumbnail_text ? `On-image text: ${video.thumbnail_text}` : '',
      video.thumbnail_scene ? `Image: ${video.thumbnail_scene}` : '',
    ].filter(Boolean);
    const fromCaptions = video.spoken_source === 'captions' && video.spoken_text;
    const languages = captionLanguageNames(video.spoken_text);
    return {
      video_id: video.id,
      title: video.title || video.youtube_video_id,
      thumbnail_url: video.thumbnail_url,
      thumbnail_summary: imageBits.join('. ') || 'The thumbnail image could not be read for this video.',
      content_summary: fromCaptions
        ? `Captions${languages.length ? ` in ${languages.join(', ')}` : ''}. ${clipCaptionSummary(video.spoken_text || '')}`
        : video.description
          ? video.description.slice(0, 500)
          : 'No public description or captions were available, so spoken video content was not summarised.',
      content_source: video.spoken_source || (video.description ? 'description' : null),
      caption_languages: languages,
    };
  });
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function classifyVideos(videos: EvidenceVideo[]) {
  const withViews = videos.filter((video) => video.view_count != null);
  const viewCut = median(withViews.map((video) => Number(video.view_count)));
  const likeCut = median(withViews.map((video) => Number(video.like_count || 0)));
  const highViews = withViews.filter((video) => Number(video.view_count) >= viewCut && Number(video.view_count) > 0).slice(0, 8);
  const highLikes = withViews.filter((video) => Number(video.like_count || 0) >= likeCut && Number(video.like_count || 0) > 0).slice(0, 8);
  const quiet = withViews.filter((video) => Number(video.view_count) > 0 && Number(video.like_count || 0) + Number(video.comment_count || 0) <= 2).slice(0, 8);
  return { highViews, highLikes, quiet, viewCut, likeCut };
}

export function buildFallbackObservations(videos: EvidenceVideo[], config: AiResearchConfig) {
  const { highViews, quiet } = classifyVideos(videos);
  const own = videos.filter((video) => video.relationship === 'own');
  const observations = [];
  if (highViews.length && quiet.length) {
    observations.push({
      category: 'Video Titles',
      headline: 'Titles may not state a specific viewer outcome',
      observation: 'Higher-view titles in this set tend to name a problem, question, or result, while lower-interaction titles stay broader.',
      evidence: `Compared ${highViews.length} higher-view videos with ${quiet.length} videos that have views but few public likes or comments.`,
      implication: 'Clearer titles may be worth testing on existing videos and the next upload.',
      action: 'Draft three more specific titles for one lower-interaction video and monitor public views and likes after the change.',
      video_ids: [...highViews, ...quiet].slice(0, 4).map((video) => video.id),
    });
  }
  const tagged = videos.filter((video) => video.tags.length);
  if (videos.length && tagged.length < videos.length / 2) {
    observations.push({
      category: 'Metadata Quality',
      headline: 'Many imported videos have few public tags',
      observation: 'Public tags are missing or sparse on a large share of the selected library.',
      evidence: `${tagged.length} of ${videos.length} selected videos currently expose public tags in the YouTube Data API.`,
      implication: 'Topic and metadata gaps are harder to judge until tags or research notes are filled in.',
      action: 'Add research topics on the Videos page, then regenerate this analysis.',
      video_ids: videos.filter((video) => !video.tags.length).slice(0, 4).map((video) => video.id),
    });
  }
  if (own.length && config.goals.includes('views')) {
    observations.push({
      category: 'Topic Coverage',
      headline: 'Own-channel topics may be narrower than the selected comparison set',
      observation: 'Own videos cover a smaller set of research topics or title themes than the full selected set.',
      evidence: `${own.length} own-channel videos were included using public Data API fields only.`,
      implication: 'A follow-up video on an uncovered angle may be worth planning. This is not proof of demand.',
      action: 'Pick one uncovered topic from competitor titles and outline a new video, marked as Create New Video.',
      video_ids: own.slice(0, 3).map((video) => video.id),
    });
  }
  if (config.goals.includes('retention') || config.goals.includes('audience')) {
    observations.push({
      category: 'Audience Retention',
      headline: 'Retention and demographics are not in this dataset',
      observation: ANALYTICS_UNAVAILABLE,
      evidence: ANALYTICS_HINT,
      implication: 'Age, geography, and watch-time claims cannot be made from public view, like, and comment counts.',
      action: 'Keep audience fields as desired targets only until an authorized channel is connected.',
      video_ids: [],
    });
  }
  if (observations.length < 2) {
    observations.push({
      category: 'Publishing Activity',
      headline: 'Public counts are the only performance evidence in this run',
      observation: 'This analysis ranks imported videos by public views, likes, and comments.',
      evidence: AI_RESEARCH_NOTICE,
      implication: 'Recommendations should be tested, not treated as a ranking of quality.',
      action: 'Refresh imported videos, then rerun AI Analysis after the next publishing week.',
      video_ids: videos.slice(0, 3).map((video) => video.id),
    });
  }
  return observations.slice(0, 6);
}

export function buildFallbackActions(videos: EvidenceVideo[], config: AiResearchConfig) {
  const { quiet, highViews } = classifyVideos(videos);
  const actions = [];
  const focus = quiet[0] || videos.find((video) => video.relationship === 'own') || videos[0];
  if (focus && config.outputs.includes('improve_existing')) {
    actions.push({
      title: `Rewrite the title for “${focus.title || focus.youtube_video_id}”`,
      category: 'title',
      kind: 'existing',
      priority: 'high',
      description: 'Test a more specific, outcome-led title. YouTube allows title and description edits on an existing upload; the video file itself is not replaced.',
      metric: 'Public views and likes on this video over 14 days',
      review_period: '14 days',
      video_id: focus.id,
    });
    actions.push({
      title: 'Improve the description and public tags',
      category: 'description',
      kind: 'existing',
      priority: 'medium',
      description: 'Add a first-line summary, relevant keywords already present in high-view titles, and a clear next-step for the viewer.',
      metric: 'Public comments and inbound profile visits, if later connected',
      review_period: '14 days',
      video_id: focus.id,
    });
  }
  if (config.outputs.includes('new_ideas')) {
    const example = highViews[0]?.title || 'a higher-view title in this project';
    actions.push({
      title: 'Plan a follow-up video on a more specific angle',
      category: 'content',
      kind: 'new',
      priority: 'medium',
      description: `Use “${example}” as a reference for specificity. Record a new video; do not treat this as replacing an uploaded file.`,
      metric: 'Public views on the new upload after 7 and 28 days',
      review_period: '28 days',
      video_id: highViews[0]?.id || null,
    });
  }
  return actions.slice(0, 8);
}

async function collectEvidence(projectId: string, config: AiResearchConfig) {
  const channels = await listProjectChannels(projectId);
  const own = channels.filter((channel) => channel.relationship === 'own');
  if (config.source === 'own' && !own.length) {
    throw new FinanceValidationError('Add an own channel to this project before analysing own-channel videos.');
  }
  const sourceIds = config.source === 'own'
    ? own.map((channel) => String(channel.id))
    : [];
  const listed = await listProjectVideos({
    projectId,
    channelIds: sourceIds,
    videoIds: config.source === 'selected' ? config.videoIds : [],
    page: 1,
    pageSize: 40,
    includeTotal: false,
    sort: 'view_count',
  });
  const videos = listed.rows.map((row) => compactVideo(row as Record<string, any>, channels));
  if (!videos.length) throw new FinanceValidationError('Import videos into this project before running AI Analysis.');
  return {
    notice: AI_RESEARCH_NOTICE,
    analyticsAvailable: false,
    analyticsMessage: ANALYTICS_UNAVAILABLE,
    analyticsHint: ANALYTICS_HINT,
    channelCount: channels.length,
    ownChannelCount: own.length,
    videos,
    groups: classifyVideos(videos),
  };
}

function fallbackResult(videos: EvidenceVideo[], config: AiResearchConfig) {
  const observations = buildFallbackObservations(videos, config);
  const actions = buildFallbackActions(videos, config);
  const focus = videos.find((video) => video.relationship === 'own') || videos[0];
  const readThumbs = videos.filter((video) => video.thumbnail_text || video.thumbnail_scene);
  const captioned = videos.filter((video) => video.spoken_source === 'captions');
  return {
    summary: {
      headline: 'Public Data API counts can rank videos, but they cannot prove why they performed.',
      body: 'Use the observations below as tests. Desired audience targets are goals, not measured demographics.',
    },
    video_briefs: buildVideoBriefs(videos),
    observations,
    recommendations: actions,
    alternatives: {
      titles: focus ? [
        `${focus.title || 'Topic'}: what patients ask first`,
        `How ${focus.title || 'this treatment'} actually works`,
        `${focus.title || 'Clinic update'} in 60 seconds`,
      ].slice(0, 3) : [],
      thumbnail_concepts: readThumbs.length
        ? [
          { concept: `Keep the on-image words “${readThumbs[0].thumbnail_text || 'one short outcome'}” large and high contrast`, note: 'Based on the thumbnail image reading.' },
          { concept: readThumbs[0].thumbnail_scene ? `Keep this scene: ${readThumbs[0].thumbnail_scene}` : 'One face, one short outcome line', note: 'Based on the thumbnail image reading.' },
        ]
        : [
          { concept: 'One face, one short outcome line, high contrast', note: 'Concept only. The thumbnail image could not be read.' },
          { concept: 'Before/after still with a single readable word', note: 'Concept only. The thumbnail image could not be read.' },
        ],
      description: focus
        ? `In this video we cover ${focus.title || 'the topic'} and what to do next. This draft uses the public title, description${captioned.length ? ', and available captions' : ''}.`
        : '',
      future_ideas: ['A FAQ follow-up on the highest-view topic', 'A short answering the most specific competitor title'],
    },
    limitations: [
      AI_RESEARCH_NOTICE,
      ANALYTICS_UNAVAILABLE,
      readThumbs.length
        ? 'Thumbnail summaries describe the image and any words printed on it. They are not click-through measurements.'
        : 'Thumbnail images could not be read for this run, so image summaries were skipped.',
      captioned.length
        ? 'Spoken content was summarised from public captions when they were available. The video file and audio were not downloaded.'
        : 'The video file and audio were not downloaded. Text summaries use the public title, description, and tags.',
    ],
  };
}

async function runModel(config: AiResearchConfig, evidence: Awaited<ReturnType<typeof collectEvidence>>) {
  const generated = await generateAIChat({
    purpose: 'youtube_research_ai_analysis',
    json: true,
    temperature: 0.25,
    maxTokens: 3200,
    timeoutMs: 50000,
    messages: [
      {
        role: 'system',
        content: `You are a YouTube research analyst for Revealeo. Use only provided public Data API fields.
Rules:
- Never invent watch time, CTR, impressions, retention, demographics, or competitor private analytics.
- Desired audience targets are goals, not measured facts.
- Use may / potentially / worth testing for causal claims.
- Separate Improve Existing Video (title, description, tags, thumbnail concept) from Create New Video.
- Work in this order for every video: (1) thumbnail image using thumbnail_text and thumbnail_scene, (2) then text using title, description, tags, and spoken_text.
- thumbnail_text and thumbnail_scene were read from the thumbnail image. Do not add words that are not in those fields.
- If spoken_source is captions, spoken_text is public caption text. It may contain Telugu, Hindi, and English sections labeled "Telugu:", "Hindi:", and "English:". Summarise every section that is present. Keep short quotes in the original script. Do not translate Telugu away. A language with no section was not on a caption track. Set content_source to captions. If spoken_source is description, only the published description was available. Never claim you watched or transcribed the video file.
- Return JSON only.`,
      },
      {
        role: 'user',
        content: JSON.stringify({
          goals: config.goals,
          content_focus: config.contentFocus,
          desired_audience: {
            age: config.targetAges.length ? config.targetAges : config.targetAge,
            gender: config.targetGenders.length ? config.targetGenders : config.targetGender,
            geography: config.geographies.length ? config.geographies : config.targetGeography,
            language: config.languages,
            interests: config.interests,
            devices: config.devices,
            notes: config.audienceNotes,
            measured: false,
          },
          outputs: config.outputs,
          videos: evidence.videos.map((video) => ({
            id: video.id,
            title: video.title,
            channel: video.channel_name,
            role: video.relationship,
            type: video.content_label,
            topic: video.topic_name,
            published: video.published_at,
            tags: video.tags,
            views: video.view_count,
            likes: video.like_count,
            comments: video.comment_count,
            description: video.description,
            length: video.duration_label,
            thumbnail_text: video.thumbnail_text,
            thumbnail_scene: video.thumbnail_scene,
            spoken_text: video.spoken_text ? String(video.spoken_text).slice(0, 14000) : null,
            spoken_source: video.spoken_source,
          })),
        }),
      },
      {
        role: 'user',
        content: `Return JSON:
{
  "video_briefs": [{ "video_id": "", "thumbnail_summary": "what the thumbnail image shows and any on-image text", "content_summary": "summary of every caption language that is present, or the description when no captions were found", "content_source": "captions|description|null" }],
  "summary": { "headline": "", "body": "" },
  "observations": [{ "category": "", "headline": "", "observation": "", "evidence": "", "implication": "", "action": "", "video_ids": [] }],
  "recommendations": [{ "title": "", "category": "", "kind": "existing|new", "priority": "high|medium|low", "description": "", "metric": "", "review_period": "", "video_id": null }],
  "alternatives": { "titles": [], "thumbnail_concepts": [{ "concept": "", "note": "" }], "description": "", "future_ideas": [] },
  "limitations": []
}
Write one video_brief per video. Limit observations to 6. Limit recommendations to 8.`,
      },
    ],
  });
  const parsed = parseModelJson<Record<string, any>>(generated.text);
  const fallback = fallbackResult(evidence.videos, config);
  const briefsById = new Map(fallback.video_briefs.map((brief) => [brief.video_id, brief]));
  const briefs = Array.isArray(parsed.video_briefs) && parsed.video_briefs.length
    ? parsed.video_briefs.slice(0, 12).map((item: Record<string, unknown>, index: number) => {
      const base = briefsById.get(String(item.video_id || '')) || fallback.video_briefs[index] || fallback.video_briefs[0];
      const contentSource = base?.content_source === 'captions'
        ? 'captions'
        : item.content_source === 'captions' || item.content_source === 'description'
          ? item.content_source
          : base?.content_source || null;
      return {
        video_id: String(item.video_id || base?.video_id || ''),
        title: String(item.title || base?.title || ''),
        thumbnail_url: base?.thumbnail_url || null,
        thumbnail_summary: String(item.thumbnail_summary || base?.thumbnail_summary || ''),
        content_summary: String(item.content_summary || base?.content_summary || ''),
        content_source: contentSource,
        caption_languages: base?.caption_languages || [],
      };
    })
    : fallback.video_briefs;
  return {
    video_briefs: briefs,
    summary: {
      headline: String(parsed.summary?.headline || fallback.summary.headline),
      body: String(parsed.summary?.body || fallback.summary.body),
    },
    observations: Array.isArray(parsed.observations) && parsed.observations.length
      ? parsed.observations.slice(0, 6).map((item: Record<string, unknown>) => ({
        category: String(item.category || 'Content Strategy'),
        headline: String(item.headline || ''),
        observation: String(item.observation || ''),
        evidence: String(item.evidence || ''),
        implication: String(item.implication || ''),
        action: String(item.action || ''),
        video_ids: Array.isArray(item.video_ids) ? item.video_ids.map(String).slice(0, 6) : [],
      }))
      : fallback.observations,
    recommendations: Array.isArray(parsed.recommendations) && parsed.recommendations.length
      ? parsed.recommendations.slice(0, 8).map((item: Record<string, unknown>) => ({
        title: String(item.title || 'Review this video'),
        category: String(item.category || 'content'),
        kind: item.kind === 'new' ? 'new' : 'existing',
        priority: ['high', 'medium', 'low'].includes(String(item.priority)) ? String(item.priority) : 'medium',
        description: String(item.description || ''),
        metric: String(item.metric || 'Public views over 14 days'),
        review_period: String(item.review_period || '14 days'),
        video_id: item.video_id ? String(item.video_id) : null,
      }))
      : fallback.recommendations,
    alternatives: {
      titles: Array.isArray(parsed.alternatives?.titles) ? parsed.alternatives.titles.map(String).slice(0, 3) : fallback.alternatives.titles,
      thumbnail_concepts: Array.isArray(parsed.alternatives?.thumbnail_concepts)
        ? parsed.alternatives.thumbnail_concepts.map((item: Record<string, unknown>) => ({
          concept: String(item.concept || item),
          note: String(item.note || fallback.alternatives.thumbnail_concepts[0]?.note || 'Thumbnail concept.'),
        })).slice(0, 2)
        : fallback.alternatives.thumbnail_concepts,
      description: String(parsed.alternatives?.description || fallback.alternatives.description),
      future_ideas: Array.isArray(parsed.alternatives?.future_ideas) ? parsed.alternatives.future_ideas.map(String).slice(0, 6) : fallback.alternatives.future_ideas,
    },
    limitations: Array.isArray(parsed.limitations) && parsed.limitations.length
      ? parsed.limitations.map(String).slice(0, 8)
      : fallback.limitations,
    provider: generated.provider,
    model: generated.model,
  };
}

function presentAnalysis(row: Record<string, any>) {
  return {
    id: row.id,
    project_id: row.project_id,
    name: row.name,
    status: row.status,
    config: row.config,
    evidence: row.evidence,
    result: row.result,
    limitations: row.limitations,
    provider: row.provider,
    model: row.model,
    error_summary: row.error_summary,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function listAiAnalyses(projectId: string) {
  await assertYoutubeProject(projectId);
  const { rows } = await q(undefined, `SELECT id, project_id, name, status, config, provider, model, created_at, updated_at,
    COALESCE(jsonb_array_length(evidence->'videos'), 0)::int AS video_count,
    (
      SELECT jsonb_agg(jsonb_build_object(
        'id', item->>'id',
        'title', item->>'title',
        'thumbnail_url', item->>'thumbnail_url',
        'channel_id', item->>'channel_id',
        'channel_name', item->>'channel_name',
        'view_count', item->>'view_count',
        'like_count', item->>'like_count',
        'comment_count', item->>'comment_count',
        'published_at', item->>'published_at',
        'relationship', item->>'relationship'
      ))
      FROM jsonb_array_elements(COALESCE(evidence->'videos', '[]'::jsonb)) AS item
    ) AS videos
    FROM youtube_ai_analyses WHERE project_id=$1 ORDER BY created_at DESC LIMIT 100`, [projectId]);
  return rows;
}

export async function getAiAnalysis(projectId: string, id: string) {
  await assertYoutubeProject(projectId);
  const { rows } = await q(undefined, `SELECT * FROM youtube_ai_analyses WHERE project_id=$1 AND id=$2`, [projectId, id]);
  if (!rows[0]) throw new FinanceNotFoundError('Analysis not found');
  const actions = await q(undefined, `SELECT * FROM youtube_ai_actions WHERE analysis_id=$1 ORDER BY created_at`, [id]);
  return { ...presentAnalysis(rows[0]), actions: actions.rows };
}

export async function createAiAnalysis(projectId: string, body: Record<string, unknown>, userId: string) {
  await assertYoutubeProject(projectId);
  const config = parseAiResearchConfig(body);
  const name = cleanText(body.name, 120) || `AI Analysis · ${config.goals.join(', ')}`;
  const inserted = await q(undefined, `INSERT INTO youtube_ai_analyses (project_id, name, status, config, created_by) VALUES ($1,$2,'generating',$3::jsonb,$4) RETURNING id`, [projectId, name, JSON.stringify(config), userId]);
  const id = inserted.rows[0].id;
  try {
    const evidence = await collectEvidence(projectId, config);
    try {
      evidence.videos = await enrichComparisonVideos(evidence.videos, projectId);
    } catch {
      /* Thumbnail reading is best-effort; public fields are still enough to save. */
    }
    try {
      evidence.videos = await enrichSpokenContent(evidence.videos);
    } catch {
      /* Captions are optional; title and description still feed the text summary. */
    }
    let result;
    let provider = null;
    let model = null;
    try {
      result = await runModel(config, evidence);
      provider = result.provider;
      model = result.model;
    } catch {
      result = fallbackResult(evidence.videos, config);
    }
    await q(
      undefined,
      `UPDATE youtube_ai_analyses SET status='ready', evidence=$2::jsonb, result=$3::jsonb, limitations=$4, provider=$5, model=$6, error_summary=NULL, updated_at=NOW() WHERE id=$1`,
      [id, JSON.stringify(evidence), JSON.stringify(result), result.limitations, provider, model]
    );
    for (const item of result.recommendations) {
      await q(
        undefined,
        `INSERT INTO youtube_ai_actions (analysis_id, project_id, video_id, category, title, description, kind, priority, metric, review_period, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [id, projectId, item.video_id, item.category, item.title, item.description, item.kind, item.priority, item.metric, item.review_period, userId]
      );
    }
    await q(undefined, `INSERT INTO youtube_audit_logs (actor_user_id, action, entity_type, entity_id, metadata) VALUES ($1,'YouTube AI Analysis Created','youtube_ai_analysis',$2,$3::jsonb)`, [userId, id, JSON.stringify({ projectId, goals: config.goals })]);
    return getAiAnalysis(projectId, id);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Analysis failed';
    await q(undefined, `UPDATE youtube_ai_analyses SET status='failed', error_summary=$2, updated_at=NOW() WHERE id=$1`, [id, message]);
    throw err;
  }
}

export async function deleteAiAnalysis(projectId: string, id: string, userId: string) {
  await assertYoutubeProject(projectId);
  const { rows } = await q(undefined, `DELETE FROM youtube_ai_analyses WHERE id=$1 AND project_id=$2 RETURNING id`, [id, projectId]);
  if (!rows[0]) throw new FinanceNotFoundError('Summary not found');
  await q(undefined, `INSERT INTO youtube_audit_logs (actor_user_id, action, entity_type, entity_id, metadata) VALUES ($1,'YouTube AI Analysis Deleted','youtube_ai_analysis',$2,$3::jsonb)`, [userId, id, JSON.stringify({ projectId })]);
  return { ok: true };
}

export async function updateAiAction(projectId: string, actionId: string, body: Record<string, unknown>, userId: string) {
  await assertYoutubeProject(projectId);
  const status = String(body.status || '');
  if (!ACTION_STATUSES.includes(status as (typeof ACTION_STATUSES)[number])) {
    throw new FinanceValidationError('Choose a supported action status.');
  }
  const { rows } = await q(undefined, `UPDATE youtube_ai_actions SET status=$3, evidence_notes=COALESCE($4, evidence_notes), updated_at=NOW() WHERE id=$1 AND project_id=$2 RETURNING *`, [actionId, projectId, status, body.evidence_notes != null ? String(body.evidence_notes) : null]);
  if (!rows[0]) throw new FinanceNotFoundError('Action not found');
  await q(undefined, `INSERT INTO youtube_audit_logs (actor_user_id, action, entity_type, entity_id, metadata) VALUES ($1,'YouTube AI Action Updated','youtube_ai_action',$2,$3::jsonb)`, [userId, actionId, JSON.stringify({ status })]);
  return rows[0];
}

export async function listResearchReports(projectId: string) {
  await assertYoutubeProject(projectId);
  const { rows } = await q(undefined, `SELECT id, project_id, analysis_id, name, report_type, status, generated_by, generated_at, archived_at FROM youtube_research_reports WHERE project_id=$1 AND status <> 'archived' ORDER BY generated_at DESC LIMIT 50`, [projectId]);
  return rows;
}

export async function createResearchReport(projectId: string, body: Record<string, unknown>, userId: string) {
  await assertYoutubeProject(projectId);
  const typeRaw = String(body.report_type || body.reportType || 'executive');
  const reportType = REPORT_TYPES.some((item) => item.id === typeRaw) ? typeRaw : 'executive';
  const analysisId = String(body.analysis_id || body.analysisId || '');
  if (!analysisId) throw new FinanceValidationError('Generate or choose an AI Analysis before creating a report.');
  const analysis = await getAiAnalysis(projectId, analysisId);
  const name = cleanText(body.name, 120) || `${REPORT_TYPES.find((item) => item.id === reportType)?.label} · ${new Date().toISOString().slice(0, 10)}`;
  const payload = {
    reportType,
    analysis: {
      id: analysis.id,
      name: analysis.name,
      config: analysis.config,
      result: analysis.result,
      limitations: analysis.limitations,
    },
    evidence: analysis.evidence,
    actions: analysis.actions,
    notice: AI_RESEARCH_NOTICE,
  };
  const { rows } = await q(
    undefined,
    `INSERT INTO youtube_research_reports (project_id, analysis_id, name, report_type, status, payload, generated_by) VALUES ($1,$2,$3,$4,'ready',$5::jsonb,$6) RETURNING *`,
    [projectId, analysisId, name, reportType, JSON.stringify(payload), userId]
  );
  await q(undefined, `INSERT INTO youtube_audit_logs (actor_user_id, action, entity_type, entity_id, metadata) VALUES ($1,'YouTube Research Report Created','youtube_research_report',$2,$3::jsonb)`, [userId, rows[0].id, JSON.stringify({ reportType })]);
  return rows[0];
}

export async function archiveResearchReport(projectId: string, id: string, userId: string) {
  await assertYoutubeProject(projectId);
  const { rows } = await q(undefined, `UPDATE youtube_research_reports SET status='archived', archived_at=NOW() WHERE id=$1 AND project_id=$2 RETURNING id`, [id, projectId]);
  if (!rows[0]) throw new FinanceNotFoundError('Report not found');
  await q(undefined, `INSERT INTO youtube_audit_logs (actor_user_id, action, entity_type, entity_id, metadata) VALUES ($1,'YouTube Research Report Archived','youtube_research_report',$2,'{}'::jsonb)`, [userId, id]);
  return { ok: true };
}

export async function deleteResearchReport(projectId: string, id: string, userId: string) {
  await assertYoutubeProject(projectId);
  const { rows } = await q(undefined, `DELETE FROM youtube_research_reports WHERE id=$1 AND project_id=$2 RETURNING id`, [id, projectId]);
  if (!rows[0]) throw new FinanceNotFoundError('Report not found');
  await q(undefined, `INSERT INTO youtube_audit_logs (actor_user_id, action, entity_type, entity_id, metadata) VALUES ($1,'YouTube Research Report Deleted','youtube_research_report',$2,$3::jsonb)`, [userId, id, JSON.stringify({ projectId })]);
  return { ok: true };
}

export async function getResearchReport(projectId: string, id: string) {
  await assertYoutubeProject(projectId);
  const { rows } = await q(undefined, `SELECT * FROM youtube_research_reports WHERE project_id=$1 AND id=$2`, [projectId, id]);
  if (!rows[0]) throw new FinanceNotFoundError('Report not found');
  const report = rows[0];
  const payload = report.payload || {};
  let videos = payload.evidence?.videos || [];
  if (!videos.length && report.analysis_id) {
    const analysis = await getAiAnalysis(projectId, report.analysis_id);
    videos = analysis.evidence?.videos || [];
  }
  if (videos.length) {
    try {
      const enriched = await enrichComparisonVideos(videos, projectId);
      payload.evidence = { ...(payload.evidence || {}), videos: enriched };
      report.payload = payload;
      if (JSON.stringify(enriched) !== JSON.stringify(videos)) {
        await q(undefined, `UPDATE youtube_research_reports SET payload=$3::jsonb WHERE project_id=$1 AND id=$2`, [projectId, id, JSON.stringify(payload)]);
      }
    } catch {
      payload.evidence = { ...(payload.evidence || {}), videos };
      report.payload = payload;
    }
  }
  return report;
}
