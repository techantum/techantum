import { GOLDEN_CASES, type GoldenCase } from './golden';
import { routeSkills, selectRepresentativePages } from './routing';
import { retrieveForSkills, categoriesForIssue } from './retrieval';
import { validateAgentFindings } from './validator';
import { SEED_CHUNKS } from './knowledge-seed';
import { runWebMaster, type GenerateFn } from './agent';
import { extractPage } from '../html';

export function evaluateRouting() {
  return {
    technical_only: routeSkills({ pageType: 'other', technicalCount: 3, layoutAnomaly: false, hasScreenshot: false, contentChars: 10, formCount: 0 }, { uiux: true, content: true, seo: true }),
    homepage: routeSkills({ pageType: 'home', technicalCount: 0, layoutAnomaly: false, hasScreenshot: true, contentChars: 400, formCount: 0 }, { uiux: true, content: true, seo: true }),
  };
}

export function scoreCase(expected: string[], actual: string[]) {
  const exp = new Set(expected);
  const act = new Set(actual);
  let tp = 0;
  for (const item of act) if (exp.has(item) || [...exp].some((want) => item.includes(want) || want.includes(item))) tp += 1;
  const fp = Math.max(0, act.size - tp);
  const missed = Math.max(0, exp.size - tp);
  const precision = act.size ? tp / act.size : 1;
  const recall = exp.size ? tp / exp.size : 1;
  return { tp, fp, missed, precision, recall };
}

export async function runGoldenSuite(input?: { generate?: GenerateFn; live?: boolean; cases?: GoldenCase[] }) {
  if (input?.live && process.env.AI_INTEGRATION_TEST !== 'true') {
    throw new Error('Live Web Master evaluation requires AI_INTEGRATION_TEST=true');
  }
  const cases = input?.cases || GOLDEN_CASES;
  const results = [];
  for (const testCase of cases) {
    const page = extractPage(testCase.html, testCase.url, 200);
    const deterministic = testCase.deterministic || [];
    const generate: GenerateFn = input?.generate
      || (input?.live ? (await import('@/lib/ai/gateway')).generateAIChat : async () => ({
        text: JSON.stringify({ findings: testCase.mock_ai || [] }),
        provider: 'openai',
        model: 'mock',
        id: 'mock',
        usedFallback: false,
        attempts: [],
      }));
    const ran = await runWebMaster({
      pages: [page],
      findings: deterministic,
      settings: {
        agent_enabled: true,
        max_ai_pages: 5,
        confidence_threshold: 0.6,
        content_character_limit: 2000,
        review_uiux: true,
        review_content: true,
        review_images: true,
        review_seo_interpretation: true,
      },
      hashes: { [page.normalizedUrl]: 'hash' },
      screenshots: { [page.normalizedUrl]: true },
      layoutFlags: { [page.normalizedUrl]: Boolean(testCase.layoutAnomaly) },
      generate,
      skipAi: testCase.skipAi,
    });
    const actualCodes = ran.findings.map((item) => item.rule_code);
    const scored = scoreCase(testCase.expected_rule_parts, actualCodes);
    results.push({
      case_key: testCase.key,
      ...scored,
      actual: actualCodes,
      expected: testCase.expected_rule_parts,
      types: ran.findings.map((item) => item.finding_type),
      average_confidence: avg(ran.findings.map((item) => item.ai_confidence || 0)),
    });
  }
  const precision = avg(results.map((item) => item.precision));
  const recall = avg(results.map((item) => item.recall));
  return {
    used_live_ai: Boolean(input?.live),
    precision,
    recall,
    false_positives: results.reduce((sum, item) => sum + item.fp, 0),
    missed: results.reduce((sum, item) => sum + item.missed, 0),
    severity_agreement: null,
    average_confidence: avg(results.map((item) => item.average_confidence)),
    cases: results,
  };
}

function avg(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, n) => sum + n, 0) / values.length;
}

export { retrieveForSkills, categoriesForIssue, validateAgentFindings, selectRepresentativePages, SEED_CHUNKS };
