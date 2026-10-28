import { listYoutubeTraining } from '@/lib/youtube/youtube-master';
import { GOAL_PLAYBOOKS, PLAYBOOK_MODULES } from '@/lib/youtube/youtube-master-playbook';

const GOAL_HINTS: { id: string; keys: string[] }[] = [
  { id: 'views', keys: ['view', 'views', 'reach', 'impress'] },
  { id: 'ctr', keys: ['ctr', 'click', 'thumbnail', 'title'] },
  { id: 'retention', keys: ['retention', 'watch', 'hook', 'drop'] },
  { id: 'engagement', keys: ['like', 'comment', 'engag'] },
  { id: 'subscribers', keys: ['subscribe', 'subscriber'] },
  { id: 'discoverability', keys: ['seo', 'search', 'discover', 'tag', 'description'] },
  { id: 'competitors', keys: ['competitor', 'compare', 'rival'] },
  { id: 'publishing', keys: ['publish', 'schedule', 'upload', 'post', 'best time'] },
];

export const HOOKOOH_OFF_TOPIC =
  "I'm focused on YouTube growth and content strategy. I can help with views, SEO, thumbnails, retention, and channel management.";

export const HOOKOOH_NO_PROJECT =
  'I can guide you on what to evaluate in YouTube videos, including titles, thumbnails, SEO, engagement, and retention.\n\nFor a general performance review, start with views, click-through rate, average view duration, and audience retention in YouTube Studio.';

const OFF_TOPIC = /\b(facebook|instagram|tiktok(?! (short|youtube))|linkedin ads|twitter|snapchat|pinterest|dating|recipe|weather|python|javascript homework|crypto trading|personal loan|google ads|meta ads)\b/i;
const YOUTUBE_HINT = /\b(youtube|yt\b|video title|thumbnail|channel|short|subscriber|retention|watch time|seo|upload|monetiz|studio|analytics|hook|ctr)\b/i;
const PROJECT_ASK = /\b(my (latest )?(youtube )?project|imported (project )?videos?|analyze my (imported |project )?videos?|current project|agency (client|channel)|our competitor (videos|channels))\b/i;

export function isHookoohOffTopic(question: string) {
  return OFF_TOPIC.test(question) && !YOUTUBE_HINT.test(question);
}

export function isHookoohProjectAsk(question: string) {
  return PROJECT_ASK.test(question);
}

export function inferHookoohGoals(question: string) {
  const hay = question.toLowerCase();
  return GOAL_HINTS.filter((item) => item.keys.some((key) => hay.includes(key))).map((item) => item.id);
}

function stripInternalLabels(text: string) {
  return String(text || '')
    .replace(/Module\s+\d+\s*[—\-:]?\s*/gi, '')
    .replace(/Global agent behavior/gi, '')
    .replace(/(?:Revealeo|Hookooh) YouTube Mastery Playbook v[\d.]+/gi, '')
    .replace(/\[(?:packaging|titles|thumbnails|retention|seo|audience|standards|channel|content|engagement|publishing|shorts|analytics|competitors|experiments|global)\]\s*/gi, '')
    .trim();
}

export async function retrieveHookoohKnowledge(question: string) {
  const goals = inferHookoohGoals(question);
  const categories = new Set(goals.flatMap((goal) => GOAL_PLAYBOOKS[goal] || []));
  const playbook = PLAYBOOK_MODULES
    .filter((item) => categories.has(item.category) && item.category !== 'global')
    .map((item) => stripInternalLabels(item.body).slice(0, 500))
    .join('\n\n');
  const rows = (await listYoutubeTraining()).filter((row) => row.enabled);
  const tokens = question.toLowerCase().split(/[^a-z0-9]+/).filter((item) => item.length > 3);
  const ranked = rows
    .map((row) => {
      const hay = `${row.category} ${row.body}`.toLowerCase();
      const score = tokens.reduce((sum, token) => sum + (hay.includes(token) ? 1 : 0), 0);
      return { ...row, score };
    })
    .sort((a, b) => b.score - a.score);
  const picked = ranked[0]?.score
    ? ranked.filter((row) => row.score > 0).slice(0, 4)
    : ranked.slice(0, 3);
  return {
    goals,
    playbook: playbook.slice(0, 2800),
    excerpts: picked.map((row) => ({
      category: row.category,
      excerpt: stripInternalLabels(row.body).slice(0, 500),
    })),
  };
}
