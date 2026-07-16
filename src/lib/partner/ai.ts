import type { RequirementRecord } from './types';

const ARCHITECT_PROMPT = `You are a Senior Solution Architect with 20 years of experience at TechAntum Solutions.

Based on the following client requirements, generate a complete, professional Scope of Work document suitable for client approval.

Include these sections:
1. Executive Summary
2. Business Background & Problem Statement
3. Objectives
4. Project Scope (In Scope)
5. Modules & Features
6. User Roles & Workflows
7. Technology Stack Recommendation
8. Integrations
9. Timeline & Milestones
10. Deliverables
11. Acceptance Criteria
12. Testing Strategy
13. Deployment Strategy
14. Training & Support
15. Assumptions
16. Out of Scope / Exclusions
17. Risk Analysis
18. Future Enhancements
19. Questions to Clarify

Use clean markdown formatting with tables where appropriate (timeline, deliverables, tech stack, approval sign-off).
Write in professional business language. Be specific to the client's industry and requirements.`;

export function buildRequirementSummary(
  requirement: RequirementRecord,
  answers: Record<string, unknown>
) {
  const modules = requirement.modules_data ?? answers.modules ?? [];
  return {
    businessOverview: {
      company: answers.company_name ?? requirement.business_data?.company_name,
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
      .filter(([k, v]) => !['company_name', 'industry', 'country', 'pain_points', 'goals', 'project_name', 'budget_range', 'priority', 'expected_launch', 'modules'].includes(k))
      .map(([key, value]) => ({ key, value })),
    recommendedPackage: requirement.partner_packages?.name ?? null,
    recommendedService: requirement.partner_service_categories?.name ?? null,
    estimatedComplexity: estimateComplexity(answers, modules as string[]),
    assumptions: [
      'Client will provide content, branding assets, and timely feedback.',
      'Third-party API credentials will be provided by the client where applicable.',
      'Scope excludes ongoing hosting costs unless specified.',
    ],
    risks: [
      'Scope creep if additional modules are requested mid-project.',
      'Integration delays if third-party APIs are unavailable.',
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

export function generateAiPrompt(
  requirement: RequirementRecord,
  answers: Record<string, unknown>,
  summary: ReturnType<typeof buildRequirementSummary>
): string {
  return `${ARCHITECT_PROMPT}

---
REFERENCE: ${requirement.reference_id}
PARTNER: ${requirement.partners?.company_name ?? 'Partner'}
SERVICE: ${summary.recommendedService ?? '—'}
PACKAGE: ${summary.recommendedPackage ?? '—'}
COMPLEXITY: ${summary.estimatedComplexity}

QUESTIONNAIRE (JSON):
${JSON.stringify(answers, null, 2)}

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
  const apiKey = process.env.OPENAI_API_KEY;

  if (apiKey) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: ARCHITECT_PROMPT },
            { role: 'user', content: promptText },
          ],
          temperature: 0.4,
          max_tokens: 4000,
        }),
      });

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) return content;
    } catch {
      /* fall through to template */
    }
  }

  return buildTemplateSow(requirement, answers, summary);
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
      : '| Requirement | Response |\n|-------------|----------|\n| Detailed in questionnaire | See partner submission |';

  const moduleTable = `| Module | Included |\n|--------|----------|\n${modules.map((m) => `| ${m} | Yes |`).join('\n')}`;

  return `# Scope of Work

**Reference:** ${requirement.reference_id}  
**Project:** ${requirement.project_name ?? 'Untitled Project'}  
**Prepared by:** TechAntum Solutions (via Partner Portal)  
**Date:** ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}

---

## 1. Executive Summary

TechAntum Solutions proposes to deliver a **${summary.recommendedService ?? 'digital solution'}** for **${summary.businessOverview.company ?? 'the client'}** operating in the **${summary.businessOverview.industry ?? 'specified'}** sector.

This Scope of Work defines project objectives, deliverables, timeline, and acceptance criteria based on requirements captured through the Partner Discovery Platform.

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
| Client Company | ${summary.businessOverview.company ?? '—'} |
| Industry | ${summary.businessOverview.industry ?? '—'} |
| Country | ${summary.businessOverview.country ?? '—'} |
| Business Size | ${String(answers.business_size ?? '—')} |

### Pain Points
${summary.businessOverview.painPoints ?? 'As discussed with the partner during discovery.'}

### Business Goals & Expected Outcomes
${summary.businessOverview.goals ?? 'As discussed with the partner during discovery.'}

---

## 3. Project Scope

### 3.1 Selected Modules

${moduleTable}

### 3.2 Functional Requirements

${functionalTable}

### 3.3 Target Audience
${String(answers.target_audience ?? 'As specified in discovery questionnaire')}

---

## 4. Technology Stack (Recommended)

| Layer | Recommendation |
|-------|----------------|
| Frontend | Next.js / React — responsive, SEO-ready |
| Backend | Node.js / Supabase or custom REST API |
| Database | PostgreSQL |
| Hosting | Cloud (Vercel / AWS / Azure) |
| Integrations | As specified in requirements |

---

## 5. Timeline & Milestones

| Phase | Duration | Key Deliverable |
|-------|----------|-----------------|
| Discovery & Design | 2–3 weeks | Wireframes, UI/UX approval |
| Development | 4–8 weeks | Working application / website |
| Testing & QA | 1–2 weeks | Test reports, bug fixes |
| Deployment | 1 week | Production launch |
| Training & Handover | 1 week | Documentation & admin training |

---

## 6. Deliverables

| # | Deliverable | Description |
|---|-------------|-------------|
| 1 | Solution Build | Fully functional ${summary.recommendedService ?? 'solution'} per agreed scope |
| 2 | Source Code | Complete codebase with deployment documentation |
| 3 | Training | Admin / user training session |
| 4 | Support | Post-launch support per selected package terms |

---

## 7. Acceptance Criteria

- All in-scope features functional as documented in Section 3
- Cross-browser and mobile responsive (where applicable)
- Performance benchmarks met (Core Web Vitals for web projects)
- Successful User Acceptance Testing (UAT) and client sign-off

---

## 8. Assumptions

${summary.assumptions.map((a) => `- ${a}`).join('\n')}

---

## 9. Out of Scope

- Features not explicitly listed in this document
- Third-party subscription and licensing costs
- Content creation (copy, images, video) unless specified
- Ongoing maintenance beyond the package support period

---

## 10. Risk Analysis

| Risk | Mitigation |
|------|------------|
${summary.risks.map((r) => `| ${r.split(':')[0] || 'General'} | ${r.includes(':') ? r.split(':').slice(1).join(':').trim() : 'Monitor and address during project'} |`).join('\n')}

---

## 11. Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Client Representative | | | |
| TechAntum Solutions | | | |
| Partner | ${requirement.partners?.contact_name ?? ''} | | |

---

*This document was generated by the TechAntum Partner Portal — ${requirement.reference_id}*
`;
}
