import { createHash } from 'crypto';
import { generateAIChat } from '@/lib/ai/gateway';
import {
  STANDARDS_VERSION,
  SYSTEM_PROMPT,
  TECHANTUM_STANDARD_VERSION,
  WEB_MASTER_AGENT_VERSION,
  WEB_MASTER_PROMPT_VERSION,
  type Skill,
} from './constants';
import { ENGINE_VERSION, type ExtractedPage, type FindingDraft } from '../types';
import { buildPageEvidence, templateHash, type PageEvidence } from './evidence';
import { formatKnowledge, retrieveForSkills } from './retrieval';
import { SEED_CHUNKS, type SeedChunk } from './knowledge-seed';
import { routeSkills, selectRepresentativePages } from './routing';
import { sanitizeText } from './sanitize';
import { classifyDeterministic, parseAgentJson, validateAgentFindings, type WebMasterFinding } from './validator';
import { consolidateFindings, managementSummary, preferDeterministic } from './consolidate';

export type GenerateFn = typeof generateAIChat;

export type AgentSettings = {
  agent_enabled: boolean;
  max_ai_pages: number;
  confidence_threshold: number;
  content_character_limit: number;
  review_uiux: boolean;
  review_content: boolean;
  review_images: boolean;
  review_seo_interpretation: boolean;
};

export const DEFAULT_AGENT_SETTINGS: AgentSettings = {
  agent_enabled: true,
  max_ai_pages: 5,
  confidence_threshold: 0.6,
  content_character_limit: 2000,
  review_uiux: true,
  review_content: true,
  review_images: true,
  review_seo_interpretation: true,
};

export function cacheKey(input: {
  url: string;
  contentHash: string;
  screenshotHash?: string;
  skills: Skill[];
}) {
  return createHash('sha256')
    .update([
      input.url,
      input.contentHash,
      input.screenshotHash || '',
      input.skills.join(','),
      STANDARDS_VERSION,
      WEB_MASTER_PROMPT_VERSION,
      ENGINE_VERSION,
    ].join('|'))
    .digest('hex');
}

export function versions(modelVersion?: string | null) {
  return {
    agent_version: WEB_MASTER_AGENT_VERSION,
    prompt_version: WEB_MASTER_PROMPT_VERSION,
    standards_version: STANDARDS_VERSION,
    techantum_standard_version: TECHANTUM_STANDARD_VERSION,
    engine_version: ENGINE_VERSION,
    model_version: modelVersion || null,
  };
}

function userPrompt(skills: Skill[], evidence: PageEvidence, knowledge: string, extra: string) {
  return JSON.stringify({
    skills,
    instructions: extra,
    knowledge,
    evidence,
    output: {
      findings: [{
        category: 'ui',
        finding_type: 'ai_recommendation',
        severity: 'medium',
        title: '',
        description: '',
        recommendation: '',
        confidence: 0.8,
        evidence_type: 'visual',
        standard_reference: { name: 'Techantum Best Practice', rule: 'UI-TYPO-001' },
        page_url: evidence.page.url,
        viewport: evidence.page.viewport,
        selector: null,
        requires_manual_review: false,
        suggested_ticket_type: 'improvement',
      }],
    },
  });
}

const SKILL_HINT: Record<Skill, string> = {
  technical: 'Interpret deterministic SEO/accessibility/performance/forms/errors. Do not invent missing titles, H1s, canonicals, sitemaps, robots, or broken links. You may judge title/meta quality and implementation advice. Never claim WCAG compliance.',
  uiux: 'Judge visual consistency, spacing, hierarchy, CTA, mobile stacking, and important-image relevance from summaries/screenshots. Image relevance is AI_RECOMMENDATION. Do not call a design ugly. Do not mark Critical without unusable-layout evidence.',
  content: 'Review compact content for spelling, grammar, placeholders already missed, heading quality, and intent. Do not rewrite the site. Do not re-check title/H1 existence.',
};

export async function reviewPageWithWebMaster(input: {
  evidence: PageEvidence;
  skills: Skill[];
  chunks?: SeedChunk[];
  threshold: number;
  generate?: GenerateFn;
  cacheGet?: (key: string) => Promise<unknown | null>;
  cacheSet?: (key: string, value: unknown) => Promise<void>;
  contentHash: string;
}): Promise<{ findings: WebMasterFinding[]; cached: boolean; failed: boolean; model?: string | null }> {
  if (!input.skills.length) return { findings: [], cached: false, failed: false };
  const key = cacheKey({ url: input.evidence.page.url, contentHash: input.contentHash, skills: input.skills });
  if (input.cacheGet) {
    const cached = await input.cacheGet(key);
    if (cached) {
      return { findings: validateAgentFindings(cached as { findings: unknown[] }, input.evidence.page.url, input.threshold), cached: true, failed: false };
    }
  }
  const knowledge = formatKnowledge(retrieveForSkills(input.skills, input.chunks || SEED_CHUNKS));
  const generate = input.generate || generateAIChat;
  try {
    const result = await generate({
      purpose: 'web-master-agent',
      json: true,
      temperature: 0.1,
      maxTokens: 900,
      timeoutMs: 25000,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt(input.skills, input.evidence, knowledge, input.skills.map((skill) => SKILL_HINT[skill]).join(' ')) },
      ],
    });
    const parsed = parseAgentJson(result.text);
    if (!parsed) return { findings: [], cached: false, failed: true, model: result.model };
    if (input.cacheSet) await input.cacheSet(key, parsed);
    return {
      findings: validateAgentFindings(parsed, input.evidence.page.url, input.threshold),
      cached: false,
      failed: false,
      model: result.model,
    };
  } catch {
    return { findings: [], cached: false, failed: true };
  }
}

