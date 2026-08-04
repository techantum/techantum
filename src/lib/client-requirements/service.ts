import { createHash, randomBytes } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import type {
  ClientProject,
  ClientRequirementStatus,
  ProjectRequirement,
  PublicRequirementPayload,
  RequirementAttachment,
  RequirementComment,
  RequirementTemplate,
} from './types';

function getBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.SITE_URL ||
    'https://portal.techantum.com'
  ).replace(/\/$/, '');
}

export function buildRequirementUrl(token: string) {
  return `${getBaseUrl()}/requirements/${token}`;
}

export function createPublicToken() {
  return randomBytes(18).toString('hex');
}

function hashPassword(password?: string | null) {
  if (!password) return null;
  return createHash('sha256').update(password).digest('hex');
}

function calculateCompletion(template: RequirementTemplate | null, answers: Record<string, Record<string, unknown>>) {
  const sections = template?.requirement_sections ?? [];
  if (sections.length === 0) return 0;
  const completed = sections.filter((section) => {
    const sectionAnswers = answers[section.slug] ?? {};
    return Object.values(sectionAnswers).some((value) => {
      if (Array.isArray(value)) return value.length > 0;
      if (value && typeof value === 'object') return Object.keys(value).length > 0;
      return String(value ?? '').trim().length > 0;
    });
  }).length;
  return Math.round((completed / sections.length) * 100);
}

async function logActivity(input: {
  projectId?: string;
  requirementId?: string;
  actorType?: string;
  actorId?: string;
  action: string;
  metadata?: Record<string, unknown>;
}) {
  await createAdminClient().from('activity_logs').insert({
    project_id: input.projectId ?? null,
    requirement_id: input.requirementId ?? null,
    actor_type: input.actorType ?? 'system',
    actor_id: input.actorId ?? null,
    action: input.action,
    metadata: input.metadata ?? {},
  });
}

async function createNotification(input: {
  projectId?: string;
  requirementId?: string;
  audience: 'admin' | 'client';
  type: string;
  title: string;
  message: string;
  recipientEmail?: string | null;
  status?: string;
}) {
  await createAdminClient().from('notifications').insert({
    project_id: input.projectId ?? null,
    requirement_id: input.requirementId ?? null,
    audience: input.audience,
    type: input.type,
    title: input.title,
    message: input.message,
    recipient_email: input.recipientEmail ?? null,
    status: input.status ?? 'pending',
  });
}

export async function listTemplates() {
  const { data, error } = await createAdminClient()
    .from('requirement_templates')
    .select('*, requirement_sections(*, requirement_questions(*))')
    .order('project_type')
    .order('name');
  if (error) throw new Error(error.message);
  return (data ?? []) as RequirementTemplate[];
}

