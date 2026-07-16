import { NextResponse } from 'next/server';
import {
  getQuestionTemplateByServiceType,
  getQuestionsForTemplate,
} from '@/lib/partner/catalog-service';
import { resolveWizardQuestions } from '@/lib/partner/wizard-config';

export async function GET(request: Request) {
  const serviceType = new URL(request.url).searchParams.get('serviceType');

  if (!serviceType) {
    return NextResponse.json({ error: 'serviceType required' }, { status: 400 });
  }

  const template = await getQuestionTemplateByServiceType(serviceType);
  const baseQuestions = template ? await getQuestionsForTemplate(template.id) : [];
  const questions = resolveWizardQuestions(baseQuestions, serviceType);

  return NextResponse.json({
    template: template ?? { id: 'builtin', slug: 'builtin', service_type: serviceType },
    questions,
    source: baseQuestions.length > 0 ? 'database' : 'builtin',
  });
}
