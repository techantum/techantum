import { lengthLabel } from './parse';
import { captionLanguageNames } from './video-content';

export type GapVideo = {
  id: string;
  title?: string | null;
  channel_name?: string | null;
  relationship?: string | null;
  view_count?: number | null;
  like_count?: number | null;
  comment_count?: number | null;
  description?: string | null;
  thumbnail_url?: string | null;
  thumbnail_caption?: string | null;
  watch_url?: string | null;
  placement_label?: string | null;
  published_at?: string | null;
  duration_label?: string | null;
  duration_seconds?: number | null;
  duration?: string | null;
  youtube_video_id?: string | null;
  thumbnail_text?: string | null;
  thumbnail_scene?: string | null;
  spoken_text?: string | null;
  spoken_source?: 'captions' | 'description' | null;
};

export const COMPARISON_UNAVAILABLE = 'Not available yet';

export function thumbnailContent(video: { thumbnail_text?: string | null; thumbnail_caption?: string | null; thumbnail_scene?: string | null }) {
  const words = String(video.thumbnail_text || '').trim();
  const scene = String(video.thumbnail_scene || '').trim();
  const note = String(video.thumbnail_caption || '').trim();
  const read = [words, scene].filter(Boolean).join('. ');
  if (read && note && note !== words) return `${read} (saved note: ${note})`;
  return read || note;
}

export type GapSegment = {
  id: string;
  label: string;
  value: string;
  positive: string;
  negative: string;
};

export type GapCard = {
  role: 'own' | 'competitor' | 'video';
  roleLabel: string;
  videoId: string;
  title: string;
  channelName: string;
  thumbnailUrl: string | null;
  thumbnailCaption: string | null;
  thumbnailText: string | null;
  thumbnailScene: string | null;
  spokenSource: 'captions' | 'description' | null;
  captionLanguages: string[];
  watchUrl: string | null;
  description: string | null;
  segments: GapSegment[];
  alternatives: { titles: string[]; thumbnail: string[]; description: string };
  actions: { title: string; detail: string }[];
  suggestions: string[];
};

function num(value: number | null | undefined) {
  if (value == null || !Number.isFinite(Number(value))) return null;
  return Number(value);
}

function fmt(value: number | null) {
  if (value == null) return '—';
  return value.toLocaleString('en-IN');
}

function clip(value: string | null | undefined, max = 72) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function specificTitle(title: string | null | undefined) {
  const text = String(title || '');
  return /\b(what|why|how|when|vs|versus|explained|guide|tips|success|experience|works)\b/i.test(text) || text.includes('?');
}

function countSegment(id: string, label: string, mine: number | null, theirs: number | null): GapSegment {
  const higher = mine != null && theirs != null && mine > theirs;
  const lower = mine != null && theirs != null && mine < theirs;
  const equal = mine != null && theirs != null && mine === theirs;
  return {
    id,
    label,
    value: fmt(mine),
    positive: higher
      ? `Public ${label.toLowerCase()} are higher than the other video (${fmt(mine)} vs ${fmt(theirs)}).`
      : mine != null && mine > 0
        ? `This video has ${fmt(mine)} public ${label.toLowerCase()} on record.`
        : `No higher ${label.toLowerCase()} claim is made.`,
    negative: mine == null
      ? `No public ${label.toLowerCase()} count is stored for this video.`
      : lower
        ? `Public ${label.toLowerCase()} are lower than the other video (${fmt(mine)} vs ${fmt(theirs)}).`
        : equal
          ? `Public ${label.toLowerCase()} match the other video, so this count alone does not show a gap.`
          : `A higher ${label.toLowerCase()} count does not prove the title or thumbnail caused it.`,
  };
}

function unavailable(id: string, label: string, reason: string): GapSegment {
  return {
    id,
    label,
    value: 'Not shared',
    positive: `No ${label.toLowerCase()} advantage is claimed.`,
    negative: reason,
  };
}