export async function consolidateWithWebMaster(input: {
  findings: WebMasterFinding[];
  generate?: GenerateFn;
  threshold: number;
}): Promise<{ summary: string; extra: WebMasterFinding[]; failed: boolean }> {
  const compact = input.findings.slice(0, 40).map((item) => ({
    type: item.finding_type,
    severity: item.severity,
    title: item.title,
    category: item.category,
    url: item.page_url,
  }));
  const generate = input.generate || generateAIChat;
  try {
    const result = await generate({
      purpose: 'web-master-consolidate',
      json: true,
      temperature: 0.1,
      maxTokens: 500,
      timeoutMs: 20000,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify({
          task: 'Deduplicate and group site-wide issues. Return findings that are site-wide groupings only. No screenshots. JSON {findings:[], management_summary:""}',
          findings: compact,
        }) },
      ],
    });
    const parsed = parseAgentJson(result.text);
    if (!parsed) return { summary: '', extra: [], failed: true };
    return {
      summary: typeof parsed.summary === 'string' ? parsed.summary : sanitizeText(JSON.stringify(parsed.summary || ''), 800),
      extra: validateAgentFindings(parsed, '', input.threshold),
      failed: false,
    };
  } catch {
    return { summary: '', extra: [], failed: true };
  }
}

export async function runWebMaster(input: {
  pages: ExtractedPage[];
  findings: FindingDraft[];
  settings: AgentSettings;
  hashes: Record<string, string>;
  screenshots: Record<string, boolean>;
  layoutFlags: Record<string, boolean>;
  generate?: GenerateFn;
  chunks?: SeedChunk[];
  cacheGet?: (key: string) => Promise<unknown | null>;
  cacheSet?: (key: string, value: unknown) => Promise<void>;
  skipAi?: boolean;
}): Promise<{
  findings: WebMasterFinding[];
  summary: Record<string, unknown>;
  versions: ReturnType<typeof versions>;
  ai_review_status: 'completed' | 'partial' | 'failed' | 'skipped';
  selected_urls: string[];
}> {
  const deterministic = input.findings.map(classifyDeterministic);
  if (!input.settings.agent_enabled || input.skipAi) {
    const merged = consolidateFindings(deterministic);
    return {
      findings: merged,
      summary: managementSummary(merged, {}, null),
      versions: versions(),
      ai_review_status: 'skipped',
      selected_urls: [],
    };
  }

  const candidates = input.pages.map((page) => ({
    url: page.normalizedUrl,
    pageType: page.pageType,
    layoutAnomaly: Boolean(input.layoutFlags[page.normalizedUrl]),
    technicalCount: input.findings.filter((item) => item.page_url === page.normalizedUrl).length,
    templateHash: templateHash(page),
    page,
  }));
  const selected = selectRepresentativePages(candidates, input.settings.max_ai_pages);
  const aiAll: WebMasterFinding[] = [];
  let failed = 0;
  let ok = 0;
  let model: string | null = null;

  for (const item of selected) {
    const skills = routeSkills({
      pageType: item.pageType,
      technicalCount: item.technicalCount,
      layoutAnomaly: item.layoutAnomaly,
      hasScreenshot: Boolean(input.screenshots[item.url]),
      contentChars: item.page.contentSample.length,
      formCount: item.page.forms.length,
    }, {
      uiux: input.settings.review_uiux,
      content: input.settings.review_content,
      seo: input.settings.review_seo_interpretation,
    });
    if (!input.settings.review_images) {
      /* image review is part of uiux prompt; still allowed via skill */
    }
    const evidence = buildPageEvidence({
      page: item.page,
      viewport: 'desktop',
      findings: input.findings,
      hasScreenshot: Boolean(input.screenshots[item.url]),
      maxChars: input.settings.content_character_limit,
    });
    const reviewed = await reviewPageWithWebMaster({
      evidence,
      skills,
      chunks: input.chunks,
      threshold: input.settings.confidence_threshold,
      generate: input.generate,
      cacheGet: input.cacheGet,
      cacheSet: input.cacheSet,
      contentHash: input.hashes[item.url] || '',
    });
    if (reviewed.failed) failed += 1;
    else ok += 1;
    if (reviewed.model) model = reviewed.model;
    aiAll.push(...reviewed.findings);
  }

  let extra: WebMasterFinding[] = [];
  let aiSummary = '';
  if (ok && selected.length) {
    const consolidated = await consolidateWithWebMaster({
      findings: [...deterministic, ...aiAll],
      generate: input.generate,
      threshold: input.settings.confidence_threshold,
    });
    extra = consolidated.extra;
    aiSummary = consolidated.summary;
    if (consolidated.failed) failed += 1;
  }

  const merged = consolidateFindings(preferDeterministic([...aiAll, ...extra], deterministic));
  const status = failed && ok ? 'partial' : failed && !ok ? 'failed' : 'completed';
  return {
    findings: merged,
    summary: { ...managementSummary(merged, {}, null), consolidation_notes: aiSummary },
    versions: versions(model),
    ai_review_status: status,
    selected_urls: selected.map((item) => item.url),
  };
}
