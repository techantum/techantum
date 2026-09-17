import { generateAIChat } from '@/lib/ai';
import { parseModelJson } from '@/lib/ai/json';
import type { AIAssessmentPayload, RecruitmentAssessmentArea, RecruitmentJobRole } from './types';

const SYSTEM = `You are Techantum's recruitment screening assistant.

Rules:
- Use ONLY information present in the resume text. Never invent experience, numbers, employers, or skills.
- For each assessment area provide: Evidence (from resume), Assessment (interpretation), Rating (integer within scale).
- If resume mentions achievement without numbers, note missing_information and a recommended_screening_question.
- fit_summary: 100-200 words, management-level, Techantum context.
- screening_questions: 5-10 specific questions based on gaps.
- Return valid JSON only. No markdown fences, no trailing commas, no commentary.`;

export async function runResumeAssessment(input: {
  role: RecruitmentJobRole;
  areas: RecruitmentAssessmentArea[];
  resumeText: string;
}): Promise<AIAssessmentPayload> {
  const activeAreas = input.areas.filter((a) => a.status === 'ACTIVE').sort((a, b) => a.display_order - b.display_order);

  const criteria = activeAreas
    .map(
      (a) =>
        `- id: ${a.id}\n  name: ${a.name}\n  weightage: ${a.weightage}%\n  description: ${a.description}\n  scale: 1-${a.rating_scale_max}\n  instructions: ${a.ai_instructions || '—'}`,
    )
    .join('\n');

  const userPrompt = `JOB ROLE: ${input.role.title} (${input.role.department})
Experience: ${input.role.experience_required || '—'}
Required skills: ${input.role.required_skills || '—'}
Preferred skills: ${input.role.preferred_skills || '—'}
Responsibilities: ${input.role.key_responsibilities || '—'}

ASSESSMENT AREAS:
${criteria}

RESUME TEXT:
${input.resumeText.slice(0, 28000)}

Return JSON:
{
  "extracted_profile": {
    "name": string|null,
    "email": string|null,
    "phone": string|null,
    "location": string|null,
    "total_experience": string|null,
    "relevant_experience": string|null,
    "current_company": string|null,
    "current_job_title": string|null,
    "education": string|null,
    "skills": string[],
    "summary": string|null
  },
  "area_results": [
    {
      "assessment_area_id": "uuid",
      "evidence": "string",
      "assessment": "string",
      "rating": number,
      "missing_information": "string|null",
      "recommended_question": "string|null"
    }
  ],
  "fit_summary": "string",
  "strengths": ["string"],
  "gaps": ["string"],
  "info_to_validate": [{"topic":"string","detail":"string","recommended_question":"string|null"}],
  "screening_questions": ["string"],
  "recommendation": "string"
}`;

  const request = {
    purpose: 'recruitment_assessment' as const,
    json: true,
    temperature: 0.2,
    maxTokens: 4000,
    timeoutMs: 70000,
    messages: [
      { role: 'system' as const, content: SYSTEM },
      { role: 'user' as const, content: userPrompt },
    ],
  };

  let lastParseError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const generated = await generateAIChat({
      ...request,
      temperature: attempt === 0 ? 0.2 : 0.1,
    });
    try {
      const parsed = parseModelJson<AIAssessmentPayload>(generated.text || '{}');
      if (!parsed.area_results?.length) throw new Error('AI returned no assessment areas.');
      return parsed;
    } catch (error) {
      lastParseError = error;
    }
  }

  throw lastParseError instanceof Error && lastParseError.message === 'AI returned no assessment areas.'
    ? lastParseError
    : new Error('AI returned invalid JSON. Please retry the assessment.');
}