function segments(video: GapVideo, other: GapVideo): GapSegment[] {
  const views = num(video.view_count);
  const otherViews = num(other.view_count);
  const totalViews = (views || 0) + (otherViews || 0);
  const share = views != null && totalViews > 0 ? Math.round((views / totalViews) * 100) : null;
  const description = String(video.description || '').trim();
  const otherDescription = String(other.description || '').trim();
  const title = video.title || '';
  const titleSpecific = specificTitle(title);
  const otherSpecific = specificTitle(other.title);
  return [
    countSegment('views', 'Views', views, otherViews),
    {
      id: 'viewership',
      label: 'Viewership',
      value: share == null ? '—' : `${share}% of this pair`,
      positive: share != null && share > 50
        ? `This video holds ${share}% of the public views in the selected pair.`
        : 'Viewership here is only this video’s share of public views in the pair.',
      negative: share == null
        ? 'Viewership share cannot be calculated without public view counts.'
        : share < 50
          ? `This video holds ${share}% of the public views in the selected pair.`
          : share === 50
            ? 'The pair splits public views evenly.'
            : 'Share of views is not watch time and is not a demographic.',
    },
    unavailable('watch_hours', 'Watch hours', 'YouTube does not return watch hours for this public video, so this segment is not scored.'),
    countSegment('likes', 'Likes', num(video.like_count), num(other.like_count)),
    countSegment('comments', 'Comments', num(video.comment_count), num(other.comment_count)),
    {
      id: 'description',
      label: 'Description',
      value: description ? `${description.length} characters` : 'Missing',
      positive: description && description.length >= otherDescription.length && description.length >= 40
        ? 'The public description is present and at least as long as the other video.'
        : description
          ? 'A public description is available to edit.'
          : 'No description advantage is claimed.',
      negative: !description
        ? 'No public description is stored, so viewers only see the title.'
        : description.length < 80
          ? 'The description is short. A first-line outcome is still missing.'
          : otherDescription.length > description.length
            ? 'The other video’s public description is longer.'
            : 'Length alone does not show that the description answers the viewer’s question.',
    },
    {
      id: 'thumbnail_title',
      label: 'Thumbnail and title',
      value: title || 'Untitled',
      positive: titleSpecific && !otherSpecific
        ? 'The title names a question, method, or result. The other title is broader.'
        : titleSpecific
          ? 'The title names a question, method, or result.'
          : video.thumbnail_url
            ? 'A thumbnail image is saved with this video.'
            : 'No title advantage is claimed.',
      negative: !titleSpecific && otherSpecific
        ? 'The title stays broad while the other title names a clearer outcome.'
        : video.thumbnail_text
          ? 'The words were read from the thumbnail image. They are not a measured click result.'
          : !video.thumbnail_caption
            ? 'Text on the thumbnail is not recorded yet.'
            : 'The saved thumbnail text is a note, not a measured click result.',
    },
    unavailable('geography', 'Geography', 'YouTube does not share where people watched this public video.'),
    unavailable('ages', 'Ages watched', 'YouTube does not share the ages of people who watched this public video.'),
    unavailable('genders', 'Genders watched', 'YouTube does not share the genders of people who watched this public video.'),
  ];
}

