export const PRIMARY_GOALS = [
  { id: 'views', label: 'Increase Views', hint: 'Improve reach and visibility', icon: 'ChartBarIcon' },
  { id: 'likes', label: 'Increase Likes', hint: 'Get more likes on videos', icon: 'HeartIcon' },
  { id: 'comments', label: 'More Comments', hint: 'Drive meaningful discussions', icon: 'ChatBubbleLeftRightIcon' },
  { id: 'engagement', label: 'Higher Engagement', hint: 'Improve overall interaction', icon: 'UserGroupIcon' },
  { id: 'retention', label: 'Improve Retention', hint: 'Keep viewers watching longer', icon: 'ClockIcon' },
  { id: 'discoverability', label: 'Better Discoverability', hint: 'Rank higher in search and suggested', icon: 'MagnifyingGlassIcon' },
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
    if (goal.id === 'retention') {
      return {
        id: goal.id,
        label: goal.label,
        status: 'unavailable' as const,
        headline: 'Not in the public Data API',
        detail: 'Audience retention and watch time need authorized YouTube Analytics. This run cannot mark retention as up to the mark.',
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