export async function getTemplate(templateId: string) {
  const { data, error } = await createAdminClient()
    .from('requirement_templates')
    .select('*, requirement_sections(*, requirement_questions(*))')
    .eq('id', templateId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const template = data as RequirementTemplate;
  template.requirement_sections = [...(template.requirement_sections ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((section) => ({
      ...section,
      requirement_questions: [...(section.requirement_questions ?? [])].sort(
        (a, b) => a.sort_order - b.sort_order
      ),
    }));
  return template;
}

export async function upsertTemplate(input: {
  id?: string;
  name: string;
  slug: string;
  project_type: string;
  package_name?: string | null;
  description?: string | null;
  welcome_message?: string | null;
  is_active?: boolean;
}) {
  const payload = {
    name: input.name,
    slug: input.slug,
    project_type: input.project_type,
    package_name: input.package_name ?? null,
    description: input.description ?? null,
    welcome_message: input.welcome_message ?? null,
    is_active: input.is_active ?? true,
  };
  const query = input.id
    ? createAdminClient().from('requirement_templates').update(payload).eq('id', input.id)
    : createAdminClient().from('requirement_templates').insert(payload);
  const { data, error } = await query.select('*').single();
  if (error) throw new Error(error.message);
  return data as RequirementTemplate;
}

export async function deleteTemplate(id: string) {
  const { error } = await createAdminClient().from('requirement_templates').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function listProjects(filters?: { status?: string; search?: string }) {
  let query = createAdminClient()
    .from('projects')
    .select('*, requirement_templates(name, slug)')
    .order('updated_at', { ascending: false });
  if (filters?.status && filters.status !== 'all') query = query.eq('status', filters.status);
  if (filters?.search) {
    const term = filters.search.replace(/[%(),]/g, '');
    query = query.or(`project_name.ilike.%${term}%,company_name.ilike.%${term}%,email.ilike.%${term}%`);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as ClientProject[];
}

export async function getProject(id: string) {
  const { data, error } = await createAdminClient()
    .from('projects')
    .select('*, requirement_templates(name, slug)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as ClientProject | null;
}

export async function createProject(input: {
  project_name: string;
  client_name: string;
  company_name: string;
  primary_contact_person?: string | null;
  email: string;
  mobile_number?: string | null;
  project_type: string;
  package_name?: string | null;
  status?: string;
  template_id?: string | null;
  expiry_date?: string | null;
  allow_multiple_submissions?: boolean;
  allow_save_draft?: boolean;
  optional_password?: string | null;
  created_by?: string;
}) {
  const token = createPublicToken();
  const payload = {
    project_name: input.project_name,
    client_name: input.client_name,
    company_name: input.company_name,
    email: input.email,
    project_type: input.project_type,
    template_id: input.template_id ?? null,
    package_name: input.package_name ?? null,
    primary_contact_person: input.primary_contact_person ?? null,
    mobile_number: input.mobile_number ?? null,
    expiry_date: input.expiry_date || null,
    status: input.status ?? 'draft',
    allow_multiple_submissions: input.allow_multiple_submissions ?? false,
    allow_save_draft: input.allow_save_draft ?? true,
    public_token: token,
    optional_password_hash: hashPassword(input.optional_password),
    share_url: buildRequirementUrl(token),
    created_by: input.created_by ?? null,
  };

  const { data, error } = await createAdminClient()
    .from('projects')
    .insert(payload)
    .select('*, requirement_templates(name, slug)')
    .single();
  if (error) throw new Error(error.message);

  await createNotification({
    projectId: data.id,
    audience: 'admin',
    type: 'project_created',
    title: 'Project created',
    message: `${data.project_name} is ready to share with ${data.company_name}.`,
  });
  await logActivity({ projectId: data.id, actorType: 'admin', actorId: input.created_by, action: 'project_created' });
  return data as ClientProject;
}

export async function updateProject(id: string, input: Partial<ClientProject> & { optional_password?: string | null }) {
  const payload: Record<string, unknown> = { ...input };
  delete payload.id;
  delete payload.public_token;
  delete payload.project_code;
  if ('optional_password' in payload) {
    payload.optional_password_hash = hashPassword(String(payload.optional_password || ''));
    delete payload.optional_password;
  }
  const { data, error } = await createAdminClient()
    .from('projects')
    .update(payload)
    .eq('id', id)
    .select('*, requirement_templates(name, slug)')
    .single();
  if (error) throw new Error(error.message);
  await logActivity({ projectId: id, actorType: 'admin', action: 'project_updated' });
  return data as ClientProject;
}

export async function regenerateProjectLink(id: string) {
  const token = createPublicToken();
  const { data, error } = await createAdminClient()
    .from('projects')
    .update({
      public_token: token,
      token_generated_at: new Date().toISOString(),
      share_url: buildRequirementUrl(token),
    })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  await logActivity({ projectId: id, actorType: 'admin', action: 'public_link_regenerated' });
  return data as ClientProject;
}

export async function deleteProject(id: string) {
  const { error } = await createAdminClient().from('projects').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

async function getOrCreateRequirement(project: ClientProject) {
  const supabase = createAdminClient();
  const { data: existing } = await supabase
    .from('project_requirements')
    .select('*')
    .eq('project_id', project.id)
    .order('submission_number', { ascending: false })
    .limit(1);

  const latest = (existing?.[0] ?? null) as ProjectRequirement | null;
  if (latest && (latest.status === 'draft' || !project.allow_multiple_submissions)) return latest;

  const nextNumber = latest ? latest.submission_number + 1 : 1;
  const { data, error } = await supabase
    .from('project_requirements')
    .insert({
      project_id: project.id,
      template_id: project.template_id,
      submission_number: nextNumber,
      status: 'draft',
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as ProjectRequirement;
}

export async function getPublicRequirement(token: string, password?: string | null): Promise<PublicRequirementPayload> {
  const supabase = createAdminClient();
  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('public_token', token)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!project) throw new Error('Invalid requirement link');
  if (project.status === 'draft') throw new Error('This requirement link is not active yet');
  if (project.status === 'closed') throw new Error('This requirement link is closed');
  if (project.expiry_date && new Date(project.expiry_date).getTime() < Date.now()) {
    throw new Error('This requirement link has expired');
  }
  if (project.optional_password_hash && project.optional_password_hash !== hashPassword(password)) {
    throw new Error('Password required');
  }

  const requirement = await getOrCreateRequirement(project as ClientProject);
  const template = project.template_id ? await getTemplate(project.template_id) : null;
  if (!template) throw new Error('Requirement template is not configured');
  const answers = await getRequirementAnswers(requirement.id);
  const attachments = await listRequirementAttachments(requirement.id);
  const comments = await listRequirementComments(requirement.id);
  return {
    project: project as ClientProject,
    requirement,
    template,
    answers,
    attachments,
    comments,
  };
}

export async function getRequirementAnswers(requirementId: string) {
  const { data, error } = await createAdminClient()
    .from('project_requirement_answers')
    .select('*')
    .eq('requirement_id', requirementId);
  if (error) throw new Error(error.message);
  const grouped: Record<string, Record<string, unknown>> = {};
  for (const row of data ?? []) {
    grouped[row.section_slug] = grouped[row.section_slug] ?? {};
    grouped[row.section_slug][row.question_key] = row.answer_value;
  }
  return grouped;
}

async function snapshotRequirement(requirementId: string, status: string, createdBy: string) {
  const supabase = createAdminClient();
  const answers = await getRequirementAnswers(requirementId);
  const [services, projects, testimonials, assets, attachments] = await Promise.all([
    supabase.from('project_requirement_services').select('*').eq('requirement_id', requirementId).order('sort_order'),
    supabase.from('project_requirement_projects').select('*').eq('requirement_id', requirementId).order('sort_order'),
    supabase.from('project_requirement_testimonials').select('*').eq('requirement_id', requirementId).order('sort_order'),
    supabase.from('project_requirement_assets').select('*').eq('requirement_id', requirementId),
    supabase.from('attachments').select('*').eq('requirement_id', requirementId),
  ]);
  const { data: previous } = await supabase
    .from('project_requirement_versions')
    .select('version_number')
    .eq('requirement_id', requirementId)
    .order('version_number', { ascending: false })
    .limit(1);
  const version = (previous?.[0]?.version_number ?? 0) + 1;
  await supabase.from('project_requirement_versions').insert({
    requirement_id: requirementId,
    version_number: version,
    status,
    created_by: createdBy,
    snapshot: {
      answers,
      services: services.data ?? [],
      projects: projects.data ?? [],
      testimonials: testimonials.data ?? [],
      assets: assets.data ?? [],
      attachments: attachments.data ?? [],
    },
  });
}

async function replaceRows(table: string, requirementId: string, rows: Record<string, unknown>[]) {
  const supabase = createAdminClient();
  await supabase.from(table).delete().eq('requirement_id', requirementId);
  if (rows.length > 0) {
    const { error } = await supabase.from(table).insert(rows);
    if (error) throw new Error(error.message);
  }
}

async function syncStructuredSections(requirementId: string, answers: Record<string, Record<string, unknown>>) {
  const services = Array.isArray(answers.services?.services_list) ? answers.services.services_list : [];
  await replaceRows(
    'project_requirement_services',
    requirementId,
    services.map((service, index) => ({
      requirement_id: requirementId,
      service_name: service.service_name ?? null,
      overview: service.overview ?? null,
      how_it_works: service.how_it_works ?? null,
      features: service.features ?? null,
      benefits: service.benefits ?? null,
      industries_served: service.industries_served ?? null,
      types: service.types ?? null,
      execution_process: service.execution_process ?? null,
      images: service.images ?? [],
      sort_order: index,
    }))
  );

  const projects = Array.isArray(answers.projects?.projects_list) ? answers.projects.projects_list : [];
  await replaceRows(
    'project_requirement_projects',
    requirementId,
    projects.map((project, index) => ({
      requirement_id: requirementId,
      project_name: project.project_name ?? null,
      location: project.location ?? null,
      category: project.category ?? null,
      description: project.description ?? null,
      highlights: project.highlights ?? null,
      completion_year: project.completion_year ?? null,
      client_name: project.client_name ?? null,
      status: project.status ?? null,
      images: project.images ?? [],
      sort_order: index,
    }))
  );

  const testimonials = Array.isArray(answers.testimonials?.testimonials_list)
    ? answers.testimonials.testimonials_list
    : [];
  await replaceRows(
    'project_requirement_testimonials',
    requirementId,
    testimonials.map((item, index) => ({
      requirement_id: requirementId,
      client_name: item.client_name ?? null,
      designation: item.designation ?? null,
      company: item.company ?? null,
      testimonial: item.testimonial ?? null,
      photo_url: item.photo_url ?? null,
      logo_url: item.logo_url ?? null,
      awards: item.awards ?? null,
      certifications: item.certifications ?? null,
      case_studies: item.case_studies ?? null,
      sort_order: index,
    }))
  );
}

export async function savePublicRequirement(input: {
  token: string;
  password?: string | null;
  requirementId: string;
  answers: Record<string, Record<string, unknown>>;
  currentSectionSlug?: string | null;
}) {
  const payload = await getPublicRequirement(input.token, input.password);
  if (payload.requirement.id !== input.requirementId) throw new Error('Requirement mismatch');
  if (!payload.project.allow_save_draft && payload.requirement.status === 'draft') {
    throw new Error('Draft saving is disabled for this project');
  }
  if (payload.requirement.status !== 'draft' && payload.requirement.status !== 'need_clarification') {
    throw new Error('Submitted requirements cannot be edited');
  }

  const supabase = createAdminClient();
  const rows = Object.entries(input.answers).flatMap(([sectionSlug, sectionAnswers]) =>
    Object.entries(sectionAnswers ?? {}).map(([questionKey, answerValue]) => ({
      requirement_id: input.requirementId,
      section_slug: sectionSlug,
      question_key: questionKey,
      answer_value: answerValue ?? null,
    }))
  );
  if (rows.length > 0) {
    const { error } = await supabase.from('project_requirement_answers').upsert(rows, {
      onConflict: 'requirement_id,section_slug,question_key',
    });
    if (error) throw new Error(error.message);
  }
  await syncStructuredSections(input.requirementId, input.answers);
  const completion = calculateCompletion(payload.template, input.answers);
  const { data, error } = await supabase
    .from('project_requirements')
    .update({
      current_section_slug: input.currentSectionSlug ?? null,
      completion_percent: completion,
      last_saved_at: new Date().toISOString(),
    })
    .eq('id', input.requirementId)
    .select('*')
    .single();
  if (error) throw new Error(error.message);

  await createNotification({
    projectId: payload.project.id,
    requirementId: input.requirementId,
    audience: 'admin',
    type: 'draft_saved',
    title: 'Draft saved',
    message: `${payload.project.company_name} saved requirement progress.`,
  });
  await logActivity({
    projectId: payload.project.id,
    requirementId: input.requirementId,
    actorType: 'client',
    action: 'requirement_draft_saved',
    metadata: { completion },
  });
  return data as ProjectRequirement;
}

export async function submitPublicRequirement(input: {
  token: string;
  password?: string | null;
  requirementId: string;
  answers: Record<string, Record<string, unknown>>;
  confirmedAccuracy: boolean;
}) {
  if (!input.confirmedAccuracy) throw new Error('Please confirm the information is accurate');
  const saved = await savePublicRequirement({
    token: input.token,
    password: input.password,
    requirementId: input.requirementId,
    answers: input.answers,
  });
  const payload = await getPublicRequirement(input.token, input.password);
  const now = new Date().toISOString();
  const { data, error } = await createAdminClient()
    .from('project_requirements')
    .update({
      status: 'submitted',
      submitted_at: now,
      confirmed_accuracy: true,
      completion_percent: Math.max(saved.completion_percent, 100),
    })
    .eq('id', input.requirementId)
    .select('*')
    .single();
  if (error) throw new Error(error.message);

  await snapshotRequirement(input.requirementId, 'submitted', 'client');
  await createNotification({
    projectId: payload.project.id,
    requirementId: input.requirementId,
    audience: 'admin',
    type: 'client_submitted',
    title: 'Client submitted requirements',
    message: `${payload.project.company_name} submitted ${payload.project.project_name}.`,
  });
  await createNotification({
    projectId: payload.project.id,
    requirementId: input.requirementId,
    audience: 'client',
    type: 'submission_confirmation',
    title: 'Requirements submitted',
    message: `Thank you. Your requirements for ${payload.project.project_name} have been submitted.`,
    recipientEmail: payload.project.email,
  });
  await logActivity({
    projectId: payload.project.id,
    requirementId: input.requirementId,
    actorType: 'client',
    action: 'requirement_submitted',
  });
  return data as ProjectRequirement;
}

export async function listSubmittedRequirements(filters?: { status?: string; search?: string }) {
  let query = createAdminClient()
    .from('project_requirements')
    .select('*, projects(project_name, company_name, client_name, email, project_type, package_name)')
    .neq('status', 'draft')
    .order('updated_at', { ascending: false });
  if (filters?.status && filters.status !== 'all') query = query.eq('status', filters.status);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  if (!filters?.search) return rows;
  const needle = filters.search.toLowerCase();
  return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(needle));
}

export async function getAdminRequirement(requirementId: string) {
  const supabase = createAdminClient();
  const { data: requirement, error } = await supabase
    .from('project_requirements')
    .select('*, projects(*), requirement_templates(*)')
    .eq('id', requirementId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!requirement) throw new Error('Requirement not found');
  const [answers, attachments, comments, versions, services, projects, testimonials] = await Promise.all([
    getRequirementAnswers(requirementId),
    listRequirementAttachments(requirementId),
    listRequirementComments(requirementId),
    supabase.from('project_requirement_versions').select('*').eq('requirement_id', requirementId).order('version_number', { ascending: false }),
    supabase.from('project_requirement_services').select('*').eq('requirement_id', requirementId).order('sort_order'),
    supabase.from('project_requirement_projects').select('*').eq('requirement_id', requirementId).order('sort_order'),
    supabase.from('project_requirement_testimonials').select('*').eq('requirement_id', requirementId).order('sort_order'),
  ]);
  const project = requirement.projects as ClientProject;
  const template = project.template_id ? await getTemplate(project.template_id) : null;
  return {
    requirement,
    project,
    template,
    answers,
    attachments,
    comments,
    versions: versions.data ?? [],
    services: services.data ?? [],
    projects: projects.data ?? [],
    testimonials: testimonials.data ?? [],
  };
}

export async function updateRequirementStatus(
  requirementId: string,
  status: ClientRequirementStatus,
  note?: string,
  adminUserId?: string
) {
  const detail = await getAdminRequirement(requirementId);
  const { data, error } = await createAdminClient()
    .from('project_requirements')
    .update({ status })
    .eq('id', requirementId)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  await createAdminComment(requirementId, {
    sectionSlug: null,
    comment: note || `Status changed to ${status}`,
    adminUserId,
    authorType: 'system',
  });
  if (status === 'need_clarification') {
    await createNotification({
      projectId: detail.project.id,
      requirementId,
      audience: 'client',
      type: 'clarification_requested',
      title: 'Clarification requested',
      message: note || 'TechAntum requested clarification on your submitted requirements.',
      recipientEmail: detail.project.email,
    });
  }
  await logActivity({
    projectId: detail.project.id,
    requirementId,
    actorType: 'admin',
    actorId: adminUserId,
    action: 'requirement_status_updated',
    metadata: { status },
  });
  return data as ProjectRequirement;
}

export async function createAdminComment(
  requirementId: string,
  input: {
    sectionSlug?: string | null;
    comment: string;
    adminUserId?: string;
    authorType?: 'admin' | 'client' | 'system';
  }
) {
  const { data, error } = await createAdminClient()
    .from('project_requirement_comments')
    .insert({
      requirement_id: requirementId,
      section_slug: input.sectionSlug ?? null,
      author_type: input.authorType ?? 'admin',
      author_id: input.adminUserId ?? null,
      comment: input.comment,
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as RequirementComment;
}

export async function requestRequirementChanges(input: {
  requirementId: string;
  sections: string[];
  comment: string;
  adminUserId?: string;
}) {
  const detail = await getAdminRequirement(input.requirementId);
  const { data, error } = await createAdminClient()
    .from('project_requirements')
    .update({ status: 'need_clarification', clarification_sections: input.sections })
    .eq('id', input.requirementId)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  await createAdminComment(input.requirementId, {
    sectionSlug: input.sections[0] ?? null,
    comment: input.comment,
    adminUserId: input.adminUserId,
  });
  await snapshotRequirement(input.requirementId, 'need_clarification', 'admin');
  await createNotification({
    projectId: detail.project.id,
    requirementId: input.requirementId,
    audience: 'client',
    type: 'clarification_requested',
    title: 'Clarification requested',
    message: input.comment,
    recipientEmail: detail.project.email,
  });
  return data as ProjectRequirement;
}

export async function listRequirementAttachments(requirementId: string) {
  const { data, error } = await createAdminClient()
    .from('attachments')
    .select('*')
    .eq('requirement_id', requirementId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as RequirementAttachment[];
}

export async function listRequirementComments(requirementId: string) {
  const { data, error } = await createAdminClient()
    .from('project_requirement_comments')
    .select('*')
    .eq('requirement_id', requirementId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as RequirementComment[];
}

export async function saveAttachment(input: {
  requirementId: string;
  projectId: string;
  sectionSlug?: string | null;
  fieldKey?: string | null;
  originalName: string;
  fileName: string;
  fileType?: string | null;
  fileSize: number;
  storagePath: string;
  publicUrl: string;
  uploadedBy?: string;
}) {
  const { data, error } = await createAdminClient()
    .from('attachments')
    .insert({
      requirement_id: input.requirementId,
      project_id: input.projectId,
      section_slug: input.sectionSlug ?? null,
      field_key: input.fieldKey ?? null,
      original_name: input.originalName,
      file_name: input.fileName,
      file_type: input.fileType ?? null,
      file_size: input.fileSize,
      storage_path: input.storagePath,
      public_url: input.publicUrl,
      uploaded_by: input.uploadedBy ?? 'client',
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as RequirementAttachment;
}