function plan(video: GapVideo, other: GapVideo, role: GapCard['role']) {
  const title = video.title || 'This video';
  const otherTitle = other.title || 'the other video';
  const short = clip(title, 48) || 'this topic';
  if (role === 'competitor') {
    return {
      alternatives: {
        titles: [
          `Own-video test: use the specific outcome in “${clip(otherTitle, 60) || title}”`,
          `Own-video test: answer one question left open by “${clip(title, 60)}”`,
          `60-second version of the angle in “${short}”`,
        ],
        thumbnail: [
          video.thumbnail_scene
            ? `Own-thumbnail test: keep a similar scene (${clip(video.thumbnail_scene, 80)}) and one outcome word from this title.`
            : 'Put one outcome word from this competitor title on the own thumbnail.',
        ],
        description: `Open the own description with the promise in “${clip(title, 80)}”, then the viewer’s next step. This uses the public title only.`,
      },
      actions: [
        { title: 'Do not edit this competitor upload', detail: 'Use it as the reference. Title and description changes belong on the own video.' },
        { title: 'Carry the clearer promise onto the own video', detail: `If “${clip(title, 70)}” states a result the own title does not, test that pattern on the own title.` },
        { title: 'Compare only the public counts', detail: 'Views, likes, and comments can be ranked. Watch hours, geography, age, and gender cannot.' },
      ],
      suggestions: [
        num(video.view_count) != null && num(other.view_count) != null && Number(video.view_count) > Number(other.view_count)
          ? `This competitor video has more public views (${fmt(num(video.view_count))} vs ${fmt(num(other.view_count))}). Treat that as a packaging test, not proof of demand.`
          : 'Use this competitor video to check whether its title is more specific than the own title.',
        video.description
          ? 'Read the competitor description’s first line and mirror that structure on the own video.'
          : 'This competitor video has no stored description, so the title is the only public packaging to study.',
      ],
    };
  }
  const own = role === 'own';
  return {
    alternatives: {
      titles: [
        `${short}: what to do first`,
        `How ${short} works`,
        `${short} in 60 seconds`,
      ],
      thumbnail: [
        thumbnailContent(video)
          ? `Keep “${clip(video.thumbnail_text || video.thumbnail_caption, 80) || 'the on-image words'}” readable${video.thumbnail_scene ? ` on this scene: ${clip(video.thumbnail_scene, 80)}` : ''}.`
          : 'Add one short outcome line on the thumbnail. The current image could not be read.',
      ],
      description: video.description
        ? `Lead with the outcome, then keep this fact from the current description: ${clip(video.description, 140)}`
        : `Write a first line that states what “${clip(title, 80)}” helps the viewer do. No public description is stored yet.`,
    },
    actions: [
      { title: `Rewrite the title for “${clip(title, 70)}”`, detail: own ? 'Test a more specific outcome line on this own upload. YouTube allows a title edit; the video file stays.' : 'Test a more specific outcome line. A title edit does not replace the video file.' },
      { title: video.description ? 'Tighten the first line of the description' : 'Add a public description', detail: 'State the viewer outcome in the first sentence, then one next step.' },
      { title: video.thumbnail_scene ? 'Keep the thumbnail scene and shorten the on-image words' : 'Record the thumbnail text', detail: video.thumbnail_scene ? `The image shows: ${clip(video.thumbnail_scene, 140)}` : 'Write the words that appear on the thumbnail so the next comparison can score them.' },
    ],
    suggestions: [
      num(video.view_count) != null && num(other.view_count) != null && Number(video.view_count) < Number(other.view_count)
        ? `Public views trail the other video (${fmt(num(video.view_count))} vs ${fmt(num(other.view_count))}). Change the title and description, then check public views again after 14 days.`
        : 'Keep the next test to title, description, and thumbnail text. Public views and likes are the counts to recheck.',
      !specificTitle(video.title) && specificTitle(other.title)
        ? `The other title is more specific (“${clip(otherTitle, 70)}”). That is the gap to close on this video.`
        : 'Recheck public likes and comments after the title change. Those counts are not watch hours.',
    ],
  };
}

