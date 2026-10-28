import { generateAIChat } from '../ai/gateway';
import { enabledTrainingText, YOUTUBE_MASTER_SYSTEM } from './youtube-master';
import { parseModelJson } from '../ai/json';
import { q } from '../finance/db';
import { FinanceNotFoundError, FinanceValidationError } from '../finance/errors';
import { listProjectChannels, listProjectVideos } from './projects';
import { enrichComparisonVideos } from './thumbnail-read';
import { captionLanguageNames, enrichSpokenContent } from './video-content';
import { assertYoutubeProject, currentSaasAccountId, currentYoutubePartnerId } from './scope';
import { lengthLabel, parseTags, YOUTUBE_METRIC_NOTICE, youtubeThumbUrl } from './parse';

export const ANALYTICS_UNAVAILABLE = 'Not available through the current YouTube integration.';
export const ANALYTICS_HINT = 'Connect an authorized YouTube channel for additional audience insights.';
export const AI_RESEARCH_NOTICE =
  `${YOUTUBE_METRIC_NOTICE} AI recommendations use those public fields plus your selected goals. They are hypotheses to test, not guarantees. Audience targets are desired goals unless authorized YouTube Analytics is connected.`;

export const IMPROVEMENT_GOALS = [
  { id: 'views', label: 'Increase Views', group: 'reach' },
  { id: 'ctr', label: 'Improve CTR', group: 'reach' },
  { id: 'retention', label: 'Improve Retention', group: 'audience' },
  { id: 'engagement', label: 'Increase Engagement', group: 'engagement' },
  { id: 'subscribers', label: 'Grow Subscribers', group: 'audience' },
  { id: 'discoverability', label: 'Improve Search Visibility', group: 'reach' },
  { id: 'competitors', label: 'Analyze Competitors', group: 'research' },
  { id: 'publishing', label: 'Improve Publishing Strategy', group: 'operations' },
  { id: 'likes', label: 'Increase Likes', group: 'engagement' },
  { id: 'comments', label: 'More Comments', group: 'engagement' },
  { id: 'audience', label: 'Audience', group: 'audience' },
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
  primaryGoal: ImprovementGoal;
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
  category_id: string | null;
  default_language: string | null;
  default_audio_language: string | null;
  public_details: Record<string, unknown>;
  view_count: number | null;
  like_count: number | null;
  comment_count: number | null;
  watch_url: string | null;
  thumbnail_url: string | null;
  channel_thumbnail_url: string | null;
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
  const allowed = IMPROVEMENT_GOALS.map((item) => item.id);
  const selected = uniqueIds(body.goals, allowed) as ImprovementGoal[];
  if (!selected.length) throw new FinanceValidationError('Select at least one improvement goal.');
  const primaryRaw = String(body.primaryGoal || body.primary_goal || selected[0]);
  const primaryGoal = (allowed.includes(primaryRaw) ? primaryRaw : selected[0]) as ImprovementGoal;
  const goals = selected.includes(primaryGoal) ? [primaryGoal, ...selected.filter((item) => item !== primaryGoal)] : [primaryGoal, ...selected];
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
    primaryGoal,
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

function compactVideo(row: Record<string, any>, channels: { id: string; youtube_channel_id?: string; channel_handle?: string | null; subscriber_count?: number | null; thumbnail_url?: string | null }[] = []): EvidenceVideo {
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
    tags: parseTags(row.tags),
    category_id: row.category_id || null,
    default_language: row.default_language || null,
    default_audio_language: row.default_audio_language || null,
    public_details: row.public_details && typeof row.public_details === 'object' ? row.public_details : {},
    view_count: row.view_count == null ? null : Number(row.view_count),
    like_count: row.like_count == null ? null : Number(row.like_count),
    comment_count: row.comment_count == null ? null : Number(row.comment_count),
    watch_url: row.watch_url || null,
    thumbnail_url: youtubeThumbUrl(row.youtube_video_id, row.thumbnail_url) || null,
    channel_thumbnail_url: channel?.thumbnail_url || row.channel_thumbnail_url || null,
    thumbnail_caption: row.thumbnail_caption || null,
    description: row.description ? String(row.description).slice(0, 5000) : null,
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

function goalCoachName(id: string) {
  return IMPROVEMENT_GOALS.find((item) => item.id === id)?.label || id;
}

function metricForGoal(goal: string) {
  if (goal === 'likes') return 'like_count' as const;
  if (goal === 'comments') return 'comment_count' as const;
  return 'view_count' as const;
}

export function buildFallbackGuides(videos: EvidenceVideo[], config: AiResearchConfig) {
  const guides: Record<string, unknown>[] = [];
  for (const goal of config.goals) {
    const key = metricForGoal(goal);
    const ranked = [...videos].sort((a, b) => Number(b[key] || 0) - Number(a[key] || 0));
    const leader = ranked[0];
    for (const video of videos) {
      const ownValue = Number(video[key] || 0);
      const leadValue = Number(leader?.[key] || 0);
      const behind = leader && String(leader.id) !== String(video.id) && ownValue < leadValue;
      const tags = video.tags || [];
      const leaderTags = leader?.tags || [];
      const missingTags = leaderTags.filter((tag) => !tags.some((item) => item.toLowerCase() === tag.toLowerCase())).slice(0, 8);
      const steps = goal === 'views'
        ? [
          { title: 'See why this video is behind on views', detail: behind
            ? `${leader?.title || 'The leading video'} has ${leadValue.toLocaleString('en-IN')} public views. This video has ${ownValue.toLocaleString('en-IN')}. YouTube does not give CTR here, so treat packaging as the first test: title, thumbnail words, and tags.`
            : `This video currently leads this set on public views (${ownValue.toLocaleString('en-IN')}). Protect the promise in the title and thumbnail, then copy what is working onto weaker videos.` },
          { title: 'Rewrite the title as one clear promise', detail: `Keep the topic, but name the outcome a viewer wants. Compare against “${leader?.title || 'the leading title'}”. Put the searchable phrase near the front.` },
          { title: 'Match the thumbnail to that same promise', detail: video.thumbnail_text
            ? `On-image words now: “${video.thumbnail_text}”. Use 1–3 high-contrast words that repeat the new title promise.`
            : 'Use one face or object and 1–3 high-contrast words that repeat the title promise.' },
          { title: 'Fix the first line of the description and the public tags', detail: missingTags.length
            ? `Add topical tags the stronger video already uses, such as: ${missingTags.join(', ')}. First line of the description should restate the title.`
            : 'Restate the title in the first description line. Add 5–12 topical tags, not repeats of the whole title.' },
          { title: 'Ask for one action in the first comment', detail: 'Pin a comment that continues the topic. Public comments are the only conversation signal in this dataset.' },
        ]
        : [
          { title: `Diagnose ${goalCoachName(goal).toLowerCase()} from public counts`, detail: behind
            ? `This video is behind “${leader?.title || 'the leader'}” on ${goalCoachName(goal).toLowerCase()} (${ownValue.toLocaleString('en-IN')} vs ${leadValue.toLocaleString('en-IN')}).`
            : `This video is the current leader in this set on ${goalCoachName(goal).toLowerCase()}.` },
          { title: 'Change one packaging element this week', detail: 'Edit title or thumbnail so the click promise is obvious. Do not change the video file.' },
          { title: 'Tell viewers what to do next', detail: goal === 'comments'
            ? 'Ask one specific question on-screen and in the description. Pin a reply that invites a second comment.'
            : 'Ask for the next public action that fits the video. Keep it to one request.' },
          { title: 'Reuse tags and phrasing from the stronger video', detail: missingTags.length
            ? `Consider these public tags from the stronger video: ${missingTags.join(', ')}.`
            : 'Keep tags topical. YouTube hides tags that the owner never published.' },
        ];
      guides.push({
        goal,
        video_id: video.id,
        diagnosis: behind
          ? `This video has fewer public ${goal === 'likes' ? 'likes' : goal === 'comments' ? 'comments' : 'views'} than “${leader?.title}”. Use the steps below as a Hookooh checklist, not a report.`
          : `This video is the reference in this set for ${goalCoachName(goal).toLowerCase()}. Use it as the pattern for the others.`,
        steps,
      });
    }
  }
  return guides.slice(0, 16);
}

function buildFallbackReport(videos: EvidenceVideo[], config: AiResearchConfig) {
  const goal = goalCoachName(config.primaryGoal);
  const ranked = [...videos].sort((a, b) => Number(b.view_count || 0) - Number(a.view_count || 0));
  const leader = ranked[0];
  const weaker = ranked[ranked.length - 1];
  return {
    selected_goal: goal,
    overall_assessment: `Primary goal is ${goal}. Public Data API counts can rank these videos, but CTR, retention, and traffic are not in this payload.`,
    findings: [
      { title: 'Public view gap', detail: leader && weaker ? `“${leader.title}” has ${Number(leader.view_count || 0).toLocaleString('en-IN')} public views vs “${weaker.title}” at ${Number(weaker.view_count || 0).toLocaleString('en-IN')}.` : 'Compare public views in this set.', evidence: 'YouTube Data API viewCount' },
      { title: 'Analytics not connected', detail: 'CTR, impressions, and retention curves are unavailable for competitor research unless authorized Analytics is supplied.', evidence: ANALYTICS_UNAVAILABLE },
    ],
    working: leader ? [`Highest public views in this set: “${leader.title}”. Preserve that topic and packaging pattern.`] : [],
    improve: weaker ? [`“${weaker.title}” lags on public views. Test a clearer title/thumbnail promise before adding SEO volume.`] : [],
    actions: buildFallbackActions(videos, config).slice(0, 5).map((item, index) => ({
      priority: index === 0 ? 'P1' : 'P2',
      title: item.title,
      problem: `Public performance on ${goal} is uneven in this set.`,
      evidence: item.description,
      why: 'Tied to the selected goal using public counts and packaging only.',
      change: item.title,
      how: item.description,
      metric: item.metric,
      review_period: item.review_period,
      confidence: 'moderate',
      video_id: item.video_id,
    })),
    creative: { titles: [], thumbnails: [], hooks: [], structure: [], seo: [], cta: [] },
    competitor_learnings: videos.some((video) => video.relationship === 'competitor')
      ? ['Use competitor public titles and thumbnail OCR as patterns to test, not assets to copy.']
      : [],
    success: config.primaryGoal === 'ctr'
      ? 'CTR needs authorized impressions. Until then, monitor public views after a packaging test.'
      : config.primaryGoal === 'retention'
        ? 'Retention needs authorized Analytics. Until then, treat opening/structure changes as hypotheses.'
        : 'Monitor public views, likes, and comments over 14 days against similar-age videos.',
    confidence: 'Moderate for public-count comparisons. Low for causal claims.',
    limitations: [AI_RESEARCH_NOTICE],
  };
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
    guides: buildFallbackGuides(videos, config),
    report: buildFallbackReport(videos, config),
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
  const playbook = await enabledTrainingText(config.goals).catch(() => '');
  const generated = await generateAIChat({
    purpose: 'youtube_research_ai_analysis',
    json: true,
    temperature: 0.25,
    maxTokens: 5000,
    timeoutMs: 50000,
    messages: [
      {
        role: 'system',
        content: `${YOUTUBE_MASTER_SYSTEM}

You are running a goal-driven video analysis. Apply the youtube_master_playbook modules that match primary_goal. Secondary goals are optional extras, not a new report.
Rules:
- Never invent CTR, impressions, retention, watch time, traffic sources, demographics, or competitor private analytics.
- If the primary goal needs a missing metric (CTR, retention, subscribers gained), say it is unavailable and diagnose with public evidence plus playbook hypotheses.
- Cover ONLY selected goals. Route diagnosis: views → demand/packaging/discovery; CTR → packaging; retention → hook/pacing/structure; engagement → comments/CTA; subscribers → reason to return; discoverability → intent/SEO; competitors → public patterns; publishing → readiness/cadence.
- Max five recommended_actions (P1/P2/P3). Each needs problem, evidence, why, change, how, metric, review_period, confidence.
- Per weaker video, write a numbered how-to for the primary goal (why it lagged, then what to do this week).
- thumbnail_text and thumbnail_scene are OCR/image readings. Do not invent extra on-image words.
- Captions: summarise every labeled language section. Never claim you watched the file.
- Return JSON only.`,
      },
      {
        role: 'user',
        content: JSON.stringify({
          primary_goal: config.primaryGoal,
          secondary_goals: config.goals.filter((item) => item !== config.primaryGoal),
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
          youtube_master_playbook: playbook,
          selected_goals_only: config.goals,
          videos: evidence.videos.map((video) => ({
            id: video.id,
            title: video.title,
            channel: video.channel_name,
            role: video.relationship,
            type: video.content_label,
            topic: video.topic_name,
            published: video.published_at,
            tags: video.tags,
            category_id: video.category_id,
            language: video.default_language || video.default_audio_language,
            public_details: video.public_details,
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
  "video_briefs": [{ "video_id": "", "thumbnail_summary": "", "content_summary": "", "content_source": "captions|description|null" }],
  "summary": { "headline": "selected-goal coaching headline", "body": "overall assessment in two sentences" },
  "report": {
    "selected_goal": "",
    "overall_assessment": "",
    "findings": [{ "title": "", "detail": "", "evidence": "" }],
    "working": [""],
    "improve": [""],
    "actions": [{ "priority": "P1|P2|P3", "title": "", "problem": "", "evidence": "", "why": "", "change": "", "how": "", "metric": "", "review_period": "", "confidence": "low|moderate|high", "video_id": null }],
    "creative": { "titles": [], "thumbnails": [], "hooks": [], "structure": [], "seo": [], "cta": [] },
    "competitor_learnings": [""],
    "success": "",
    "confidence": "",
    "limitations": []
  },
  "guides": [{ "goal": "", "video_id": "", "diagnosis": "", "steps": [{ "title": "", "detail": "" }] }],
  "observations": [],
  "recommendations": [{ "title": "", "category": "", "kind": "existing|new", "priority": "high|medium|low", "description": "", "metric": "", "review_period": "", "video_id": null }],
  "alternatives": { "titles": [], "thumbnail_concepts": [{ "concept": "", "note": "" }], "description": "", "future_ideas": [] },
  "limitations": []
}
One brief per video. Report follows the playbook output format. Max 5 findings and 5 actions. Guides: one numbered how-to per weaker video for the primary goal.`,
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
    report: parsed.report && typeof parsed.report === 'object' ? {
      selected_goal: String(parsed.report.selected_goal || fallback.report.selected_goal),
      overall_assessment: String(parsed.report.overall_assessment || fallback.report.overall_assessment),
      findings: Array.isArray(parsed.report.findings) ? parsed.report.findings.slice(0, 5).map((item: Record<string, unknown>) => ({
        title: String(item.title || ''),
        detail: String(item.detail || item.observation || ''),
        evidence: String(item.evidence || ''),
      })) : fallback.report.findings,
      working: Array.isArray(parsed.report.working) ? parsed.report.working.map(String).slice(0, 5) : fallback.report.working,
      improve: Array.isArray(parsed.report.improve) ? parsed.report.improve.map(String).slice(0, 5) : fallback.report.improve,
      actions: Array.isArray(parsed.report.actions) ? parsed.report.actions.slice(0, 5).map((item: Record<string, unknown>) => ({
        priority: ['P1', 'P2', 'P3'].includes(String(item.priority)) ? String(item.priority) : 'P2',
        title: String(item.title || item.change || 'Recommended change'),
        problem: String(item.problem || ''),
        evidence: String(item.evidence || ''),
        why: String(item.why || ''),
        change: String(item.change || item.title || ''),
        how: String(item.how || item.description || ''),
        metric: String(item.metric || ''),
        review_period: String(item.review_period || '14 days'),
        confidence: String(item.confidence || 'moderate'),
        video_id: item.video_id ? String(item.video_id) : null,
      })) : fallback.report.actions,
      creative: {
        titles: Array.isArray(parsed.report.creative?.titles) ? parsed.report.creative.titles.map(String).slice(0, 3) : [],
        thumbnails: Array.isArray(parsed.report.creative?.thumbnails) ? parsed.report.creative.thumbnails.map(String).slice(0, 3) : [],
        hooks: Array.isArray(parsed.report.creative?.hooks) ? parsed.report.creative.hooks.map(String).slice(0, 3) : [],
        structure: Array.isArray(parsed.report.creative?.structure) ? parsed.report.creative.structure.map(String).slice(0, 3) : [],
        seo: Array.isArray(parsed.report.creative?.seo) ? parsed.report.creative.seo.map(String).slice(0, 3) : [],
        cta: Array.isArray(parsed.report.creative?.cta) ? parsed.report.creative.cta.map(String).slice(0, 3) : [],
      },
      competitor_learnings: Array.isArray(parsed.report.competitor_learnings) ? parsed.report.competitor_learnings.map(String).slice(0, 5) : fallback.report.competitor_learnings,
      success: String(parsed.report.success || fallback.report.success),
      confidence: String(parsed.report.confidence || fallback.report.confidence),
      limitations: Array.isArray(parsed.report.limitations) ? parsed.report.limitations.map(String).slice(0, 6) : fallback.report.limitations,
    } : fallback.report,
    guides: Array.isArray(parsed.guides) && parsed.guides.length
      ? parsed.guides.slice(0, 16).map((item: Record<string, unknown>) => ({
        goal: String(item.goal || config.goals[0] || 'views'),
        video_id: String(item.video_id || ''),
        diagnosis: String(item.diagnosis || ''),
        steps: Array.isArray(item.steps)
          ? item.steps.slice(0, 8).map((step: Record<string, unknown> | string) => (
            typeof step === 'string'
              ? { title: step, detail: '' }
              : { title: String(step.title || step.do || 'Next step'), detail: String(step.detail || step.why || '') }
          ))
          : [],
      }))
      : fallback.guides,
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
        'youtube_video_id', item->>'youtube_video_id',
        'channel_id', item->>'channel_id',
        'channel_name', item->>'channel_name',
        'channel_thumbnail_url', item->>'channel_thumbnail_url',
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
  const presented = presentAnalysis(rows[0]);
  const videos = Array.isArray(presented.evidence?.videos) ? presented.evidence.videos : [];
  const ids = videos.map((video: { id?: string }) => video.id).filter(Boolean);
  if (ids.length) {
    const named = await q<{
      id: string;
      channel_name: string | null;
      channel_handle: string | null;
      channel_thumbnail_url: string | null;
      subscriber_count: string | number | null;
      relationship: string | null;
      title: string | null;
      youtube_video_id: string | null;
      thumbnail_text: string | null;
      thumbnail_scene: string | null;
      thumbnail_url: string | null;
      tags: string[] | null;
      description: string | null;
      category_id: string | null;
      default_language: string | null;
      default_audio_language: string | null;
      public_details: Record<string, unknown> | null;
      country: string | null;
      channel_public_details: Record<string, unknown> | null;
    }>(
      undefined,
      `SELECT v.id::text, v.title, v.youtube_video_id, v.thumbnail_text, v.thumbnail_scene, v.thumbnail_url,
              v.tags, v.description, v.category_id, v.default_language, v.default_audio_language, v.public_details,
              c.channel_name, c.channel_handle, c.thumbnail_url AS channel_thumbnail_url,
              c.subscriber_count, c.country, c.public_details AS channel_public_details, pc.relationship
       FROM youtube_videos v
       JOIN youtube_channels c ON c.id = v.channel_id
       LEFT JOIN youtube_project_channels pc ON pc.channel_id = c.id AND pc.project_id = $1
       WHERE v.id = ANY($2::uuid[])`,
      [projectId, ids]
    ).catch(async () => q<any>(
      undefined,
      `SELECT v.id::text, v.title, v.youtube_video_id, v.thumbnail_text, v.thumbnail_scene, v.thumbnail_url,
              v.tags, v.description, v.category_id, v.default_language, v.default_audio_language,
              c.channel_name, c.channel_handle, c.thumbnail_url AS channel_thumbnail_url,
              c.subscriber_count, pc.relationship
       FROM youtube_videos v
       JOIN youtube_channels c ON c.id = v.channel_id
       LEFT JOIN youtube_project_channels pc ON pc.channel_id = c.id AND pc.project_id = $1
       WHERE v.id = ANY($2::uuid[])`,
      [projectId, ids]
    ).catch(() => ({ rows: [] as any[] })));
    const byId = new Map(named.rows.map((row) => [row.id, row]));
    presented.evidence = {
      ...presented.evidence,
      videos: videos.map((video: Record<string, any>) => {
        const row = byId.get(String(video.id));
        if (!row) return video;
        return {
          ...video,
          title: video.title || row.title,
          youtube_video_id: video.youtube_video_id || row.youtube_video_id,
          channel_name: video.channel_name || row.channel_name,
          channel_handle: video.channel_handle || row.channel_handle,
          channel_thumbnail_url: video.channel_thumbnail_url || row.channel_thumbnail_url,
          subscriber_count: video.subscriber_count ?? row.subscriber_count,
          relationship: video.relationship || row.relationship,
          thumbnail_text: video.thumbnail_text || row.thumbnail_text,
          thumbnail_scene: video.thumbnail_scene || row.thumbnail_scene,
          thumbnail_url: video.thumbnail_url || row.thumbnail_url,
          tags: parseTags(row.tags).length >= parseTags(video.tags).length ? parseTags(row.tags) : parseTags(video.tags),
          description: (row.description && String(row.description).length > String(video.description || '').length)
            ? String(row.description).slice(0, 5000)
            : video.description || row.description || null,
          category_id: video.category_id || row.category_id,
          default_language: video.default_language || row.default_language,
          default_audio_language: video.default_audio_language || row.default_audio_language,
          public_details: { ...(row.public_details || {}), ...(video.public_details || {}) },
          country: video.country || row.country,
          channel_public_details: row.channel_public_details || video.channel_public_details || {},
        };
      }),
    };
  }
  return { ...presented, actions: actions.rows };
}

async function gatherEvidence(projectId: string, config: AiResearchConfig) {
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
  return evidence;
}

export async function createAiAnalysis(projectId: string, body: Record<string, unknown>, userId: string) {
  await assertYoutubeProject(projectId);
  const config = parseAiResearchConfig(body);
  const compareOnly = body.mode === 'compare' || body.skipAi === true;
  const name = cleanText(body.name, 120) || (compareOnly ? 'Video comparison' : `AI Analysis · ${config.goals.join(', ')}`);
  const inserted = await q(undefined, `INSERT INTO youtube_ai_analyses (project_id, name, status, config, created_by) VALUES ($1,$2,'generating',$3::jsonb,$4) RETURNING id`, [projectId, name, JSON.stringify({ ...config, mode: compareOnly ? 'compare' : 'insights', workspace: String(body.workspace || '') }), userId]);
  const id = inserted.rows[0].id;
  try {
    const evidence = await gatherEvidence(projectId, config);
    let result: Record<string, any> = { video_briefs: [], observations: [], recommendations: [], insights: null };
    let provider = null;
    let model = null;
    if (!compareOnly) {
      try {
        result = await runModel(config, evidence);
        provider = result.provider;
        model = result.model;
      } catch {
        result = fallbackResult(evidence.videos, config);
      }
    }
    await q(
      undefined,
      `UPDATE youtube_ai_analyses SET status='ready', evidence=$2::jsonb, result=$3::jsonb, limitations=$4, provider=$5, model=$6, error_summary=NULL, updated_at=NOW() WHERE id=$1`,
      [id, JSON.stringify(evidence), JSON.stringify(result), result.limitations || null, provider, model]
    );
    if (!compareOnly) {
      for (const item of result.recommendations || []) {
        await q(
          undefined,
          `INSERT INTO youtube_ai_actions (analysis_id, project_id, video_id, category, title, description, kind, priority, metric, review_period, created_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [id, projectId, item.video_id, item.category, item.title, item.description, item.kind, item.priority, item.metric, item.review_period, userId]
        );
      }
    }
    await q(undefined, `INSERT INTO youtube_audit_logs (actor_user_id, action, entity_type, entity_id, metadata) VALUES ($1,'YouTube AI Analysis Created','youtube_ai_analysis',$2,$3::jsonb)`, [userId, id, JSON.stringify({ projectId, goals: config.goals, mode: compareOnly ? 'compare' : 'insights' })]);
    return getAiAnalysis(projectId, id);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Analysis failed';
    await q(undefined, `UPDATE youtube_ai_analyses SET status='failed', error_summary=$2, updated_at=NOW() WHERE id=$1`, [id, message]);
    throw err;
  }
}

export async function generateAiInsights(projectId: string, analysisId: string, body: Record<string, unknown>, userId: string) {
  await assertYoutubeProject(projectId);
  const existing = await getAiAnalysis(projectId, analysisId);
  const config = parseAiResearchConfig({ ...(existing.config || {}), ...body, source: 'selected', videoIds: body.videoIds || existing.config?.videoIds });
  await q(undefined, `UPDATE youtube_ai_analyses SET status='generating', config=$2::jsonb, updated_at=NOW() WHERE id=$1`, [analysisId, JSON.stringify({ ...config, mode: 'insights' })]);
  try {
    const evidence = existing.evidence?.videos?.length ? existing.evidence : await gatherEvidence(projectId, config);
    let result;
    let provider = null;
    let model = null;
    try {
      result = await runModel(config, evidence);
      provider = result.provider;
      model = result.model;
    } catch {
      result = fallbackResult(evidence.videos || [], config);
    }
    const merged = { ...(existing.result || {}), ...result, insights: result };
    await q(
      undefined,
      `UPDATE youtube_ai_analyses SET status='ready', result=$2::jsonb, provider=$3, model=$4, error_summary=NULL, updated_at=NOW() WHERE id=$1`,
      [analysisId, JSON.stringify(merged), provider, model]
    );
    await q(undefined, `DELETE FROM youtube_ai_actions WHERE analysis_id=$1`, [analysisId]);
    for (const item of result.recommendations || []) {
      await q(
        undefined,
        `INSERT INTO youtube_ai_actions (analysis_id, project_id, video_id, category, title, description, kind, priority, metric, review_period, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [analysisId, projectId, item.video_id, item.category, item.title, item.description, item.kind, item.priority, item.metric, item.review_period, userId]
      );
    }
    return getAiAnalysis(projectId, analysisId);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Insights failed';
    await q(undefined, `UPDATE youtube_ai_analyses SET status='ready', error_summary=$2, updated_at=NOW() WHERE id=$1`, [analysisId, message]);
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
  const { rows } = await q(
    undefined,
    `SELECT r.id, r.project_id, r.analysis_id, r.name, r.report_type, r.status, r.generated_by, r.generated_at, r.archived_at,
            COALESCE(jsonb_array_length(r.payload->'evidence'->'videos'), 0)::int AS video_count,
            COALESCE((
              SELECT COUNT(DISTINCT COALESCE(item->>'channel_id', item->>'channel_name'))::int
              FROM jsonb_array_elements(COALESCE(r.payload->'evidence'->'videos', '[]'::jsonb)) item
            ), 0) AS channel_count,
            COALESCE(NULLIF(r.payload->'analysis'->>'name', ''), a.name) AS analysis_name
     FROM youtube_research_reports r
     LEFT JOIN youtube_ai_analyses a ON a.id = r.analysis_id
     WHERE r.project_id=$1
     ORDER BY r.generated_at DESC
     LIMIT 80`,
    [projectId]
  );
  return rows;
}

export async function createResearchReport(projectId: string, body: Record<string, unknown>, userId: string) {
  await assertYoutubeProject(projectId);
  const typeRaw = String(body.report_type || body.reportType || 'executive');
  const reportType = REPORT_TYPES.some((item) => item.id === typeRaw) ? typeRaw : 'executive';
  const analysisId = String(body.analysis_id || body.analysisId || '');
  const videoIds = Array.isArray(body.videoIds) ? [...new Set(body.videoIds.map(String).filter(Boolean))].slice(0, 40) : [];
  if (!analysisId && videoIds.length) {
    const channels = await listProjectChannels(projectId);
    const listed = await listProjectVideos({
      projectId,
      videoIds,
      page: 1,
      pageSize: 40,
      includeTotal: false,
      sort: 'view_count',
    });
    const videos = listed.rows.map((row) => compactVideo(row as Record<string, any>, channels));
    if (!videos.length) throw new FinanceValidationError('Select videos that belong to this project.');
    const name = cleanText(body.name, 120) || `Selected videos · ${videos.length} · ${new Date().toISOString().slice(0, 10)}`;
    const payload = {
      reportType,
      mode: 'selected_snapshot',
      workspace: String(body.workspace || ''),
      analysis: null,
      evidence: { videos },
      actions: [],
      notice: `${AI_RESEARCH_NOTICE} This report is a snapshot of the selected videos. It is not a comparison analysis.`,
    };
    const { rows } = await q(
      undefined,
      `INSERT INTO youtube_research_reports (project_id, analysis_id, name, report_type, status, payload, generated_by) VALUES ($1,NULL,$2,$3,'ready',$4::jsonb,$5) RETURNING *`,
      [projectId, name, reportType, JSON.stringify(payload), userId]
    );
    await q(undefined, `INSERT INTO youtube_audit_logs (actor_user_id, action, entity_type, entity_id, metadata) VALUES ($1,'YouTube Research Report Created','youtube_research_report',$2,$3::jsonb)`, [userId, rows[0].id, JSON.stringify({ reportType, mode: 'selected_snapshot', videoCount: videos.length })]);
    return rows[0];
  }
  if (!analysisId) throw new FinanceValidationError('Select videos on Research, or choose a saved comparison, before creating a report.');
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

function accountProjectFilter(values: unknown[]) {
  const saasId = currentSaasAccountId();
  const partnerId = currentYoutubePartnerId();
  if (saasId) {
    values.push(saasId);
    return `p.saas_account_id=$${values.length}`;
  }
  if (partnerId) {
    values.push(partnerId);
    return `p.partner_id=$${values.length}`;
  }
  return 'p.partner_id IS NULL AND p.saas_account_id IS NULL';
}

function trend(current: number, previous: number) {
  if (!previous && !current) return 0;
  if (!previous) return 100;
  return Math.round(((current - previous) / previous) * 100);
}

export async function listQuickAnalyses() {
  const values: unknown[] = [];
  const scope = accountProjectFilter(values);
  const { rows } = await q<Record<string, any>>(
    undefined,
    `SELECT a.id, a.project_id, a.name, a.status, a.created_at::text, a.updated_at::text, a.config, a.error_summary,
            COALESCE(jsonb_array_length(a.evidence->'videos'), 0)::int AS video_count,
            (
              SELECT jsonb_agg(jsonb_build_object(
                'title', item->>'title',
                'thumbnail_url', item->>'thumbnail_url',
                'youtube_video_id', item->>'youtube_video_id',
                'channel_name', item->>'channel_name',
                'channel_thumbnail_url', item->>'channel_thumbnail_url'
              ))
              FROM jsonb_array_elements(COALESCE(a.evidence->'videos', '[]'::jsonb)) AS item
            ) AS videos
     FROM youtube_ai_analyses a
     JOIN youtube_research_projects p ON p.id = a.project_id
     WHERE ${scope}
       AND (COALESCE(a.config->>'workspace','') = 'quick_analysis' OR p.name ILIKE 'Quick Analysis%')
     ORDER BY a.created_at DESC
     LIMIT 80`,
    values,
  );
  const month = rows.filter((row) => new Date(row.created_at).getTime() >= Date.now() - 30 * 86400000).length;
  const prev = rows.filter((row) => {
    const time = new Date(row.created_at).getTime();
    return time < Date.now() - 30 * 86400000 && time >= Date.now() - 60 * 86400000;
  }).length;
  const completed = rows.filter((row) => row.status === 'ready').length;
  const videos = rows.reduce((sum, row) => sum + Number(row.video_count || 0), 0);
  return {
    rows,
    stats: {
      total: rows.length,
      completed,
      videos,
      lastGenerated: rows[0]?.created_at || null,
      totalTrend: trend(month, prev),
      completedTrend: trend(
        rows.filter((row) => row.status === 'ready' && new Date(row.created_at).getTime() >= Date.now() - 30 * 86400000).length,
        rows.filter((row) => row.status === 'ready' && new Date(row.created_at).getTime() < Date.now() - 30 * 86400000 && new Date(row.created_at).getTime() >= Date.now() - 60 * 86400000).length,
      ),
    },
  };
}

export async function listQuickReports() {
  const values: unknown[] = [];
  const scope = accountProjectFilter(values);
  const { rows } = await q<Record<string, any>>(
    undefined,
    `SELECT r.id, r.project_id, r.name, r.report_type, r.status, r.generated_at::text,
            COALESCE(jsonb_array_length(r.payload->'evidence'->'videos'), 0)::int AS video_count,
            (
              SELECT jsonb_agg(jsonb_build_object(
                'title', item->>'title',
                'thumbnail_url', item->>'thumbnail_url',
                'youtube_video_id', item->>'youtube_video_id',
                'channel_name', item->>'channel_name',
                'channel_thumbnail_url', item->>'channel_thumbnail_url'
              ))
              FROM jsonb_array_elements(COALESCE(r.payload->'evidence'->'videos', '[]'::jsonb)) AS item
            ) AS videos
     FROM youtube_research_reports r
     JOIN youtube_research_projects p ON p.id = r.project_id
     WHERE ${scope}
       AND r.status <> 'archived'
       AND (
         COALESCE(r.payload->>'workspace','') = 'quick_report'
         OR r.name ILIKE 'Quick report%'
         OR p.name ILIKE 'Quick Report%'
       )
     ORDER BY r.generated_at DESC
     LIMIT 80`,
    values,
  );
  const month = rows.filter((row) => new Date(row.generated_at).getTime() >= Date.now() - 30 * 86400000).length;
  const prev = rows.filter((row) => {
    const time = new Date(row.generated_at).getTime();
    return time < Date.now() - 30 * 86400000 && time >= Date.now() - 60 * 86400000;
  }).length;
  const ready = rows.filter((row) => row.status === 'ready').length;
  const videos = rows.reduce((sum, row) => sum + Number(row.video_count || 0), 0);
  return {
    rows,
    stats: {
      total: rows.length,
      ready,
      videos,
      lastGenerated: rows[0]?.generated_at || null,
      totalTrend: trend(month, prev),
      readyTrend: trend(
        rows.filter((row) => row.status === 'ready' && new Date(row.generated_at).getTime() >= Date.now() - 30 * 86400000).length,
        rows.filter((row) => row.status === 'ready' && new Date(row.generated_at).getTime() < Date.now() - 30 * 86400000 && new Date(row.generated_at).getTime() >= Date.now() - 60 * 86400000).length,
      ),
    },
  };
}
