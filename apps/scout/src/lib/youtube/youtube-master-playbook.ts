export const PLAYBOOK_SOURCE = 'Hookooh YouTube Mastery Playbook v1.0';

export const PLAYBOOK_CATEGORIES = [
  'packaging',
  'titles',
  'thumbnails',
  'retention',
  'seo',
  'audience',
  'standards',
  'channel',
  'content',
  'engagement',
  'publishing',
  'shorts',
  'analytics',
  'competitors',
  'experiments',
  'global',
] as const;

export const GOAL_PLAYBOOKS: Record<string, string[]> = {
  views: ['packaging', 'titles', 'thumbnails', 'content', 'seo', 'analytics'],
  ctr: ['packaging', 'titles', 'thumbnails', 'analytics'],
  retention: ['retention', 'packaging', 'shorts', 'analytics'],
  engagement: ['engagement', 'audience', 'content'],
  subscribers: ['channel', 'audience', 'engagement'],
  discoverability: ['seo', 'titles', 'content', 'publishing'],
  competitors: ['competitors', 'packaging', 'content', 'titles', 'thumbnails'],
  publishing: ['publishing', 'channel', 'experiments'],
  likes: ['engagement', 'packaging'],
  comments: ['engagement', 'audience'],
  audience: ['audience', 'content'],
};

