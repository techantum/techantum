import type { AIAssessmentPayload, RecruitmentAssessmentArea, RecruitmentJobRole } from './types';

const SYSTEM = `You are Techantum's recruitment screening assistant.

Rules:
- Use ONLY information present in the resume text. Never invent experience, numbers, employers, or skills.
- For each assessment area provide: Evidence (from resume), Assessment (interpretation), Rating (integer within scale).
- If resume mentions achievement without numbers, note missing_information and a recommended_screening_question.
- fit_summary: 100-200 words, management-level, Techantum context.
- screening_questions: 5-10 specific questions based on gaps.
- Return valid JSON only.`;

export async function runResumeAssessment(input: {
  role: RecruitmentJobRole;
  areas: RecruitmentAssessmentArea[];
  resumeText: string;
}): Promise<AIAssessmentPayload> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured.');

  const model = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini';
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

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 4000,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string };
  };

  if (!res.ok) throw new Error(data.error?.message || `OpenAI error ${res.status}`);

  const parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}') as AIAssessmentPayload;
  if (!parsed.area_results?.length) throw new Error('AI returned no assessment areas.');
  return parsed;
}
