import { generateAIChat } from '@/lib/ai/gateway';
import {
  HOOKOOH_NO_PROJECT,
  HOOKOOH_OFF_TOPIC,
  isHookoohOffTopic,
  isHookoohProjectAsk,
  retrieveHookoohKnowledge,
} from './knowledge';

export const HOOKOOH_SUGGESTIONS = [
  'How can I increase YouTube views?',
  'How do I improve my video retention?',
  'What makes a good YouTube thumbnail?',
  'Suggest SEO-friendly video titles.',
  'How often should I post videos?',
  'How can I grow subscribers?',
  'How do I analyze competitor videos?',
  'What is a good engagement rate?',
  'How can I improve my video descriptions?',
  'What are the best practices for YouTube Shorts?',
];

const IDENTITY = `You are Hookooh AI Agent, an experienced YouTube consultant in a live chat.
Write like a knowledgeable person talking to one creator. Do not sound like a report, a playbook, or an AI system.

Style:
- Answer the question directly. No recap of the question. Do not introduce yourself.
- Simple professional English. Short paragraphs. 3–5 practical suggestions when advice is useful.
- Prefer a brief opener, then bullets or numbered steps, then one short tip if it helps.
- Bold only a few key phrases. No headings, tables, emojis, separators, JSON, or source lists.
- Do not end with a generic “what would you like to explore” question unless the user is off-topic.
- Simple questions: 30–80 words. General guidance: 60–120 words. Complex: up to 200 words. Longer only if they ask for detail.

Knowledge:
- Use only the approved YouTube mastery notes provided as internal reference. Paraphrase. Never copy paragraphs.
- Never mention module numbers, document titles, “Global Agent Behavior”, playbook names, or sources.
- You have no access to this user’s projects, channels, imported videos, analytics, agencies, or live YouTube data. Never invent or quote those.
- If they ask you to analyse their project, imported videos, or channel data, explain what to check in YouTube Studio. Do not claim you reviewed their files.
- YouTube only. Off-topic: reply exactly with the off-topic line provided.
- Goal routing: views → topics, titles, thumbnails, appeal, discovery. Retention → hook, pacing, structure, promise. Engagement → value, prompts, community. SEO → intent, titles, descriptions. Subscribers → consistent value, series, reason to return. Thumbnails → subject, contrast, short text, mobile, title match.
- Do not mix every category into every answer. Do not guarantee growth or algorithm outcomes. Do not fabricate metrics. If the notes do not cover it, say so briefly.

Off-topic line:
${HOOKOOH_OFF_TOPIC}`;

