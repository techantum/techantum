import type { PartnerQuestion, QuestionCondition } from './catalog';

type Answers = Record<string, unknown>;

function normalizeAnswer(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.join(',');
  return String(value);
}

function matchesCondition(
  answers: Answers,
  condition: QuestionCondition
): boolean {
  const actual = normalizeAnswer(answers[condition.depends_on_question_key]);
  const expected = condition.expected_value;

  switch (condition.operator) {
    case 'equals':
      return actual === expected;
    case 'not_equals':
      return actual !== expected;
    case 'contains':
      return actual.toLowerCase().includes(expected.toLowerCase());
    case 'in':
      return expected.split(',').map((s) => s.trim()).includes(actual);
    default:
      return false;
  }
}

export function isQuestionVisible(
  question: PartnerQuestion,
  answers: Answers
): boolean {
  const conditions = question.partner_question_conditions ?? [];
  if (conditions.length === 0) return true;
  return conditions.every((c) => matchesCondition(answers, c));
}

export function getVisibleQuestions(
  questions: PartnerQuestion[],
  answers: Answers,
  wizardStep?: number
): PartnerQuestion[] {
  return questions
    .filter((q) => (wizardStep === undefined ? true : q.wizard_step === wizardStep))
    .filter((q) => isQuestionVisible(q, answers))
    .sort((a, b) => a.display_order - b.display_order);
}

export function validateStepAnswers(
  questions: PartnerQuestion[],
  answers: Answers,
  wizardStep: number
): Record<string, string> {
  const errors: Record<string, string> = {};
  const visible = getVisibleQuestions(questions, answers, wizardStep);

  for (const q of visible) {
    if (!q.is_required) continue;
    const val = answers[q.question_key];
    const empty =
      val === undefined ||
      val === null ||
      val === '' ||
      (Array.isArray(val) && val.length === 0);

    if (empty) {
      errors[q.question_key] = `${q.label} is required`;
    }
  }

  return errors;
}
