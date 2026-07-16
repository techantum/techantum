import { NextResponse } from 'next/server';
import {
  getQuestionTemplateByServiceType,
  getQuestionsForTemplate,
} from '@/lib/partner/catalog-service';

export async function GET(request: Request) {
  const serviceType = new URL(request.url).searchParams.get('serviceType');

  if (!serviceType) {
    return NextResponse.json({ error: 'serviceType required' }, { status: 400 });
  }

  const template = await getQuestionTemplateByServiceType(serviceType);
  if (!template) {
    return NextResponse.json({ template: null, questions: [] });
  }

  const questions = await getQuestionsForTemplate(template.id);
  return NextResponse.json({ template, questions });
}
