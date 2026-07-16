import { createAdminClient } from '@/lib/supabase/admin';
import { getServiceTypeLookupCandidates } from './wizard-config';
import type {
  CategoryWithPackages,
  PartnerQuestion,
  QuestionTemplate,
  ServiceCategory,
} from './catalog';

export async function getActiveCategories(): Promise<ServiceCategory[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('partner_service_categories')
    .select('*')
    .eq('is_active', true)
    .order('display_order');
  return (data ?? []) as ServiceCategory[];
}

export async function getCatalogWithPackages(): Promise<CategoryWithPackages[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('partner_service_categories')
    .select(`
      *,
      partner_packages (
        *,
        partner_package_features (*)
      )
    `)
    .eq('is_active', true)
    .order('display_order');

  if (!data) return [];

  return data.map((cat) => ({
    ...cat,
    partner_packages: (cat.partner_packages ?? [])
      .filter((p: { is_active: boolean }) => p.is_active)
      .sort((a: { display_order: number }, b: { display_order: number }) => a.display_order - b.display_order)
      .map((p: { partner_package_features?: { display_order: number }[] }) => ({
        ...p,
        partner_package_features: (p.partner_package_features ?? []).sort(
          (a: { display_order: number }, b: { display_order: number }) => a.display_order - b.display_order
        ),
      })),
  })) as CategoryWithPackages[];
}

export async function getQuestionTemplateByServiceType(
  serviceType: string
): Promise<QuestionTemplate | null> {
  const supabase = createAdminClient();
  const candidates = getServiceTypeLookupCandidates(serviceType);

  for (const candidate of candidates) {
    const { data } = await supabase
      .from('partner_question_templates')
      .select('*')
      .eq('service_type', candidate)
      .eq('is_active', true)
      .maybeSingle();
    if (data) return data as QuestionTemplate;
  }

  return null;
}

export async function getQuestionsForTemplate(templateId: string): Promise<PartnerQuestion[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('partner_questions')
    .select('*, partner_question_conditions (*)')
    .eq('template_id', templateId)
    .order('wizard_step')
    .order('display_order');

  return (data ?? []).map((q) => ({
    ...q,
    options: Array.isArray(q.options) ? q.options : [],
  })) as PartnerQuestion[];
}

export async function getComparisonMatrix(categoryId: string) {
  const supabase = createAdminClient();
  const { data: packages } = await supabase
    .from('partner_packages')
    .select('*, partner_package_features (*)')
    .eq('category_id', categoryId)
    .eq('is_active', true)
    .order('display_order');

  if (!packages?.length) return { packages: [], features: [] };

  const featureMap = new Map<string, { key: string; label: string; order: number }>();
  for (const pkg of packages) {
    for (const f of pkg.partner_package_features ?? []) {
      if (!featureMap.has(f.feature_key)) {
        featureMap.set(f.feature_key, {
          key: f.feature_key,
          label: f.feature_label,
          order: f.display_order,
        });
      }
    }
  }

  const features = [...featureMap.values()].sort((a, b) => a.order - b.order);

  const rows = features.map((feat) => ({
    feature_key: feat.key,
    feature_label: feat.label,
    values: Object.fromEntries(
      packages.map((pkg) => {
        const match = (pkg.partner_package_features ?? []).find(
          (f: { feature_key: string }) => f.feature_key === feat.key
        );
        return [pkg.slug, match?.value ?? '—'];
      })
    ),
  }));

  return { packages, rows };
}