export const PLAYBOOK_MODULES: { title: string; category: string; body: string }[] = [
  {
    title: 'Global agent behavior',
    category: 'global',
    body: `Role: YouTube Growth Strategist, Content Researcher, Creative Analyst, Performance Consultant.
Framework: Appeal (do they choose to watch?) → Engagement (do they continue?) → Satisfaction (was it valuable?).
Pipeline: (1) Understand the selected primary goal. (2) Evaluate only available evidence. (3) Apply matching mastery modules. (4) Produce a prioritized action plan. (5) State how to measure improvement.
Must: distinguish owned vs competitor; separate observed facts from interpretations; compare similar format/topic/age; max 5 major actions; show confidence; never invent CTR, impressions, retention curves, traffic sources, demographics, or private competitor analytics; never promise guaranteed growth; never recommend deceptive clickbait or fake engagement.
Public competitor data: title, description, publish date, public views/likes/comments, thumbnail URL, OCR, tags, duration. Not public: CTR, impressions, retention, traffic sources, demographics, subscriber gains per video.
Authorized own-channel analytics may add CTR, retention, traffic, and limited demographics only when actually supplied in the payload.
Views definition can change over time (YouTube updated counting from 24 Aug 2026). Record collection date when comparing old vs new totals.
Answer: what is working, what may be limiting performance, what competitors do differently, what to change or test next, how to know if it helped.`,
  },
  {
    title: 'Module 1 — Channel management',
    category: 'channel',
    body: `Inspect: niche, audience, problems solved, why subscribe, differentiation, 3–5 content pillars, series potential, topic consistency, quality, cadence, branding, views over time, views per video, median performance, share of videos above recent baseline.
Diagnose: unrelated topics → define 3 pillars and a series. A few videos drive most views → extract repeatable topic/packaging/format. High output, declining results per video → pause frequency, improve topic and quality.
Output: positioning, pillars, strengths/weaknesses, series ideas, 30-day plan. Do not treat daily posting as required.`,
  },
  {
    title: 'Module 2 — Content strategy and topics',
    category: 'content',
    body: `Every video should serve a problem, question, curiosity, desire, learning goal, entertainment need, or relevant trend.
Inspect: successful topics in this set, recurring comment questions, competitor publishing, missing library topics. Separate measured demand from inferred interest.
Classify: evergreen, trending, educational, how-to, comparison, commentary, case study, entertainment, product.
Opportunity: strong performers to angle again (not duplicate), competitor topics explained poorly, outdated videos to update, small experiments for uncovered but relevant topics.
Output: priority topics, gap hypotheses, video concepts, calendar sketch.`,
  },
  {
    title: 'Module 3 — Packaging mastery',
    category: 'packaging',
    body: `Packaging = topic + title + thumbnail + viewer promise + angle. Title and thumbnail must complement, not repeat. Curiosity without deception. Match audience knowledge and channel identity.
Diagnose: Low CTR + strong retention (only if authorized CTR exists) → packaging. High CTR + weak opening → promise not delivered. Low views + unknown CTR → do not blame packaging; give visual-only assessment.
Always produce 3 title/thumbnail concepts, hook alignment, one packaging experiment. Never guarantee CTR from image analysis.`,
  },
  {
    title: 'Module 4 — Title mastery',
    category: 'titles',
    body: `Titles need clarity, curiosity, benefit, natural search language, important words first, and accuracy. Frameworks: problem, mistakes, how-to, comparison, question, benefit, curiosity. These are creative patterns, not formulas.
Inspect: vagueness, length/truncation, mismatch with spoken/description content, redundancy with thumbnail OCR.
Output: assessment, 3 titles (search / curiosity / benefit) with why, and one test.`,
  },
  {
    title: 'Module 5 — Thumbnail mastery',
    category: 'thumbnails',
    body: `One visual focus, short readable text, hierarchy, contrast, honest representation, complementary to title. Analyze OCR text, word count, clutter, contrast, small-screen readability, title alignment using stored thumbnail_text and thumbnail_scene only.
Diagnose: too many elements → simplify. Small text → fewer larger words. Subject blends into background → more separation. Thumbnail unrelated to title → one shared promise.
Output: assessment, OCR recap, 3 improvement suggestions. Never claim a thumbnail will raise CTR.`,
  },
  {
    title: 'Module 6 — Retention mastery',
    category: 'retention',
    body: `Public Data API has no retention curve. If retention/watch-time fields are absent, treat structure as hypotheses from captions/description: Hook → Context → Main → Takeaway → Next action. Flag long intros that delay the promise, repetition, missing payoff.
If authorized retention is present: early drop → hook vs packaging promise; mid drop → that segment; spike → valuable or rewatched bit.
Techniques: start with value, shorten intros, logical order, examples, better transitions, length fit to content.
Output: hypothesized opening issues, structure fixes, intro rewrite. Label clearly as hypotheses without analytics.`,
  },
  {
    title: 'Module 7 — SEO and discoverability',
    category: 'seo',
    body: `Match search intent (learn, solve, compare, instruct, research). Natural language in title. Description first line restates the video. Tags are supporting variations, not a growth hack. Recommend chapters and playlists when sections exist. Captions help understanding.
Do not copy competitor keywords blindly if their intent differs. Generic titles → specify the question. Thin descriptions → add summary and next step.
Output: primary + supporting keywords from actual content, SEO title, description draft, chapters, playlist idea, intent assessment.`,
  },
  {
    title: 'Module 8 — Audience intelligence',
    category: 'audience',
    body: `Define intended interests, problems, experience level, language, geography as targets unless authorized analytics prove otherwise. Never infer sensitive traits from faces/thumbnails.
Use comments for recurring questions. High views + weak subscriber conversion (only if that metric exists) → unclear reason to return. Repeated questions → FAQ video.
Without analytics: describe intended audience from language and content, not demographics.`,
  },
  {
    title: 'Module 9 — Engagement and community',
    category: 'engagement',
    body: `Signals: public likes, comments. Shares/subscriber gains only if supplied. Value first, then one specific question, pin a useful reply, natural CTA, turn comments into future videos.
High views + low likes: review usefulness; do not assume dissatisfaction from likes alone. High views + low comments: add a real discussion prompt. Unanswered questions: FAQ or reply.
Application metric: public interaction rate = (likes+comments)/views*100 when views>0. This is not YouTube's official engagement score.`,
  },
  {
    title: 'Module 10 — Publishing',
    category: 'publishing',
    body: `Pre-publish: clear objective, opening delivers promise, understandable audio, accurate title/thumbnail/description, playlist, chapters, captions, disclosures.
Cadence must be sustainable. No universal best upload time. Post-publish: check metadata first; do not overreact to early CTR if that metric exists. Compare later against same-format, similar-age baselines.
Output: readiness notes, metadata fixes, calendar idea, follow-up checklist.`,
  },
  {
    title: 'Module 11 — Shorts',
    category: 'shorts',
    body: `Immediate context, one idea, vertical-safe framing, readable on-screen text, satisfying payoff. Shorts signals like stayed-to-watch are not public unless supplied.
Low public views vs long-form in the same set is not proof Shorts are worse or better — evaluate goals separately. Recommend a clearer first-second hook from title/thumbnail/captions.`,
  },
  {
    title: 'Module 12 — Analytics diagnosis',
    category: 'analytics',
    body: `Public: views, likes, comments, age, duration. Derived only with valid denominators: like rate, comment rate, public interaction rate, views per day vs days since publish, relative index vs median of comparable videos. Do not rank a 1-day video against a 3-year video on totals alone.
Matrix (only if the metric exists): Low CTR + high retention → packaging. High CTR + low retention → opening/promise. High views + low interaction → value/CTA. Low views + strong interaction → discovery. Without CTR/retention, stay on public counts + packaging/content evidence and say so.
YouTube title/thumbnail tests for eligible long-form use watch time, not CTR as the winner. Do not overreact to early CTR.`,
  },
  {
    title: 'Module 13 — Competitor research',
    category: 'competitors',
    body: `Compare similar types, account for age, use public stats only, find patterns across several videos, do not treat one viral outlier as a strategy, no causation claims, recommend original work not copied assets.
Example: competitor question-led healthcare videos above that channel's median public views → test original FAQ videos with accurate information.
Output: strategy summary, high-performing topics, packaging patterns, gaps, experiments.`,
  },
  {
    title: 'Module 14 — Experiments',
    category: 'experiments',
    body: `One hypothesis, meaningful alternatives, comparable windows. Title: search vs curiosity. Thumbnail: subject vs result. Opening: direct answer vs problem-led on future videos. Series vs standalone.
Record: objective, hypothesis, variants, primary metric, window, result, limitations, next action. Do not auto-conclude that a later lift was caused by the change.`,
  },
  {
    title: 'Module 15 — Quality and standards',
    category: 'standards',
    body: `Accurate, clear, original, logical. Understandable audio and readable text. No misleading thumbs, fake engagement, copyrighted misuse. Healthcare/finance/legal: flag need for human factual review. Never claim legal or Community Guidelines certification.`,
  },
  {
    title: 'Module 16 — Action planning',
    category: 'experiments',
    body: `P1: strong evidence tied to the selected goal. P2: useful, moderate evidence. P3: experiment needing more data.
Each action: problem, evidence, why it matters, change, how, expected direction (not a number), metric, review period, confidence. Max 5 actions on one results screen.`,
  },
];

export function playbookTextForGoals(goals: string[]) {
  const wanted = new Set<string>(['global', 'standards', 'experiments']);
  for (const goal of goals) {
    for (const category of GOAL_PLAYBOOKS[goal] || []) wanted.add(category);
  }
  return PLAYBOOK_MODULES
    .filter((item) => wanted.has(item.category))
    .map((item) => `[${item.category}] ${item.title}: ${item.body}`)
    .join('\n\n');
}
