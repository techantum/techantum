import { q } from '../finance/db';
import { FinanceValidationError } from '../finance/errors';
import { PLAYBOOK_MODULES, PLAYBOOK_SOURCE, playbookTextForGoals } from './youtube-master-playbook';

export const YOUTUBE_MASTER_SYSTEM = `You are Hookooh AI Agent: an experienced YouTube Channel Strategist, Content Analyst, and Video Growth Consultant.
You do not merely recap titles, thumbnails, views, likes, and comments. You diagnose Appeal (do viewers choose to watch?), Engagement (do they continue?), and Satisfaction (was it valuable?), then recommend specific improvements for the user's selected goal.

Goal routing:
- Increase Views: investigate content demand, title/thumbnail appeal, and (only if supplied) traffic/retention. Prefer packaging, titles, thumbnails, topics, discovery.
- Improve CTR: packaging first. If CTR/impressions are missing, say so and give a visual-only packaging assessment. Never invent CTR.
- Improve Retention: opening hook, pacing, structure, drop-off hypotheses from captions/description. Do not pivot to unrelated SEO. Never invent a retention curve.
- Increase Engagement: likes/comments quality, discussion prompts, CTA. Do not treat likes as satisfaction.
- Grow Subscribers: reason to return, series, channel identity. Subscriber gains per video are not public.
- Improve Search Visibility: intent, title language, description, tags as support, chapters/playlists.
- Analyze Competitors: public patterns only; original ideas, no copied assets; no private competitor analytics.
- Improve Publishing Strategy: readiness, cadence the creator can sustain, no guaranteed upload-time formula.

Data rules: use only fields in the payload. Public competitor fields are metadata and public counts. Authorized analytics (CTR, impressions, retention, traffic, demographics) exist only when present. Views counting changed on 24 Aug 2026; mention collection date when comparing old vs new totals.
Knowledge vs evidence: a playbook rule is a creative best practice; a finding must cite a public count, OCR, caption, or supplied analytic. Max five major actions. P1/P2/P3. No guaranteed growth. No deceptive clickbait.
Write a consultant briefing a creator can act on without Analytics expertise, plus a numbered how-to for each weaker video on the primary goal.`;

export type TrainingRow = {
  id: string;
  title: string;
  body: string;
  category: string;
  enabled: boolean;
  source_name: string | null;
  created_at?: string;
  updated_at: string;
};

export async function listYoutubeTraining() {
  await ensureYoutubeMasterPlaybook().catch(() => undefined);
  try {
    const { rows } = await q<TrainingRow>(
      undefined,
      `SELECT id, title, body, category, enabled, source_name, created_at::text, updated_at::text
       FROM youtube_ai_training
       ORDER BY enabled DESC, updated_at DESC`,
    );
    return rows;
  } catch {
    try {
      const { rows } = await q<TrainingRow>(
        undefined,
        `SELECT id, title, body, category, enabled, NULL::text AS source_name, created_at::text, updated_at::text
         FROM youtube_ai_training
         ORDER BY enabled DESC, updated_at DESC`,
      );
      return rows;
    } catch {
      return [];
    }
  }
}

export async function ensureYoutubeMasterPlaybook() {
  try {
    await q(
      undefined,
      `DELETE FROM youtube_ai_training a
       USING youtube_ai_training b
       WHERE a.source_name = $1 AND b.source_name = $1 AND a.title = b.title AND a.id > b.id`,
      [PLAYBOOK_SOURCE],
    );
    const existing = await q<{ count: string }>(
      undefined,
      `SELECT COUNT(*)::text AS count FROM youtube_ai_training WHERE source_name=$1`,
      [PLAYBOOK_SOURCE],
    );
    if (Number(existing.rows[0]?.count || 0) >= PLAYBOOK_MODULES.length) return;
  } catch {
    return;
  }
  for (const module of PLAYBOOK_MODULES) {
    const found = await q(
      undefined,
      `SELECT id FROM youtube_ai_training WHERE title=$1 AND source_name=$2 LIMIT 1`,
      [module.title, PLAYBOOK_SOURCE],
    );
    if (found.rows[0]) continue;
    await saveYoutubeTraining({
      title: module.title,
      body: module.body,
      category: module.category,
      enabled: true,
      source_name: PLAYBOOK_SOURCE,
    }, '').catch(() => undefined);
  }
}

export async function enabledTrainingText(goals: string[] = []) {
  await ensureYoutubeMasterPlaybook().catch(() => undefined);
  const builtin = playbookTextForGoals(goals);
  try {
    const { rows } = await q<{ title: string; body: string; category: string }>(
      undefined,
      `SELECT title, body, category FROM youtube_ai_training
       WHERE enabled = TRUE AND COALESCE(source_name,'') <> $1
       ORDER BY updated_at DESC LIMIT 24`,
      [PLAYBOOK_SOURCE],
    );
    const extra = rows.map((row) => `[${row.category}] ${row.title}: ${row.body}`).join('\n\n');
    return extra ? `${builtin}\n\n${extra}` : builtin;
  } catch {
    return builtin;
  }
}

