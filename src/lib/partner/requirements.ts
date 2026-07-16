import { createAdminClient } from '@/lib/supabase/admin';
import { generateSowContent, generateAiPrompt, buildRequirementSummary } from './ai';
import { sendRequirementSubmittedEmails, sendProposalToPartnerEmail } from '@/lib/email/partner-emails';
import { generateAndSaveExports } from './document-export';
import { logPartnerActivity } from './auth';
import type { RequirementRecord, RequirementStatus } from './types';

async function generateReferenceId(): Promise<string> {
  const supabase = createAdminClient();
  const { data } = await supabase.rpc('generate_requirement_ref');
  if (typeof data === 'string') return data;
  return `REQ-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
}

export async function listPartnerRequirements(partnerId: string): Promise<RequirementRecord[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('partner_requirements')
    .select(`
      *,
      partner_packages (name),
      partner_service_categories (name)
    `)
    .eq('partner_id', partnerId)
    .order('updated_at', { ascending: false });
  return (data ?? []) as RequirementRecord[];
}

export async function getRequirement(id: string, partnerId?: string): Promise<RequirementRecord | null> {
  const supabase = createAdminClient();
  let query = supabase
    .from('partner_requirements')
    .select(`
      *,
      partners (company_name, contact_name, email, partner_code),
      partner_packages (name, slug),
      partner_service_categories (name, slug)
    `)
    .eq('id', id);

  if (partnerId) query = query.eq('partner_id', partnerId);

  const { data } = await query.maybeSingle();
  return data as RequirementRecord | null;
}

export async function getRequirementAnswers(requirementId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('partner_requirement_answers')
    .select('*')
    .eq('requirement_id', requirementId);
  return data ?? [];
}

export async function saveRequirementDraft(input: {
  id?: string;
  partnerId: string;
  partnerUserId: string;
  serviceCategoryId?: string;
  packageId?: string;
  projectName?: string;
  industry?: string;
  country?: string;
  budgetRange?: string;
  timeline?: string;
  priority?: string;
  businessData?: Record<string, unknown>;
  projectData?: Record<string, unknown>;
  modulesData?: string[];
  answers?: Record<string, unknown>;
  partnerNotes?: string;
}) {
  const supabase = createAdminClient();
  const payload = {
    partner_id: input.partnerId,
    partner_user_id: input.partnerUserId,
    status: 'draft' as const,
    service_category_id: input.serviceCategoryId ?? null,
    package_id: input.packageId ?? null,
    project_name: input.projectName ?? null,
    industry: input.industry ?? (input.businessData?.industry as string) ?? null,
    country: input.country ?? (input.businessData?.country as string) ?? null,
    budget_range: input.budgetRange ?? (input.projectData?.budget_range as string) ?? null,
    timeline: input.timeline ?? (input.projectData?.expected_launch as string) ?? null,
    priority: input.priority ?? (input.projectData?.priority as string) ?? null,
    business_data: input.businessData ?? {},
    project_data: input.projectData ?? {},
    modules_data: input.modulesData ?? [],
    partner_notes: input.partnerNotes ?? null,
  };

  let requirementId = input.id;

  if (requirementId) {
    const { data, error } = await supabase
      .from('partner_requirements')
      .update(payload)
      .eq('id', requirementId)
      .eq('partner_id', input.partnerId)
      .eq('status', 'draft')
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    requirementId = data.id;
  } else {
    const referenceId = await generateReferenceId();
    const { data, error } = await supabase
      .from('partner_requirements')
      .insert({ ...payload, reference_id: referenceId })
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    requirementId = data.id;

    await logPartnerActivity(input.partnerId, 'requirement_draft_created', {
      partnerUserId: input.partnerUserId,
      entityType: 'requirement',
      entityId: requirementId,
    });
  }

  if (input.answers && requirementId) {
    const rows = Object.entries(input.answers).map(([question_key, answer_value]) => ({
      requirement_id: requirementId,
      question_key,
      answer_value,
    }));
    await supabase.from('partner_requirement_answers').upsert(rows, {
      onConflict: 'requirement_id,question_key',
    });
  }

  return getRequirement(requirementId!, input.partnerId);
}

async function collectAllAnswers(requirement: RequirementRecord, requirementId: string) {
  const answers = await getRequirementAnswers(requirementId);
  const answersMap = Object.fromEntries(
    answers.map((a) => [a.question_key, a.answer_value])
  );
  return {
    ...((requirement.business_data as Record<string, unknown>) ?? {}),
    ...((requirement.project_data as Record<string, unknown>) ?? {}),
    modules: requirement.modules_data,
    ...answersMap,
  };
}

async function storeGeneratedArtifacts(
  requirementId: string,
  requirement: RequirementRecord,
  allAnswers: Record<string, unknown>,
  version?: number
) {
  const supabase = createAdminClient();
  const aiSummary = buildRequirementSummary(requirement, allAnswers);
  const promptText = generateAiPrompt(requirement, allAnswers, aiSummary);
  const sowMarkdown = await generateSowContent(requirement, allAnswers, aiSummary, promptText);

  let nextVersion = version;
  if (nextVersion === undefined) {
    const { data: prevDocs } = await supabase
      .from('partner_generated_documents')
      .select('version')
      .eq('requirement_id', requirementId)
      .order('version', { ascending: false })
      .limit(1);
    nextVersion = (prevDocs?.[0]?.version ?? 0) + 1;
  }

  await supabase
    .from('partner_requirements')
    .update({ ai_summary: aiSummary })
    .eq('id', requirementId);

  await supabase.from('partner_generated_prompts').insert({
    requirement_id: requirementId,
    prompt_text: promptText,
    questionnaire_json: allAnswers,
    version: nextVersion,
  });

  await supabase.from('partner_generated_documents').insert([
    {
      requirement_id: requirementId,
      doc_type: 'sow',
      format: 'markdown',
      content: sowMarkdown,
      version: nextVersion,
    },
    {
      requirement_id: requirementId,
      doc_type: 'sow',
      format: 'html',
      content: markdownToHtml(sowMarkdown),
      version: nextVersion,
    },
  ]);

  const exports = await generateAndSaveExports(
    requirementId,
    requirement.reference_id,
    sowMarkdown,
    nextVersion ?? 1
  );

  await supabase.from('partner_generated_documents').insert([
    {
      requirement_id: requirementId,
      doc_type: 'sow',
      format: 'pdf',
      content: null,
      file_url: exports.pdfUrl,
      version: nextVersion,
    },
    {
      requirement_id: requirementId,
      doc_type: 'sow',
      format: 'docx',
      content: null,
      file_url: exports.docxUrl,
      version: nextVersion,
    },
  ]);

  return { aiSummary, promptText, sowMarkdown, version: nextVersion };
}

export async function submitRequirement(
  requirementId: string,
  partnerId: string,
  partnerUserId: string
) {
  const supabase = createAdminClient();
  const requirement = await getRequirement(requirementId, partnerId);
  if (!requirement) throw new Error('Requirement not found');
  if (requirement.status !== 'draft') throw new Error('Only draft requirements can be submitted');

  const allAnswers = await collectAllAnswers(requirement, requirementId);
  const { promptText, sowMarkdown } = await storeGeneratedArtifacts(
    requirementId,
    requirement,
    allAnswers,
    1
  );

  const now = new Date().toISOString();

  await supabase
    .from('partner_requirements')
    .update({
      status: 'submitted',
      submitted_at: now,
    })
    .eq('id', requirementId);

  await supabase.from('partner_requirement_status_history').insert({
    requirement_id: requirementId,
    from_status: 'draft',
    to_status: 'submitted',
    changed_by: partnerUserId,
    note: 'Submitted by partner',
  });

  const partnerRecord = await createAdminClient()
    .from('partners')
    .select('company_name, contact_name, email, partner_code')
    .eq('id', partnerId)
    .single();

  const partner = partnerRecord.data;
  const emailResult = await sendRequirementSubmittedEmails({
    referenceId: requirement.reference_id,
    projectName: requirement.project_name ?? 'Untitled Project',
    partnerName: partner?.contact_name ?? 'Partner',
    partnerEmail: partner?.email ?? '',
    partnerCompany: partner?.company_name ?? '',
    serviceName: requirement.partner_service_categories?.name ?? '—',
    packageName: requirement.partner_packages?.name ?? '—',
    budgetRange: requirement.budget_range ?? '—',
    timeline: requirement.timeline ?? '—',
    sowMarkdown,
    promptText,
    questionnaireJson: JSON.stringify(allAnswers, null, 2),
  });

  await supabase.from('partner_email_logs').insert([
    {
      partner_id: partnerId,
      requirement_id: requirementId,
      email_type: 'requirement_submitted_internal',
      recipient: process.env.PARTNER_SALES_INBOX || 'sales@techantum.com',
      subject: `New Client Requirement — ${requirement.reference_id}`,
      status: emailResult.internalOk ? 'sent' : 'failed',
      error_message: emailResult.internalError ?? null,
    },
    {
      partner_id: partnerId,
      requirement_id: requirementId,
      email_type: 'requirement_submitted_partner',
      recipient: partner?.email ?? '',
      subject: `Requirement Submitted — ${requirement.reference_id}`,
      status: emailResult.partnerOk ? 'sent' : 'failed',
      error_message: emailResult.partnerError ?? null,
    },
  ]);

  await logPartnerActivity(partnerId, 'requirement_submitted', {
    partnerUserId,
    entityType: 'requirement',
    entityId: requirementId,
    metadata: { reference_id: requirement.reference_id },
  });

  const { createPartnerNotification } = await import('./notifications');
  await createPartnerNotification({
    partnerId,
    requirementId,
    type: 'requirement_submitted',
    title: 'Requirement submitted',
    message: `${requirement.reference_id} has been submitted. Our team will review shortly.`,
    link: `/partner/requirements/${requirementId}`,
  });

  return getRequirement(requirementId, partnerId);
}

export async function regenerateSow(requirementId: string, adminUserId?: string) {
  const supabase = createAdminClient();
  const requirement = await getRequirement(requirementId);
  if (!requirement) throw new Error('Requirement not found');
  if (requirement.status === 'draft') {
    throw new Error('Cannot regenerate SOW for draft requirements');
  }

  const allAnswers = await collectAllAnswers(requirement, requirementId);
  const artifacts = await storeGeneratedArtifacts(requirementId, requirement, allAnswers);

  await supabase.from('partner_requirement_status_history').insert({
    requirement_id: requirementId,
    from_status: requirement.status,
    to_status: requirement.status,
    changed_by: adminUserId ?? null,
    note: `SOW regenerated (v${artifacts.version})`,
  });

  return artifacts;
}

export async function sendRequirementProposal(
  requirementId: string,
  input: {
    proposalSummary: string;
    proposalAmount: string;
    proposalTimeline: string;
  },
  adminUserId?: string
) {
  const supabase = createAdminClient();
  const requirement = await getRequirement(requirementId);
  if (!requirement) throw new Error('Requirement not found');
  if (requirement.status === 'draft') {
    throw new Error('Cannot send proposal for draft requirements');
  }

  const now = new Date().toISOString();
  await supabase
    .from('partner_requirements')
    .update({
      proposal_summary: input.proposalSummary,
      proposal_amount: input.proposalAmount,
      proposal_timeline: input.proposalTimeline,
      proposal_sent_at: now,
      status: 'proposal_sent',
    })
    .eq('id', requirementId);

  await supabase.from('partner_requirement_status_history').insert({
    requirement_id: requirementId,
    from_status: requirement.status,
    to_status: 'proposal_sent',
    changed_by: adminUserId ?? null,
    note: 'Proposal sent to partner',
  });

  const partner = requirement.partners;
  if (partner?.email) {
    await sendProposalToPartnerEmail({
      referenceId: requirement.reference_id,
      projectName: requirement.project_name ?? 'Untitled Project',
      partnerName: partner.contact_name,
      partnerEmail: partner.email,
      proposalSummary: input.proposalSummary,
      proposalAmount: input.proposalAmount,
      proposalTimeline: input.proposalTimeline,
    });
  }

  const { createPartnerNotification } = await import('./notifications');
  await createPartnerNotification({
    partnerId: requirement.partner_id,
    requirementId,
    type: 'proposal',
    title: 'Project proposal ready',
    message: `Proposal for ${requirement.reference_id} is available to review.`,
    link: `/partner/requirements/${requirementId}`,
  });

  return getRequirement(requirementId);
}

export async function duplicateRequirement(
  sourceId: string,
  partnerId: string,
  partnerUserId: string
) {
  const source = await getRequirement(sourceId, partnerId);
  if (!source) throw new Error('Requirement not found');

  const answers = await getRequirementAnswers(sourceId);
  const draft = await saveRequirementDraft({
    partnerId,
    partnerUserId,
    serviceCategoryId: source.service_category_id ?? undefined,
    packageId: source.package_id ?? undefined,
    projectName: source.project_name ? `${source.project_name} (Copy)` : undefined,
    industry: source.industry ?? undefined,
    country: source.country ?? undefined,
    budgetRange: source.budget_range ?? undefined,
    timeline: source.timeline ?? undefined,
    priority: source.priority ?? undefined,
    businessData: source.business_data as Record<string, unknown>,
    projectData: source.project_data as Record<string, unknown>,
    modulesData: source.modules_data as string[],
    answers: Object.fromEntries(answers.map((a) => [a.question_key, a.answer_value])),
    partnerNotes: source.partner_notes ?? undefined,
  });

  return draft;
}

export async function listAllRequirements(filters?: {
  status?: string;
  partnerId?: string;
  search?: string;
}) {
  const supabase = createAdminClient();
  let query = supabase
    .from('partner_requirements')
    .select(`
      *,
      partners (company_name, contact_name, email, partner_code),
      partner_packages (name),
      partner_service_categories (name)
    `)
    .order('updated_at', { ascending: false });

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  if (filters?.partnerId) {
    query = query.eq('partner_id', filters.partnerId);
  }
  if (filters?.search) {
    query = query.or(
      `reference_id.ilike.%${filters.search}%,project_name.ilike.%${filters.search}%`
    );
  }

  const { data } = await query;
  return (data ?? []) as RequirementRecord[];
}

export async function updateRequirementStatus(
  requirementId: string,
  toStatus: string,
  note?: string,
  changedBy?: string
) {
  const supabase = createAdminClient();
  const { data: current } = await supabase
    .from('partner_requirements')
    .select('status, partner_id')
    .eq('id', requirementId)
    .single();

  const fromStatus = current?.status ?? null;

  await supabase
    .from('partner_requirements')
    .update({ status: toStatus })
    .eq('id', requirementId);

  await supabase.from('partner_requirement_status_history').insert({
    requirement_id: requirementId,
    from_status: fromStatus,
    to_status: toStatus,
    changed_by: changedBy ?? null,
    note: note ?? null,
  });

  if (fromStatus !== toStatus && toStatus !== 'need_clarification') {
    const { notifyStatusChange } = await import('./clarifications');
    await notifyStatusChange(requirementId, fromStatus, toStatus, note);
  }
}

export async function getRequirementDocuments(requirementId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('partner_generated_documents')
    .select('*')
    .eq('requirement_id', requirementId)
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function getRequirementAnalytics() {
  const supabase = createAdminClient();
  const { data: requirements } = await supabase
    .from('partner_requirements')
    .select('status, industry, country, budget_range, package_id, modules_data, partner_packages(name), partner_service_categories(name)');

  const rows = requirements ?? [];
  const packageCounts: Record<string, number> = {};
  const industryCounts: Record<string, number> = {};
  const countryCounts: Record<string, number> = {};
  const moduleCounts: Record<string, number> = {};
  const statusCounts: Record<string, number> = {};

  for (const r of rows) {
    statusCounts[r.status] = (statusCounts[r.status] ?? 0) + 1;
    if (r.industry) industryCounts[r.industry] = (industryCounts[r.industry] ?? 0) + 1;
    if (r.country) countryCounts[r.country] = (countryCounts[r.country] ?? 0) + 1;
    const pkgRaw = r.partner_packages as { name: string } | { name: string }[] | null;
    const pkgName = (Array.isArray(pkgRaw) ? pkgRaw[0]?.name : pkgRaw?.name) ?? 'Unknown';
    packageCounts[pkgName] = (packageCounts[pkgName] ?? 0) + 1;
    for (const mod of (r.modules_data as string[]) ?? []) {
      moduleCounts[mod] = (moduleCounts[mod] ?? 0) + 1;
    }
  }

  return {
    total: rows.length,
    byStatus: statusCounts,
    topPackages: Object.entries(packageCounts).sort((a, b) => b[1] - a[1]).slice(0, 5),
    topIndustries: Object.entries(industryCounts).sort((a, b) => b[1] - a[1]).slice(0, 5),
    topCountries: Object.entries(countryCounts).sort((a, b) => b[1] - a[1]).slice(0, 5),
    topModules: Object.entries(moduleCounts).sort((a, b) => b[1] - a[1]).slice(0, 8),
  };
}

function markdownToHtml(md: string): string {
  return md
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^- (.*$)/gim, '<li>$1</li>')
    .replace(/\n/g, '<br/>');
}
