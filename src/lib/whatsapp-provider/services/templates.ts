import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '../audit';
import { readClientCredential } from '../credentials';
import { MetaWhatsAppService } from '../meta/service';
import { buildMetaTemplatePayload, validateTemplateDraft, type TemplateDraft } from '../template-validation';

export async function listTemplates(filters: { tab?: string; q?: string; clientId?: string; page?: number; pageSize?: number }) {
  const supabase = createAdminClient();
  const page = Math.max(filters.page || 1, 1);
  const pageSize = Math.min(filters.pageSize || 25, 100);
  const from = (page - 1) * pageSize;
  let query = supabase.from('wa_templates').select('*, wa_clients(name)', { count: 'exact' }).order('updated_at', { ascending: false }).range(from, from + pageSize - 1);
  if (filters.clientId) query = query.eq('client_id', filters.clientId);
  if (filters.q) query = query.or(`name.ilike.%${filters.q}%,body.ilike.%${filters.q}%`);
  const tab = filters.tab || 'ALL';
  const tabMap: Record<string, string[]> = {
    DRAFT: ['DRAFT'],
    INTERNAL_REVIEW: ['CLIENT_SUBMITTED', 'INTERNAL_REVIEW'],
    READY: ['INTERNAL_APPROVED'],
    PENDING: ['SUBMITTED_TO_META', 'META_PENDING'],
    APPROVED: ['META_APPROVED'],
    REJECTED: ['META_REJECTED', 'CHANGES_REQUESTED'],
    FLAGGED: ['META_FLAGGED'],
    DISABLED: ['META_DISABLED', 'DELETED'],
  };
  if (tab !== 'ALL' && tabMap[tab]) query = query.in('internal_status', tabMap[tab]);
  const { data, count, error } = await query;
  if (error) throw new Error(error.message);
  return { rows: data || [], total: count || 0, page, pageSize };
}

export async function saveTemplate(input: TemplateDraft & { id?: string; clientId: string; wabaId?: string; actorId?: string }, asDraft = true) {
  const validation = validateTemplateDraft(input);
  if (!asDraft && !validation.ok) throw new Error(validation.errors.join(' '));
  const supabase = createAdminClient();
  const row = {
    client_id: input.clientId,
    waba_id: input.wabaId || null,
    name: input.name,
    category: input.category || 'UTILITY',
    language: input.language || 'en',
    header_type: input.headerType || 'NONE',
    header_content: input.headerContent || null,
    body: input.body,
    footer: input.footer || null,
    variables_json: validation.variables,
    examples_json: input.examples || {},
    buttons_json: input.buttons || [],
    created_by: input.actorId || null,
  };
  if (input.id) {
    const { data, error } = await supabase.from('wa_templates').update(row).eq('id', input.id).select('*').single();
    if (error) throw new Error(error.message);
    await writeAuditLog({ clientId: input.clientId, actorUserId: input.actorId, action: 'template.changed', resourceType: 'wa_template', resourceId: input.id });
    return data;
  }
  const { data, error } = await supabase.from('wa_templates').insert({ ...row, internal_status: 'DRAFT' }).select('*').single();
  if (error) throw new Error(error.message);
  await writeAuditLog({ clientId: input.clientId, actorUserId: input.actorId, action: 'template.created', resourceType: 'wa_template', resourceId: data.id });
  return data;
}

export async function reviewTemplate(id: string, decision: 'INTERNAL_APPROVED' | 'CHANGES_REQUESTED' | 'INTERNAL_REVIEW', comments: string, reviewerId?: string) {
  const supabase = createAdminClient();
  const { data: template } = await supabase.from('wa_templates').select('*').eq('id', id).maybeSingle();
  if (!template) throw new Error('Template not found');
  await supabase.from('wa_template_reviews').insert({ template_id: id, reviewer_id: reviewerId, decision, comments });
  await supabase.from('wa_templates').update({ internal_status: decision }).eq('id', id);
  await writeAuditLog({
    clientId: template.client_id,
    actorUserId: reviewerId,
    action: decision === 'INTERNAL_APPROVED' ? 'template.internally_approved' : 'template.review',
    resourceType: 'wa_template',
    resourceId: id,
    newValues: { decision, comments },
  });
}

export async function submitTemplateToMeta(id: string, actorId?: string) {
  const supabase = createAdminClient();
  const { data: template } = await supabase.from('wa_templates').select('*').eq('id', id).maybeSingle();
  if (!template) throw new Error('Template not found');
  if (template.internal_status !== 'INTERNAL_APPROVED' && template.internal_status !== 'META_REJECTED') {
    throw new Error('Only internally approved templates can be submitted to Meta.');
  }
  if (!template.waba_id) throw new Error('Template is not linked to a WABA.');
  const validation = validateTemplateDraft({
    name: template.name,
    category: template.category,
    language: template.language,
    headerType: template.header_type,
    headerContent: template.header_content,
    body: template.body,
    footer: template.footer,
    buttons: template.buttons_json,
    examples: template.examples_json,
  });
  if (!validation.ok) throw new Error(validation.errors.join(' '));
  const token = await readClientCredential(template.client_id, 'user_access_token');
  const service = new MetaWhatsAppService({ clientId: template.client_id, accessToken: token?.value });
  const payload = buildMetaTemplatePayload({
    name: template.name,
    category: template.category,
    language: template.language,
    headerType: template.header_type,
    headerContent: template.header_content,
    body: template.body,
    footer: template.footer,
    buttons: template.buttons_json,
    examples: template.examples_json,
  });
  const result = await service.createTemplate(template.waba_id, payload);
  await supabase
    .from('wa_templates')
    .update({
      internal_status: result.ok ? 'SUBMITTED_TO_META' : template.internal_status,
      meta_status: result.ok ? 'PENDING' : template.meta_status,
      meta_template_id: (result.data as { id?: string } | null)?.id || template.meta_template_id,
      submitted_at: new Date().toISOString(),
      submitted_by: actorId || null,
      rejection_reason: result.ok ? null : result.error?.userMessage,
    })
    .eq('id', id);
  await writeAuditLog({
    clientId: template.client_id,
    actorUserId: actorId,
    action: 'template.submitted_meta',
    resourceType: 'wa_template',
    resourceId: id,
    newValues: { ok: result.ok, correlationId: result.correlationId },
  });
  if (!result.ok) throw new Error(result.error?.userMessage || 'Meta submission failed');
  return result;
}

export async function cloneLibraryTemplate(libraryId: string, clientId: string, actorId?: string) {
  const supabase = createAdminClient();
  const { data: source } = await supabase.from('wa_template_library').select('*').eq('id', libraryId).maybeSingle();
  if (!source) throw new Error('Library template not found');
  return saveTemplate(
    {
      clientId,
      name: `${source.name}_${Date.now().toString().slice(-4)}`,
      category: source.category,
      language: source.language,
      headerType: source.header_type,
      headerContent: source.header_content,
      body: source.body,
      footer: source.footer,
      buttons: source.buttons_json,
      examples: source.examples_json,
      actorId,
    },
    true
  );
}
