import { createHash } from 'crypto';
import { generateAIChat } from '@/lib/ai/gateway';
import { extractJsonText } from '@/lib/ai/json';
import { AI_REVIEW_VERSION, ENGINE_VERSION, type FindingDraft } from './types';

export type AiCacheStore = {
  get(key: string): Promise<unknown | null>;
  set(key: string, value: unknown): Promise<void>;
};

export type AiPageInput = {
  url: string;
  pageType: string;
  viewport: string;
  contentSample: string;
  typography: Record<string, unknown>;
  deterministic: { title: string; rule_code: string; severity: string }[];
  screenshotNote?: string;
};

const SYSTEM = `You review website quality from compact signals and optional screenshot notes.
Return strict JSON only: {"findings":[{"category":"ui"|"ux"|"content","severity":"medium"|"low"|"suggestion","title":"","description":"","recommendation":"","confidence":0.0}]}.
Identify only obvious alignment, hierarchy, spacing, CTA, image-content mismatch, or UX friction.
Do not redesign the site. Do not repeat SEO, accessibility, performance, or broken-link issues.
Keep each finding concise and actionable. If nothing material, return {"findings":[]}.`;

export function aiCacheKey(input: { url: string; contentHash: string; screenshotHash?: string }) {
  return createHash('sha256')
    .update([input.url, input.contentHash, input.screenshotHash || '', ENGINE_VERSION, AI_REVIEW_VERSION].join('|'))
    .digest('hex');
}

export function parseAiFindings(raw: string, pageUrl: string, threshold: number): FindingDraft[] {
  let parsed: { findings?: unknown };
  try {
    parsed = JSON.parse(extractJsonText(raw) || raw);
  } catch {
    return [];
  }
  if (!parsed || !Array.isArray(parsed.findings)) return [];
  const allowed = new Set(['ui', 'ux', 'content']);
  const out: FindingDraft[] = [];
  for (const item of parsed.findings.slice(0, 8)) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const category = String(row.category || 'ux').toLowerCase();
    const confidence = Number(row.confidence ?? 0.5);
    if (!allowed.has(category)) continue;
    const low = confidence < threshold;
    out.push({
      source: 'AI',
      rule_code: low ? 'ai.review_recommended' : `ai.${category}`,
      category: category as FindingDraft['category'],
      severity: low ? 'suggestion' : (['medium', 'low', 'suggestion'].includes(String(row.severity)) ? String(row.severity) as FindingDraft['severity'] : 'suggestion'),
      title: low ? `Review recommended: ${String(row.title || 'Visual issue')}` : String(row.title || 'Visual issue'),
      description: String(row.description || ''),
      recommendation: String(row.recommendation || ''),
      page_url: pageUrl,
      ai_confidence: confidence,
      evidence: { confidence },
    });
  }
  return out;
}

export async function reviewPagesWithAi(input: {
  pages: AiPageInput[];
  contentHashes: Record<string, string>;
  cache: AiCacheStore;
  threshold: number;
  generate?: typeof generateAIChat;
}): Promise<FindingDraft[]> {
  const generate = input.generate || generateAIChat;
  const findings: FindingDraft[] = [];
  for (const page of input.pages) {
    const key = aiCacheKey({ url: page.url, contentHash: input.contentHashes[page.url] || '' });
    const cached = await input.cache.get(key);
    if (cached) {
      findings.push(...parseAiFindings(JSON.stringify(cached), page.url, input.threshold));
      continue;
    }
    const payload = {
      url: page.url,
      pageType: page.pageType,
      viewport: page.viewport,
      typography: page.typography,
      deterministic: page.deterministic.slice(0, 15),
      content: page.contentSample.slice(0, 2000),
      screenshot: page.screenshotNote || 'screenshot omitted; use content and signals only',
    };
    let text = '{"findings":[]}';
    try {
      const result = await generate({
        purpose: 'website-audit-visual',
        json: true,
        temperature: 0.1,
        maxTokens: 700,
        timeoutMs: 25000,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: JSON.stringify(payload) },
        ],
      });
      text = result.text;
    } catch {
      continue;
    }
    let json: unknown = { findings: [] };
    try {
      json = JSON.parse(extractJsonText(text) || text);
    } catch {
      continue;
    }
    await input.cache.set(key, json);
    findings.push(...parseAiFindings(JSON.stringify(json), page.url, input.threshold));
  }
  return findings;
}

export function selectAiPages(pages: { url: string; pageType: string; layoutAnomaly: boolean }[], maxPages: number) {
  const ranked = [...pages].sort((a, b) => scorePage(b) - scorePage(a));
  const picked: typeof pages = [];
  const home = ranked.find((item) => item.pageType === 'home') || ranked[0];
  if (home) picked.push(home);
  for (const page of ranked) {
    if (picked.length >= maxPages) break;
    if (!picked.includes(page)) picked.push(page);
  }
  return picked.slice(0, maxPages);
}

function scorePage(page: { pageType: string; layoutAnomaly: boolean }) {
  let score = 0;
  if (page.pageType === 'home') score += 50;
  if (['contact', 'service', 'checkout'].includes(page.pageType)) score += 20;
  if (page.layoutAnomaly) score += 25;
  return score;
}
