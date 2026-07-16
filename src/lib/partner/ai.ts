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
    ? summary.selectedModules.map((m) => `- ${m}`).join('\n')
    : '- To be defined';

  const features = summary.selectedFeatures
    .slice(0, 15)
    .map((f) => `- **${f.key}**: ${JSON.stringify(f.value)}`)
    .join('\n');

  return `# Scope of Work

**Reference:** ${requirement.reference_id}  
**Project:** ${requirement.project_name ?? 'Untitled Project'}  
**Prepared by:** TechAntum Solutions (via Partner Portal)  
**Date:** ${new Date().toLocaleDateString('en-IN')}

---

## 1. Executive Summary

TechAntum Solutions proposes to deliver a ${summary.recommendedService ?? 'digital solution'} for **${summary.businessOverview.company ?? 'the client'}** in the **${summary.businessOverview.industry ?? 'specified'}** industry. This document outlines the scope, deliverables, and approach based on requirements captured through our Partner Discovery Platform.

**Recommended Package:** ${summary.recommendedPackage ?? 'Custom'}  
**Estimated Complexity:** ${summary.estimatedComplexity}

---

## 2. Business Background

**Client:** ${summary.businessOverview.company ?? '—'}  
**Industry:** ${summary.businessOverview.industry ?? '—'}  
**Country:** ${summary.businessOverview.country ?? '—'}

### Pain Points
${summary.businessOverview.painPoints ?? 'As discussed with the partner.'}

### Objectives
${summary.businessOverview.goals ?? 'As discussed with the partner.'}

---

## 3. Project Scope

### Modules Included
${modules}

### Functional Requirements
${features || 'Detailed in questionnaire responses.'}

---

## 4. Technology Stack (Recommended)

- **Frontend:** Next.js / React (responsive, SEO-ready)
- **Backend:** Node.js / Supabase or custom API
- **Database:** PostgreSQL
- **Hosting:** Cloud (Vercel / AWS)
- **Integrations:** As specified in requirements

---

## 5. Timeline & Milestones

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Discovery & Design | 2-3 weeks | Wireframes, UI/UX approval |
| Development | 4-8 weeks | Working application |
| Testing & QA | 1-2 weeks | Test reports |
| Deployment | 1 week | Live launch |
| Training & Handover | 1 week | Documentation & training |

**Budget Range:** ${summary.projectOverview.budget ?? 'To be confirmed'}  
**Priority:** ${summary.projectOverview.priority ?? 'Medium'}

---

## 6. Deliverables

- Fully functional ${summary.recommendedService ?? 'solution'} per agreed scope
- Source code and deployment documentation
- Admin training session
- Post-launch support per package terms

---

## 7. Acceptance Criteria

- All in-scope features functional as per this document
- Cross-browser and mobile responsive (where applicable)
- Performance benchmarks met (Core Web Vitals for web projects)
- Client sign-off on UAT

---

## 8. Assumptions

${summary.assumptions.map((a) => `- ${a}`).join('\n')}

---

## 9. Out of Scope

- Features not listed in this document
- Third-party subscription/licensing costs
- Content creation (copy, images) unless specified
- Ongoing maintenance beyond package support period

---

## 10. Risk Analysis

${summary.risks.map((r) => `- ${r}`).join('\n')}

---

## 11. Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Client | | | |
| TechAntum | | | |
| Partner | ${requirement.partners?.contact_name ?? ''} | | |

---

*Generated by TechAntum Partner Portal — ${requirement.reference_id}*
`;
}
