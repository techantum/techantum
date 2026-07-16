import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import {
  getAdminCatalog,
  updateCategory,
  updatePackage,
  upsertPackageFeature,
  updateQuestion,
  createQuestion,
  deleteQuestion,
  syncWizardQuestions,
} from '@/lib/partner/catalog-admin';

export async function GET() {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;

  const data = await getAdminCatalog();
  return NextResponse.json(data);
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;

  try {
    const body = await request.json();
    const { entity, id, data } = body as {
      entity: 'category' | 'package' | 'feature' | 'question';
      id?: string;
      data: Record<string, unknown>;
    };

    switch (entity) {
      case 'category':
        if (!id) throw new Error('Category id required');
        await updateCategory(id, data);
        break;
      case 'package':
        if (!id) throw new Error('Package id required');
        await updatePackage(id, data);
        break;
      case 'feature':
        await upsertPackageFeature({
          packageId: String(data.packageId),
          featureKey: String(data.featureKey),
          featureLabel: String(data.featureLabel),
          value: String(data.value),
          displayOrder: data.displayOrder ? Number(data.displayOrder) : undefined,
        });
        break;
      case 'question':
        if (!id) throw new Error('Question id required');
        await updateQuestion(id, data);
        break;
      default:
        throw new Error('Invalid entity');
    }

    const catalog = await getAdminCatalog();
    return NextResponse.json(catalog);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Update failed' },
      { status: 400 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;

  try {
    const body = await request.json();
    if (body.action === 'sync-wizard-questions') {
      const result = await syncWizardQuestions();
      const catalog = await getAdminCatalog();
      return NextResponse.json({ ...catalog, sync: result });
    }

    if (body.entity !== 'question') throw new Error('Only question creation supported');

    await createQuestion({
      templateId: String(body.data.templateId),
      questionKey: String(body.data.questionKey),
      label: String(body.data.label),
      questionType: String(body.data.questionType || 'text'),
      options: Array.isArray(body.data.options) ? body.data.options : [],
      placeholder: body.data.placeholder ? String(body.data.placeholder) : undefined,
      helpText: body.data.helpText ? String(body.data.helpText) : undefined,
      isRequired: Boolean(body.data.isRequired),
      wizardStep: body.data.wizardStep ? Number(body.data.wizardStep) : 4,
      displayOrder: body.data.displayOrder ? Number(body.data.displayOrder) : 99,
      validationRules: body.data.validationRules as { group?: string; colSpan?: number } | undefined,
    });

    const catalog = await getAdminCatalog();
    return NextResponse.json(catalog);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Create failed' },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const entity = searchParams.get('entity');
    if (entity !== 'question' || !id) throw new Error('Question id required');

    await deleteQuestion(id);
    const catalog = await getAdminCatalog();
    return NextResponse.json(catalog);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Delete failed' },
      { status: 400 }
    );
  }
}
