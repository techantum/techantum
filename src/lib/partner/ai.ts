import { generateAIChat } from '@/lib/ai';
import { stripVendorBranding } from './document-branding';
import type { RequirementRecord } from './types';

const ARCHITECT_PROMPT = `You are a senior solution architect writing a white-label Scope of Work that a sales partner will send to their end client.

Write a complete, professional Scope of Work from the requirement answers provided.

Required sections:
1. Executive Summary
2. Business Background & Problem Statement
3. Objectives
4. Project Scope (In Scope)
5. Modules & Features
6. User Roles & Workflows
7. Recommended Technology Approach
8. Integrations
9. Timeline & Milestones
10. Deliverables
11. Acceptance Criteria
12. Testing Approach
13. Deployment Approach
14. Training & Support
15. Assumptions
16. Out of Scope / Exclusions
17. Risks
18. Future Enhancements
19. Open Questions

Rules:
- Do not mention any vendor, agency, studio, or partner company name.
- Do not mention TechAntum, Techantum, or any similar brand.
- Do not include letterhead, logos, prepared-by lines, or approval blocks that name a company.
- Refer to the receiving organization only as "the client".
- Refer to delivery only as "the project team".
- Use clean markdown, tables where useful, and specific language based on the submitted answers.`;

export { stripVendorBranding } from './document-branding';

export function buildRequirementSummary(
  requirement: RequirementRecord,
  answers: Record<string, unknown>
) {
  const modules = requirement.modules_data ?? answers.modules ?? [];
  return {
    businessOverview: {
      industry: answers.industry ?? requirement.industry,
      country: answers.country ?? requirement.country,
      painPoints: answers.pain_points ?? requirement.business_data?.pain_points,
      goals: answers.goals ?? requirement.business_data?.goals,
    },
    projectOverview: {
      name: requirement.project_name ?? answers.project_name,
      budget: requirement.budget_range ?? answers.budget_range,
      priority: requirement.priority ?? answers.priority,
      timeline: requirement.timeline ?? answers.expected_launch,
    },
    selectedModules: Array.isArray(modules) ? modules : [],
    selectedFeatures: Object.entries(answers)
      .filter(([k]) =>
        !['company_name', 'industry', 'country', 'pain_points', 'goals', 'project_name', 'budget_range', 'priority', 'expected_launch', 'modules', 'contact_name', 'contact_email', 'contact_phone'].includes(k)
      )
      .map(([key, value]) => ({ key, value })),
    recommendedPackage: requirement.partner_packages?.name ?? null,
    recommendedService: requirement.partner_service_categories?.name ?? null,
    estimatedComplexity: estimateComplexity(answers, modules as string[]),
    assumptions: [
      'The client will provide content, branding assets, and timely feedback.',
      'Third-party API credentials will be provided by the client where applicable.',
      'Scope excludes ongoing hosting costs unless specified.',
    ],
    risks: [
      'Scope may expand if additional modules are requested mid-project.',
      'Integrations may be delayed if third-party APIs are unavailable.',
    ],
  };
}

function estimateComplexity(
  answers: Record<string, unknown>,
  modules: string[]
): 'Low' | 'Medium' | 'High' | 'Enterprise' {
  let score = modules.length;
  if (answers.need_payment === 'Yes') score += 2;
  if (answers.need_login === 'Yes') score += 2;
  if (answers.erp_crm === 'Yes') score += 3;
  if (Number(answers.api_integrations) > 5) score += 2;
  if (score >= 10) return 'Enterprise';
  if (score >= 6) return 'High';
  if (score >= 3) return 'Medium';
  return 'Low';
}

function extraNamesToStrip(requirement: RequirementRecord, answers: Record<string, unknown>): string[] {
  return [
    requirement.partners?.company_name,
    requirement.partners?.contact_name,
    answers.company_name,
    answers.contact_name,
    requirement.business_data?.company_name,
  ].map((value) => (typeof value === 'string' ? value : '')).filter(Boolean);
}

export function generateAiPrompt(
  requirement: RequirementRecord,
  answers: Record<string, unknown>,
  summary: ReturnType<typeof buildRequirementSummary>
): string {
  const safeAnswers = { ...answers };
  delete safeAnswers.company_name;
  delete safeAnswers.contact_name;
  delete safeAnswers.contact_email;
  delete safeAnswers.contact_phone;

  return `${ARCHITECT_PROMPT}

---
REFERENCE: ${requirement.reference_id}
SERVICE: ${summary.recommendedService ?? '—'}
PACKAGE: ${summary.recommendedPackage ?? '—'}
COMPLEXITY: ${summary.estimatedComplexity}

QUESTIONNAIRE (JSON):
${JSON.stringify(safeAnswers, null, 2)}

SUMMARY:
${JSON.stringify(summary, null, 2)}
`;
}

