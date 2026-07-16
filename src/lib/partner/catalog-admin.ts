import { createAdminClient } from '@/lib/supabase/admin';
import { getQuestionsForTemplate } from './catalog-service';
import type { PartnerPackage, ServiceCategory } from './catalog';

export async function getAdminCatalog() {
  const supabase = createAdminClient();
  const { data: rawCatalog } = await supabase
    .from('partner_service_categories')
    .select(`
      *,
      partner_packages (
        *,
        partner_package_features (*)
      )
    `)
    .order('display_order');

  const catalog = (rawCatalog ?? []).map((cat) => ({
    ...cat,
    partner_packages: (cat.partner_packages ?? [])
      .sort((a: { display_order: number }, b: { display_order: number }) => a.display_order - b.display_order)
      .map((p: { partner_package_features?: { display_order: number }[] }) => ({
        ...p,
        partner_package_features: (p.partner_package_features ?? []).sort(
          (a: { display_order: number }, b: { display_order: number }) => a.display_order - b.display_order
        ),
      })),
  }));

  const { data: templates } = await supabase
    .from('partner_question_templates')
    .select('*')
    .order('slug');

  const templateQuestions = await Promise.all(
    (templates ?? []).map(async (t) => ({
      ...t,
      questions: await getQuestionsForTemplate(t.id),
    }))
  );

  return { catalog, templates: templateQuestions };
}

export async function updateCategory(id: string, data: Partial<ServiceCategory>) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('partner_service_categories')
    .update({
      name: data.name,
      description: data.description,
      display_order: data.display_order,
      is_active: data.is_active,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function updatePackage(id: string, data: Partial<PartnerPackage>) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('partner_packages')
    .update({
      name: data.name,
      tagline: data.tagline,
      best_for: data.best_for,
      description: data.description,
      display_order: data.display_order,
      is_active: data.is_active,
      is_highlighted: data.is_highlighted,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function upsertPackageFeature(input: {
  packageId: string;
  featureKey: string;
  featureLabel: string;
  value: string;
  displayOrder?: number;
}) {
  const supabase = createAdminClient();
  const { error } = await supabase.from('partner_package_features').upsert(
    {
      package_id: input.packageId,
      feature_key: input.featureKey,
      feature_label: input.featureLabel,
      value: input.value,
      display_order: input.displayOrder ?? 0,
    },
    { onConflict: 'package_id,feature_key' }
  );
  if (error) throw new Error(error.message);
}

export async function updateQuestion(id: string, data: {
  label?: string;
  question_key?: string;
  question_type?: string;
  options?: string[];
  placeholder?: string | null;
  help_text?: string | null;
  is_required?: boolean;
  wizard_step?: number;
  display_order?: number;
}) {
  const supabase = createAdminClient();
  const payload: Record<string, unknown> = {};
  if (data.label !== undefined) payload.label = data.label;
  if (data.question_key !== undefined) payload.question_key = data.question_key;
  if (data.question_type !== undefined) payload.question_type = data.question_type;
  if (data.options !== undefined) payload.options = data.options;
  if (data.placeholder !== undefined) payload.placeholder = data.placeholder;
  if (data.help_text !== undefined) payload.help_text = data.help_text;
  if (data.is_required !== undefined) payload.is_required = data.is_required;
  if (data.wizard_step !== undefined) payload.wizard_step = data.wizard_step;
  if (data.display_order !== undefined) payload.display_order = data.display_order;

  const { error } = await supabase.from('partner_questions').update(payload).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function createQuestion(input: {
  templateId: string;
  questionKey: string;
  label: string;
  questionType: string;
  options?: string[];
  placeholder?: string;
  helpText?: string;
  isRequired?: boolean;
  wizardStep?: number;
  displayOrder?: number;
}) {
  const supabase = createAdminClient();
  const { error } = await supabase.from('partner_questions').insert({
    template_id: input.templateId,
    question_key: input.questionKey,
    label: input.label,
    question_type: input.questionType,
    options: input.options ?? [],
    placeholder: input.placeholder ?? null,
    help_text: input.helpText ?? null,
    is_required: input.isRequired ?? false,
    wizard_step: input.wizardStep ?? 4,
    display_order: input.displayOrder ?? 99,
  });
  if (error) throw new Error(error.message);
}

export async function deleteQuestion(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from('partner_questions').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
