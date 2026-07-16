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

function isEmpty(val: unknown): boolean {
  return (
    val === undefined ||
    val === null ||
    val === '' ||
    (Array.isArray(val) && val.length === 0)
  );
}

export function validateStepAnswers(
  questions: PartnerQuestion[],
  answers: Answers,
  wizardStep: number
): Record<string, string> {
  const errors: Record<string, string> = {};
  const visible = getVisibleQuestions(questions, answers, wizardStep);

  for (const q of visible) {
    const val = answers[q.question_key];

    if (q.is_required && isEmpty(val)) {
      errors[q.question_key] = `${q.label} is required`;
      continue;
    }

    if (isEmpty(val)) continue;

    if (q.question_key === 'client_website' && typeof val === 'string' && val.trim()) {
      try {
        const url = val.startsWith('http') ? val : `https://${val}`;
        new URL(url);
      } catch {
        errors[q.question_key] = 'Enter a valid website URL (e.g. https://example.com)';
      }
    }

    if (q.question_type === 'number' && val !== undefined && val !== '') {
      const num = Number(val);
      if (Number.isNaN(num) || num < 0) {
        errors[q.question_key] = 'Enter a valid number';
      }
    }
  }

  if (wizardStep === 3) {
    const modules = answers.modules;
    if (!Array.isArray(modules) || modules.length === 0) {
      errors.modules = 'Select at least one module';
    }
  }

  return errors;
}