export async function generateSowContent(
  requirement: RequirementRecord,
  answers: Record<string, unknown>,
  summary: ReturnType<typeof buildRequirementSummary>,
  promptText: string
): Promise<string> {
  const names = extraNamesToStrip(requirement, answers);
  try {
    const generated = await generateAIChat({
      purpose: 'partner_sow',
      temperature: 0.35,
      maxTokens: 5000,
      timeoutMs: 60000,
      messages: [
        { role: 'system', content: ARCHITECT_PROMPT },
        { role: 'user', content: promptText },
      ],
    });
    if (generated.text) return stripVendorBranding(generated.text, names);
  } catch {
    /* fall through to template */
  }

  return stripVendorBranding(buildTemplateSow(requirement, answers, summary), names);
}

function buildTemplateSow(
  requirement: RequirementRecord,
  answers: Record<string, unknown>,
  summary: ReturnType<typeof buildRequirementSummary>
): string {
  const modules = summary.selectedModules.length
    ? summary.selectedModules
    : ['To be defined'];

  const functionalRows = summary.selectedFeatures
    .slice(0, 20)
    .map((f) => `| ${f.key.replace(/_/g, ' ')} | ${String(f.value).replace(/\|/g, '/')} |`);

  const functionalTable =
    functionalRows.length > 0
      ? `| Requirement | Response |\n|-------------|----------|\n${functionalRows.join('\n')}`
      : '| Requirement | Response |\n|-------------|----------|\n| Detailed in questionnaire | See submitted answers |';

  const moduleTable = `| Module | Included |\n|--------|----------|\n${modules.map((m) => `| ${m} | Yes |`).join('\n')}`;

  return `# Scope of Work

**Reference:** ${requirement.reference_id}  
**Project:** ${requirement.project_name ?? 'Untitled Project'}  
**Date:** ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}

---

## 1. Executive Summary

This Scope of Work describes a **${summary.recommendedService ?? 'digital solution'}** for the client, based on the submitted requirement.

It defines objectives, deliverables, timeline, and acceptance criteria so both parties can review and approve the same understanding of scope.

| Item | Detail |
|------|--------|
| Recommended Package | ${summary.recommendedPackage ?? 'Custom'} |
| Estimated Complexity | ${summary.estimatedComplexity} |
| Budget | ${summary.projectOverview.budget ?? 'To be confirmed'} |
| Priority | ${summary.projectOverview.priority ?? 'Medium'} |
| Target Launch | ${summary.projectOverview.timeline ?? 'To be agreed'} |

---

## 2. Business Background

| Field | Information |
|-------|-------------|
| Industry | ${summary.businessOverview.industry ?? '—'} |
| Country | ${summary.businessOverview.country ?? '—'} |
| Business Size | ${String(answers.business_size ?? '—')} |

### Current Challenges
${summary.businessOverview.painPoints ?? 'As captured during discovery.'}

### Objectives
${summary.businessOverview.goals ?? 'As captured during discovery.'}

---

## 3. Project Scope

### 3.1 Selected Modules

${moduleTable}

### 3.2 Functional Requirements

${functionalTable}

### 3.3 Target Audience
${String(answers.target_audience ?? 'As specified in the requirement')}

---

## 4. Recommended Technology Approach

| Layer | Recommendation |
|-------|----------------|
| Frontend | Next.js / React — responsive, SEO-ready |
| Backend | Node.js with a REST API |
| Database | PostgreSQL |
| Hosting | Cloud (AWS, Azure, or equivalent) |
| Integrations | As specified in the requirement |

---

## 5. Timeline & Milestones

| Phase | Duration | Key Deliverable |
|-------|----------|-----------------|
| Discovery & Design | 2–3 weeks | Wireframes and UI/UX approval |
| Development | 4–8 weeks | Working application or website |
| Testing & QA | 1–2 weeks | Test reports and defect fixes |
| Deployment | 1 week | Production launch |
| Training & Handover | 1 week | Documentation and admin training |

---

## 6. Deliverables

| # | Deliverable | Description |
|---|-------------|-------------|
| 1 | Solution Build | Fully functional ${summary.recommendedService ?? 'solution'} per agreed scope |
| 2 | Source Code | Complete codebase with deployment documentation |
| 3 | Training | Admin / user training session |
| 4 | Support | Post-launch support per the selected package |

---

## 7. Acceptance Criteria

- All in-scope features work as documented in Section 3
- Cross-browser and mobile responsive where applicable
- Agreed performance targets are met
- Successful user acceptance testing and client sign-off

---

## 8. Assumptions

${summary.assumptions.map((a) => `- ${a}`).join('\n')}

---

## 9. Out of Scope

- Features not explicitly listed in this document
- Third-party subscription and licensing costs
- Content creation unless specified
- Ongoing maintenance beyond the package support period

---

## 10. Risks

| Risk | Mitigation |
|------|------------|
${summary.risks.map((r) => `| ${r} | Review during delivery and confirm changes in writing |`).join('\n')}
`;
}
