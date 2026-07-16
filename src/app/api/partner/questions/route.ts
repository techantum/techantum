import { NextResponse } from 'next/server';
import {
  getQuestionTemplateByServiceType,
  getQuestionsForTemplate,
} from '@/lib/partner/catalog-service';
import { resolveWizardQuestions } from '@/lib/partner/wizard-config';
import { getQuestionServiceType } from '@/lib/partner/service-catalog';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const engagement = url.searchParams.get('engagement');
  const division = url.searchParams.get('division');
  const serviceTypeParam = url.searchParams.get('serviceType');

  const serviceType =
    engagement ||
    (division ? getQuestionServiceType(division) : null) ||
    serviceTypeParam;

  if (!serviceType) {
    return NextResponse.json({ error: 'serviceType, division, or engagement required' }, { status: 400 });
  }

  const template = await getQuestionTemplateByServiceType(serviceType);
  const baseQuestions = template ? await getQuestionsForTemplate(template.id) : [];
  const questions = resolveWizardQuestions(baseQuestions, serviceType);

  return NextResponse.json({
    template: template ?? { id: 'builtin', slug: 'builtin', service_type: serviceType },
    questions,
    source: baseQuestions.length > 0 ? 'database' : 'builtin',
    serviceType,
  });
}
