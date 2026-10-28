export const PRIMARY_GOALS = [
  { id: 'views', label: 'Increase Views', hint: 'Attract more relevant viewers via packaging, topics, and discovery', icon: 'ChartBarIcon', playbooks: 'Packaging, Titles, Thumbnails, Topics, Discovery' },
  { id: 'ctr', label: 'Improve CTR', hint: 'Thumbnail and title appeal. Needs authorized impressions/CTR or a visual-only review', icon: 'CursorArrowRaysIcon', playbooks: 'Packaging, Titles, Thumbnails' },
  { id: 'retention', label: 'Improve Retention', hint: 'Hooks, pacing, and structure — not unrelated SEO', icon: 'ClockIcon', playbooks: 'Retention, Opening, Structure' },
  { id: 'engagement', label: 'Increase Engagement', hint: 'Meaningful likes, comments, and discussion', icon: 'ChatBubbleLeftRightIcon', playbooks: 'Engagement, Audience, CTA' },
  { id: 'subscribers', label: 'Grow Subscribers', hint: 'Give viewers a reason to return and subscribe', icon: 'UserPlusIcon', playbooks: 'Channel, Series, Loyalty' },
  { id: 'discoverability', label: 'Improve Search Visibility', hint: 'Search intent, titles, descriptions, and tags', icon: 'MagnifyingGlassIcon', playbooks: 'SEO, Titles, Descriptions' },
  { id: 'competitors', label: 'Analyze Competitors', hint: 'Public patterns you can test — do not copy assets', icon: 'PresentationChartLineIcon', playbooks: 'Competitors, Packaging, Topics' },
  { id: 'publishing', label: 'Improve Publishing Strategy', hint: 'Cadence, readiness, and post-publish review', icon: 'CalendarDaysIcon', playbooks: 'Publishing, Channel, Experiments' },
] as const;

export type PrimaryGoalId = (typeof PRIMARY_GOALS)[number]['id'];