export async function saveYoutubeTraining(body: Record<string, unknown>, userId: string) {
  const title = String(body.title || '').trim();
  const text = String(body.body || '').trim();
  const category = String(body.category || 'packaging').trim() || 'packaging';
  const sourceName = String(body.source_name || body.sourceName || '').trim() || null;
  const actor = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId) ? userId : null;
  if (title.length < 2) throw new FinanceValidationError('Enter a training title.');
  if (text.length < 12) throw new FinanceValidationError('Enter training notes (at least a short paragraph).');
  if (body.id) {
    const { rows } = await q(
      undefined,
      `UPDATE youtube_ai_training SET title=$2, body=$3, category=$4, enabled=$5, source_name=COALESCE($6, source_name), updated_at=NOW() WHERE id=$1 RETURNING *`,
      [body.id, title, text, category, body.enabled !== false, sourceName],
    );
    return rows[0];
  }
  try {
    const { rows } = await q(
      undefined,
      `INSERT INTO youtube_ai_training (title, body, category, enabled, created_by, source_name) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [title, text, category, body.enabled !== false, actor, sourceName],
    );
    return rows[0];
  } catch {
    const { rows } = await q(
      undefined,
      `INSERT INTO youtube_ai_training (title, body, category, enabled, created_by) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [title, text, category, body.enabled !== false, actor],
    );
    return rows[0];
  }
}

function guessTrainingCategory(text: string) {
  const hay = text.toLowerCase();
  if (/thumbnail|thumb/.test(hay)) return 'thumbnails';
  if (/title/.test(hay)) return 'titles';
  if (/\btag\b|seo|description/.test(hay)) return 'seo';
  if (/retention|hook|open/.test(hay)) return 'retention';
  if (/audience|comment|like|cta/.test(hay)) return 'audience';
  if (/standard|brand|voice/.test(hay)) return 'standards';
  return 'packaging';
}

function extractPdfStrings(buffer: Buffer) {
  const raw = buffer.toString('latin1');
  const parts: string[] = [];
  const regex = /\((?:\\.|[^\\)]){3,}\)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(raw))) {
    const value = match[0]
      .slice(1, -1)
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, ' ')
      .replace(/\\t/g, ' ')
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')')
      .replace(/\\\\/g, '\\');
    if (/[A-Za-z]{4,}/.test(value)) parts.push(value);
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

function extractPlaybookText(name: string, buffer: Buffer) {
  const lower = name.toLowerCase();
  if (lower.endsWith('.pdf')) {
    return extractPdfStrings(buffer);
  }
  if (/\.(doc|docx|ppt|pptx)$/i.test(lower)) {
    const ascii = buffer.toString('utf8').replace(/[^\x09\x0a\x0d\x20-\x7e]+/g, ' ');
    const words = ascii.replace(/\s+/g, ' ').trim();
    return words.length >= 40 ? words.slice(0, 12000) : '';
  }
  return buffer.toString('utf8').replace(/^\uFEFF/, '').replace(/\s+/g, ' ').trim();
}

function splitPlaybook(text: string, filename: string) {
  const headingSplit = text.split(/(?=(?:^|\s)#{1,3}\s|[A-Z][A-Za-z0-9 /-]{8,80}:\s)/).map((item) => item.trim()).filter((item) => item.length >= 40);
  const chunks = (headingSplit.length > 1 ? headingSplit : [text]).slice(0, 8);
  return chunks.map((chunk, index) => {
    const title = chunk.slice(0, 80).replace(/[:#]+$/, '').trim() || `${filename.replace(/\.[^.]+$/, '')} ${index + 1}`;
    return { title: title.slice(0, 90), body: chunk.slice(0, 4000) };
  });
}

export async function importYoutubeTrainingFile(form: FormData, userId: string) {
  const title = String(form.get('title') || '').trim();
  const category = String(form.get('category') || '').trim();
  const notes = String(form.get('notes') || '').trim();
  const files = [...form.getAll('files'), form.get('file')].filter((item): item is Blob => item instanceof Blob && item.size > 0);
  if (!files.length && notes.length < 12 && title.length < 2) {
    throw new FinanceValidationError('Add a name and notes, or upload a file.');
  }
  const saved = [];
  if (!files.length) {
    saved.push(await saveYoutubeTraining({
      title: title || 'Training note',
      body: notes || title,
      category: category || 'standards',
      enabled: true,
    }, userId));
    return { imported: saved.length, rows: saved };
  }
  for (const file of files) {
    const name = 'name' in file && typeof file.name === 'string' ? file.name : 'playbook.txt';
    if (!/\.(txt|md|csv|json|pdf|doc|docx|ppt|pptx)$/i.test(name)) {
      throw new FinanceValidationError('Upload PDF, DOC, DOCX, TXT, PPT, or PPTX.');
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.byteLength > 10_000_000) throw new FinanceValidationError('Keep each file under 10 MB.');
    const extracted = extractPlaybookText(name, buffer);
    const body = [notes, extracted].filter(Boolean).join('\n\n').trim();
    if (body.length < 12) {
      throw new FinanceValidationError(`Could not read text from ${name}. Add notes that capture the key points.`);
    }
    saved.push(await saveYoutubeTraining({
      title: title || name.replace(/\.[^.]+$/, ''),
      body: body.slice(0, 12000),
      category: category || guessTrainingCategory(`${title} ${body}`),
      enabled: true,
      source_name: name,
    }, userId));
  }
  return { imported: saved.length, rows: saved };
}

export async function deleteYoutubeTraining(id: string) {
  await q(undefined, `DELETE FROM youtube_ai_training WHERE id=$1`, [id]);
  return { ok: true };
}