function card(video: GapVideo, other: GapVideo): GapCard {
  const role: GapCard['role'] = video.relationship === 'own' ? 'own' : video.relationship === 'competitor' ? 'competitor' : 'video';
  const roleLabel = role === 'own' ? 'Own video' : role === 'competitor' ? 'Competitor video' : (video.channel_name || 'Video');
  const built = plan(video, other, role);
  return {
    role,
    roleLabel,
    videoId: video.id,
    title: video.title || video.id,
    channelName: video.channel_name || '—',
    thumbnailUrl: video.thumbnail_url || null,
    thumbnailCaption: thumbnailContent(video) || null,
    thumbnailText: String(video.thumbnail_text || '').trim() || null,
    thumbnailScene: String(video.thumbnail_scene || '').trim() || null,
    spokenSource: video.spoken_source === 'captions' || video.spoken_source === 'description' ? video.spoken_source : null,
    captionLanguages: video.spoken_source === 'captions' ? captionLanguageNames(video.spoken_text) : [],
    watchUrl: video.watch_url || null,
    description: video.description || null,
    segments: segments(video, other),
    alternatives: built.alternatives,
    actions: built.actions,
    suggestions: built.suggestions,
  };
}

function roleLabel(video: GapVideo) {
  if (video.relationship === 'own') return 'Own';
  if (video.relationship === 'competitor') return 'Competitor';
  return '—';
}

export function comparisonTable(videos: GapVideo[] | null | undefined) {
  const list = (videos || []).filter((video) => video?.id);
  const totalViews = list.reduce((sum, video) => sum + (num(video.view_count) || 0), 0);
  const share = (video: GapVideo) => {
    const views = num(video.view_count);
    if (views == null || totalViews <= 0) return '—';
    return `${Math.round((views / totalViews) * 100)}% of this comparison`;
  };
  const rows: { label: string; values: string[] }[] = [
    { label: 'Role', values: list.map(roleLabel) },
    { label: 'Channel', values: list.map((video) => video.channel_name || '—') },
    { label: 'Title', values: list.map((video) => video.title || '—') },
    { label: 'Thumbnail', values: list.map((video) => video.thumbnail_url || 'No thumbnail') },
    { label: 'Text on thumbnail', values: list.map((video) => String(video.thumbnail_text || '').trim() || 'Not recorded') },
    { label: 'Image on thumbnail', values: list.map((video) => String(video.thumbnail_scene || '').trim() || 'Not recorded') },
    { label: 'Published', values: list.map((video) => video.published_at ? String(video.published_at).slice(0, 10) : '—') },
    { label: 'Length', values: list.map((video) => lengthLabel(video) || '—') },
    { label: 'Views', values: list.map((video) => fmt(num(video.view_count))) },
    { label: 'Viewership', values: list.map(share) },
    { label: 'Watch hours', values: list.map(() => COMPARISON_UNAVAILABLE) },
    { label: 'Likes', values: list.map((video) => fmt(num(video.like_count))) },
    { label: 'Comments', values: list.map((video) => fmt(num(video.comment_count))) },
    { label: 'Organic or paid', values: list.map((video) => video.placement_label || '—') },
    { label: 'Description', values: list.map((video) => clip(video.description, 400) || 'No public description') },
    { label: 'Geography', values: list.map(() => COMPARISON_UNAVAILABLE) },
    { label: 'Ages watched', values: list.map(() => COMPARISON_UNAVAILABLE) },
    { label: 'Genders watched', values: list.map(() => COMPARISON_UNAVAILABLE) },
  ];
  return {
    videos: list.map((video) => ({
      id: video.id,
      title: video.title || 'Untitled',
      role: roleLabel(video),
      thumbnailUrl: video.thumbnail_url || null,
      watchUrl: video.watch_url || null,
    })),
    rows,
  };
}

export function buildGapCards(videos: GapVideo[] | null | undefined) {
  const list = (videos || []).filter((video) => video?.id);
  if (list.length < 2) return null;
  const own = list.find((video) => video.relationship === 'own');
  const competitor = list.find((video) => video.relationship === 'competitor' && video.id !== own?.id);
  const left = own || list[0];
  const right = competitor || list.find((video) => video.id !== left.id);
  if (!right) return null;
  return { left: card(left, right), right: card(right, left) };
}