export function compactCount(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  if (Math.abs(number) >= 1_000_000) return `${(number / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (Math.abs(number) >= 1000) return `${(number / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return Math.round(number).toLocaleString('en-IN');
}

export function likesPlusComments(video: { like_count?: number | null; comment_count?: number | null }) {
  if (video.like_count == null && video.comment_count == null) return null;
  return Number(video.like_count || 0) + Number(video.comment_count || 0);
}

export function perThousandViews(actions: number | null, views: number | null | undefined) {
  if (actions == null || views == null || views <= 0) return null;
  return Math.round((actions / views) * 1000 * 10) / 10;
}

export function likesCommentsShare(video: { view_count?: number | null; like_count?: number | null; comment_count?: number | null }) {
  const views = Number(video.view_count);
  const actions = likesPlusComments(video);
  if (!Number.isFinite(views) || views <= 0 || actions == null) return null;
  return Math.round((actions / views) * 1000) / 10;
}

export function pctDiff(yours: unknown, theirs: unknown) {
  const a = Number(yours);
  const b = Number(theirs);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a === 0) return null;
  return Math.round(((b - a) / Math.abs(a)) * 100);
}

function looksLikeId(value: string) {
  const text = value.trim();
  return /^(UC[\w-]{20,}|[\w-]{11}|[0-9a-f]{8}-[0-9a-f-]{27,})$/i.test(text);
}

export function displayTitle(video?: Record<string, any> | null) {
  const title = String(video?.title || '').trim();
  if (title && !looksLikeId(title)) return title;
  return 'Untitled video';
}

export function shortTitle(video?: Record<string, any> | null, max = 36) {
  const title = displayTitle(video);
  if (title.length <= max) return title;
  const cut = title.slice(0, max).replace(/\s+\S*$/, '').trim();
  return `${cut || title.slice(0, max)}…`;
}

export function displayChannel(video?: Record<string, any> | null) {
  const name = String(video?.channel_name || '').trim();
  const handle = String(video?.channel_handle || '').replace(/^@/, '').trim();
  if (name && !looksLikeId(name)) return name;
  if (handle && !looksLikeId(handle)) return `@${handle}`;
  return video?.relationship === 'own' ? 'Your channel' : 'Competitor channel';
}

export function displayRole(video?: Record<string, any> | null): 'own' | 'competitor' {
  return video?.relationship === 'own' ? 'own' : 'competitor';
}

export function displayRoleLabel(video?: Record<string, any> | null) {
  return displayRole(video) === 'own' ? 'Your video' : 'Competitor';
}

export function videoAccent(index: number, own?: boolean) {
  if (own) return { bar: 'bg-sky-500', chip: 'bg-sky-50 text-sky-700', soft: 'bg-sky-50', ring: 'ring-sky-100', icon: 'text-sky-600' };
  const palettes = [
    { bar: 'bg-violet-500', chip: 'bg-violet-50 text-violet-700', soft: 'bg-violet-50', ring: 'ring-violet-100', icon: 'text-violet-600' },
    { bar: 'bg-rose-500', chip: 'bg-rose-50 text-rose-700', soft: 'bg-rose-50', ring: 'ring-rose-100', icon: 'text-rose-600' },
    { bar: 'bg-amber-500', chip: 'bg-amber-50 text-amber-700', soft: 'bg-amber-50', ring: 'ring-amber-100', icon: 'text-amber-600' },
    { bar: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700', soft: 'bg-emerald-50', ring: 'ring-emerald-100', icon: 'text-emerald-600' },
  ];
  return palettes[index % palettes.length];
}

export function leaderFor(videos: Record<string, any>[], key: string) {
  if (!videos.length) return null;
  return [...videos].sort((a, b) => Number(b?.[key] || 0) - Number(a?.[key] || 0))[0];
}

export function comparativeInsightPoints(videos: Record<string, any>[]) {
  const list = videos.filter(Boolean);
  if (list.length < 2) return [];
  const points: { icon: string; tone: string; title: string; lines: string[] }[] = [];
  const pushMetric = (icon: string, tone: string, key: string, label: string) => {
    const ranked = [...list].sort((a, b) => Number(b?.[key] || 0) - Number(a?.[key] || 0));
    const top = ranked[0];
    const next = ranked[1];
    const topVal = Number(top?.[key] || 0);
    const nextVal = Number(next?.[key] || 0);
    if (!Number.isFinite(topVal) || topVal <= 0) return;
    points.push({
      icon,
      tone,
      title: `${label}: ${displayTitle(top)} leads`,
      lines: ranked.map((video) => `${shortTitle(video)} · ${displayChannel(video)} · ${compactCount(video[key])} ${label.toLowerCase()}`),
    });
    if (next && topVal !== nextVal) {
      points[points.length - 1].lines.push(
        `${compactCount(topVal - nextVal)} more ${label.toLowerCase()} than ${displayTitle(next)}.`
      );
    }
  };
  pushMetric('EyeIcon', 'bg-sky-50 text-sky-700', 'view_count', 'Views');
  pushMetric('HandThumbUpIcon', 'bg-violet-50 text-violet-700', 'like_count', 'Likes');
  pushMetric('ChatBubbleLeftRightIcon', 'bg-rose-50 text-rose-700', 'comment_count', 'Comments');
  const byLength = [...list].sort((a, b) => String(b.title || '').length - String(a.title || '').length);
  points.push({
    icon: 'DocumentTextIcon',
    tone: 'bg-amber-50 text-amber-700',
    title: 'Titles',
    lines: byLength.map((video) => {
      const title = displayTitle(video);
      return `${shortTitle(video)} · ${displayChannel(video)} · ${title.length} characters`;
    }),
  });
  const thumbs = list.filter((video) => video.thumbnail_text);
  if (thumbs.length) {
    points.push({
      icon: 'PhotoIcon',
      tone: 'bg-emerald-50 text-emerald-700',
      title: 'Thumbnail text on the image',
      lines: list.map((video) => `${shortTitle(video)} · ${displayChannel(video)} · ${video.thumbnail_text ? `“${String(video.thumbnail_text).slice(0, 80)}”` : 'No on-image text was read'}`),
    });
  }
  const tagged = [...list].sort((a, b) => (Array.isArray(b.tags) ? b.tags.length : 0) - (Array.isArray(a.tags) ? a.tags.length : 0));
  points.push({
    icon: 'HashtagIcon',
    tone: 'bg-indigo-50 text-indigo-700',
    title: 'Public tags',
    lines: tagged.map((video) => `${shortTitle(video)} · ${displayChannel(video)} · ${Array.isArray(video.tags) && video.tags.length ? video.tags.length : 0} tags`),
  });
  return points.slice(0, 6);
}

export function thumbnailTextStats(text: unknown) {
  const trimmed = String(text || '').replace(/\s+/g, ' ').trim();
  const words = trimmed ? trimmed.split(' ') : [];
  return {
    text: trimmed,
    chars: trimmed.length,
    words: words.length,
    numbers: (trimmed.match(/\d+/g) || []).length,
    questions: (trimmed.match(/\?/g) || []).length,
    shout: words.filter((word) => word.length >= 3 && word === word.toUpperCase() && /[A-Z]/.test(word)).length,
  };
}

export function thumbnailWordSet(text: unknown) {
  return new Set(
    String(text || '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((word) => word.length >= 3)
  );
}

export function compareThumbnailReadings(videos: Record<string, any>[], briefs: Record<string, any>[] = []) {
  return videos.map((video) => {
    const brief = briefs.find((item) => String(item.video_id) === String(video.id));
    const stats = thumbnailTextStats(video.thumbnail_text);
    const scene = String(video.thumbnail_scene || '').trim();
    const summary = String(brief?.thumbnail_summary || '').trim();
    const title = displayTitle(video).toLowerCase();
    const overlap = stats.text
      ? stats.text.split(/\s+/).filter((word) => word.length >= 4 && title.includes(word.toLowerCase())).length
      : 0;
    return {
      video,
      stats,
      scene,
      summary,
      overlap,
      hasText: Boolean(stats.text),
      hasScene: Boolean(scene),
    };
  });
}

export function uniqueChannelCount(videos: { channel_name?: string | null; channel_id?: string | null }[]) {
  return new Set(videos.map((video) => video.channel_id || video.channel_name || '').filter(Boolean)).size;
}

export function pickComparePair(videos: Record<string, any>[]) {
  const own = videos.filter((video) => video.relationship === 'own');
  const others = videos.filter((video) => video.relationship !== 'own');
  if (own.length && others.length) {
    const competitor = [...others].sort((a, b) => Number(b.view_count || 0) - Number(a.view_count || 0))[0];
    return { yours: own[0], competitor, extras: videos.filter((video) => video !== own[0] && video !== competitor) };
  }
  return {
    yours: videos[0] || null,
    competitor: videos[1] || null,
    extras: videos.slice(2),
  };
}

export function analysisStatusMeta(status: string) {
  if (status === 'ready') return { label: 'Completed', className: 'bg-emerald-50 text-emerald-700' };
  if (status === 'failed') return { label: 'Failed', className: 'bg-rose-50 text-rose-700' };
  return { label: 'Processing', className: 'bg-indigo-50 text-indigo-700' };
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function viewReason(video: Record<string, any>) {
  const parts: string[] = [];
  if (video.thumbnail_text) parts.push(`thumbnail text “${String(video.thumbnail_text).slice(0, 48)}”`);
  if (video.placement_label === 'Paid') parts.push('paid-placement signals in the public record');
  if (Array.isArray(video.tags) && video.tags.length >= 4) parts.push('more public tags than others in this set');
  const title = String(video.title || '');
  if (/\?|how |what |why /i.test(title)) parts.push('a specific question or how-to in the title');
  if (!parts.length) return 'Public view count is higher in this set. The Data API does not prove the cause.';
  return `Among selected videos, this one also shows ${parts.join(', ')}. That is a hypothesis to test, not a ranking of quality.`;
}

export type GoalAssessment = {
  id: string;
  label: string;
  status: 'up' | 'improve' | 'unavailable';
  headline: string;
  detail: string;
};

export function assessGoals(videos: Record<string, any>[], goals: string[]): GoalAssessment[] {
  const views = videos.map((video) => Number(video.view_count)).filter((value) => Number.isFinite(value) && value > 0);
  const likes = videos.map((video) => Number(video.like_count || 0));
  const comments = videos.map((video) => Number(video.comment_count || 0));
  const viewCut = median(views);
  const likeCut = median(likes);
  const commentCut = median(comments);
  const tagged = videos.filter((video) => Array.isArray(video.tags) && video.tags.length).length;
  const aboveViews = videos.filter((video) => Number(video.view_count || 0) >= viewCut && Number(video.view_count || 0) > 0).length;
  return PRIMARY_GOALS.filter((goal) => goals.includes(goal.id)).map((goal) => {
    if (goal.id === 'retention' || goal.id === 'ctr' || goal.id === 'subscribers') {
      return {
        id: goal.id,
        label: goal.label,
        status: 'unavailable' as const,
        headline: 'Needs authorized YouTube Analytics',
        detail: goal.id === 'ctr'
          ? 'CTR and impressions are not public. Use a visual packaging assessment until Analytics is connected.'
          : goal.id === 'subscribers'
            ? 'Subscriber gains per video are not public on competitor channels.'
            : 'Audience retention and watch time need authorized YouTube Analytics.',
      };
    }
    if (goal.id === 'views') {
      return {
        id: goal.id,
        label: goal.label,
        status: aboveViews >= videos.length / 2 ? 'up' : 'improve',
        headline: aboveViews >= videos.length / 2 ? 'Several selected videos sit at or above the set median for public views' : 'Most selected videos sit below the set median for public views',
        detail: `Median public views in this selection: ${compactCount(viewCut)}. ${aboveViews} of ${videos.length} videos meet or beat that mark.`,
      };
    }
    if (goal.id === 'likes') {
      const above = likes.filter((value) => value >= likeCut && value > 0).length;
      return {
        id: goal.id,
        label: goal.label,
        status: above >= videos.length / 2 ? 'up' : 'improve',
        headline: above >= videos.length / 2 ? 'Like counts are in line with this set' : 'Like counts lag the rest of this set',
        detail: `Median public likes: ${compactCount(likeCut)}.`,
      };
    }
    if (goal.id === 'comments') {
      const above = comments.filter((value) => value >= commentCut && value > 0).length;
      return {
        id: goal.id,
        label: goal.label,
        status: above >= videos.length / 2 ? 'up' : 'improve',
        headline: above >= videos.length / 2 ? 'Comment counts are in line with this set' : 'Comment counts lag the rest of this set',
        detail: `Median public comments: ${compactCount(commentCut)}.`,
      };
    }
    if (goal.id === 'engagement') {
      return {
        id: goal.id,
        label: goal.label,
        status: 'improve' as const,
        headline: 'Engagement here is likes + comments, not an Analytics rate',
        detail: 'Use likes + comments per 1,000 public views in the video list. YouTube Analytics engagement rate is not calculated.',
      };
    }
    return {
      id: goal.id,
      label: goal.label,
      status: tagged >= videos.length / 2 ? 'up' : 'improve',
      headline: tagged >= videos.length / 2 ? 'Most selected videos expose public tags' : 'Public tags are sparse, so search/suggested fit is hard to judge',
      detail: `${tagged} of ${videos.length} videos currently expose public tags. Search ranking is not in the Data API.`,
    };
  });
}

export function formatPublished(value: unknown) {
  if (!value) return '—';
  const date = new Date(String(value));
  if (!Number.isFinite(date.getTime())) return String(value).slice(0, 16).replace('T', ' ');
  return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
