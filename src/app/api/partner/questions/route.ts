import { NextResponse } from 'next/server';
import {
  getQuestionTemplateByServiceType,
  getQuestionsForTemplate,
} from '@/lib/partner/catalog-service';
import { enhanceQuestions, getSupplementaryQuestions, filterFocusedQuestions } from '@/lib/partner/wizard-config';

export async function GET(request: Request) {
  const serviceType = new URL(request.url).searchParams.get('serviceType');

  if (!serviceType) {
    return NextResponse.json({ error: 'serviceType required' }, { status: 400 });
  }

  const template = await getQuestionTemplateByServiceType(serviceType);
  if (!template) {
    return NextResponse.json({ template: null, questions: [] });
  }

  const baseQuestions = await getQuestionsForTemplate(template.id);
  const existingKeys = new Set(baseQuestions.map((q) => q.question_key));
  const supplementary = getSupplementaryQuestions(serviceType, template.id).filter(
    (q) => !existingKeys.has(q.question_key)
  );
  const merged = enhanceQuestions([...baseQuestions, ...supplementary], serviceType);
  const questions = filterFocusedQuestions(merged, serviceType);
  return NextResponse.json({ template, questions });
}