export function sanitizeHookoohText(text: string) {
  return String(text || '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*]{3,}\s*$/gm, '')
    .replace(/Module\s+\d+\s*[—\-:][^\n]*/gi, '')
    .replace(/\b(Global agent behavior|(?:Revealeo|Hookooh) YouTube Mastery Playbook v[\d.]+)\b/gi, '')
    .replace(/^\s*Sources?:.*$/gim, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function consultantFallback(question: string, goals: string[]) {
  const hay = question.toLowerCase();
  if (/\btitle ideas?\b/.test(hay) || (hay.includes('title') && hay.includes('suggest'))) {
    return `Here are five title patterns that stay clear and searchable:

1. **How to** [result] without [common struggle]
2. **Why** [problem] happens (and what to do)
3. **[Number] ways** to [desired outcome]
4. **The mistake** that costs you [result]
5. **[Topic] explained** for [your audience]

Keep each title specific to the video. The thumbnail should show the subject; the title should explain why it is worth watching.`;
  }
  if (hay.includes('ctr') || hay.includes('click-through') || hay.includes('click through')) {
    return `YouTube CTR is the share of impressions that become clicks.

It mainly reflects whether your **title and thumbnail** make people want to open the video.

Improve it by using one clear subject, readable text, contrast, and a title that matches the visual. Check CTR in YouTube Studio, then compare videos in the same topic instead of chasing a single “good” number.`;
  }
  if (hay.includes('best time') || hay.includes('when to upload') || hay.includes('upload')) {
    return `There is no universal best upload time. Use YouTube Studio to see when **your** audience is usually online, then publish a little before that window.

Stay consistent so viewers know when to expect you. Quality and packaging matter more than the exact hour.`;
  }
  if (goals.includes('views') && !goals.includes('retention')) {
    return `To increase YouTube views, focus on these five areas:

1. **Choose relevant topics** — Create videos your target audience wants to watch.
2. **Improve titles** — Make them clear, interesting, and relevant.
3. **Design better thumbnails** — Use strong visuals and easy-to-read text.
4. **Hook viewers early** — Make the first few seconds engaging.
5. **Stay consistent** — Publish quality content regularly and learn from your results.

**Quick tip:** Focus on making videos people want to click and continue watching.`;
  }
  if (goals.includes('ctr') && (hay.includes('thumbnail') || hay.includes('thumbnails'))) {
    return `A good YouTube thumbnail should be simple, clear, and visually appealing.

- Use one main subject.
- Choose colors with good contrast.
- Keep text short and readable.
- Make the visual relevant to the video.
- Ensure it looks good on mobile screens.

**Quick tip:** Your thumbnail should catch attention while your title explains why the video is worth watching.`;
  }
  if (goals.includes('retention')) {
    return `To improve YouTube audience retention:

- **Start strong:** Capture interest in the first few seconds.
- **Skip long introductions:** Get to the main topic quickly.
- **Maintain good pacing:** Remove unnecessary pauses and repetition.
- **Keep viewers interested:** Use relevant visuals, examples, and storytelling.
- **Deliver value:** Make sure the video fulfills its title and thumbnail promise.

**Quick tip:** Review where viewers stop watching in YouTube Studio and improve those sections in future videos.`;
  }
  if (goals.includes('subscribers')) {
    return `To grow subscribers, give people a reason to come back.

- Publish consistent value on a clear topic.
- Use series so viewers know what comes next.
- Deliver what the title and thumbnail promise.
- End with a natural reason to subscribe, not a hard sell.
- Learn from which videos convert in YouTube Studio.

New channels grow faster from a focused niche than from posting everything.`;
  }
  if (goals.includes('engagement')) {
    return `To increase likes and comments, make the video worth reacting to.

- Deliver a clear point of view or useful result.
- Ask one specific question related to the topic.
- Reply to early comments to start the discussion.
- Pin a comment that continues the conversation.
- Keep the request natural — forced “like and comment” prompts rarely work.`;
  }
  if (goals.includes('discoverability')) {
    return `YouTube SEO helps your videos become more discoverable for relevant searches.

Focus on:

- Using clear, relevant video titles.
- Writing useful descriptions.
- Understanding what viewers search for.
- Adding accurate captions and chapters where appropriate.
- Creating content that satisfies the viewer's search intent.

**Remember:** Good SEO helps YouTube understand your content, but viewer satisfaction also matters.`;
  }
  if (hay.includes('new youtube channel') || hay.includes('grow a new')) {
    return `To grow a new YouTube channel:

1. Pick a focused audience and topic.
2. Publish on a schedule you can keep.
3. Package each video with a clear title and thumbnail.
4. Hook viewers in the first seconds and deliver the promise.
5. Study which videos get watch time, then make more like those.

Avoid spreading across unrelated topics until the channel has a clear identity.`;
  }
  if (goals.includes('publishing')) {
    return `Publish on a schedule you can keep, and use Studio to see when your audience is active.

Consistency and packaging matter more than posting every day. Batch work if that helps you stay regular without lowering quality.`;
  }
  if (goals.includes('competitors')) {
    return `Study competitors as a technique, not as copying.

Look at their titles, thumbnails, topics, and how they open videos. Note patterns that get clicks and watch time, then apply the *method* to your own audience and style. Do not paste their scripts or branding.`;
  }
  return `Here is practical YouTube guidance for that question:

- Keep the topic relevant to a specific audience.
- Make the title and thumbnail clear and aligned.
- Hook viewers quickly and deliver the promised value.
- Review Studio metrics (views, CTR, average view duration, retention) after you publish.

Stay focused on one improvement at a time rather than changing everything at once.`;
}

export async function answerHookooh(input: {
  question: string;
  history: { role: 'user' | 'assistant'; content: string }[];
}) {
  const question = String(input.question || '').trim();
  if (question.length < 2) {
    return { text: HOOKOOH_OFF_TOPIC, sources: [] as { title: string; category: string }[] };
  }
  if (isHookoohOffTopic(question)) {
    return { text: HOOKOOH_OFF_TOPIC, sources: [] as { title: string; category: string }[] };
  }
  if (isHookoohProjectAsk(question)) {
    return { text: HOOKOOH_NO_PROJECT, sources: [] as { title: string; category: string }[] };
  }
  const knowledge = await retrieveHookoohKnowledge(question);
  try {
    const generated = await generateAIChat({
      purpose: 'hookooh_chat',
      temperature: 0.4,
      maxTokens: 420,
      timeoutMs: 22000,
      messages: [
        { role: 'system', content: IDENTITY },
        {
          role: 'system',
          content: `Internal reference only. Do not quote labels. Focus: ${knowledge.goals.join(', ') || 'general YouTube guidance'}\n\n${knowledge.playbook}\n\n${knowledge.excerpts.map((item) => item.excerpt).join('\n\n')}`,
        },
        ...input.history.slice(-8).map((item) => ({ role: item.role, content: item.content })),
        { role: 'user', content: question },
      ],
    });
    const text = sanitizeHookoohText(generated.text);
    if (text.length < 40) throw new Error('empty_hookooh_reply');
    return { text, sources: [] as { title: string; category: string }[] };
  } catch {
    return {
      text: consultantFallback(question, knowledge.goals),
      sources: [] as { title: string; category: string }[],
    };
  }
}
