import { createAdminClient } from '@/lib/supabase/admin';
import { sendClarificationRequestEmail, sendClarificationReplyEmail } from '@/lib/email/partner-emails';
import { createPartnerNotification } from './notifications';
import { logPartnerActivity } from './auth';
import { getRequirement, updateRequirementStatus } from './requirements';
import { REQUIREMENT_STATUS_LABELS } from './types';

export interface ClarificationMessage {
  id: string;
  requirement_id: string;
  author_type: 'admin' | 'partner';
  author_id: string | null;
  author_name: string;
  message: string;
  created_at: string;
}

export async function listClarifications(requirementId: string): Promise<ClarificationMessage[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('partner_requirement_clarifications')
    .select('*')
    .eq('requirement_id', requirementId)
    .order('created_at');
  return (data ?? []) as ClarificationMessage[];
}

export async function requestClarification(
  requirementId: string,
  message: string,
  adminUserId: string,
  adminName = 'TechAntum Team'
) {
  const requirement = await getRequirement(requirementId);
  if (!requirement) throw new Error('Requirement not found');

  const supabase = createAdminClient();
  await supabase.from('partner_requirement_clarifications').insert({
    requirement_id: requirementId,
    author_type: 'admin',
    author_id: adminUserId,
    author_name: adminName,
    message,
  });

  await updateRequirementStatus(requirementId, 'need_clarification', message, adminUserId);

  await createPartnerNotification({
    partnerId: requirement.partner_id,
    requirementId,
    type: 'clarification',
    title: 'Clarification needed',
    message: `${requirement.reference_id}: ${message.slice(0, 120)}${message.length > 120 ? '…' : ''}`,
    link: `/partner/requirements/${requirementId}`,
  });

  const partner = requirement.partners;
  if (partner?.email) {
    await sendClarificationRequestEmail({
      referenceId: requirement.reference_id,
      projectName: requirement.project_name ?? 'Untitled Project',
      partnerName: partner.contact_name,
      partnerEmail: partner.email,
      message,
    });
  }

  await logPartnerActivity(requirement.partner_id, 'clarification_requested', {
    entityType: 'requirement',
    entityId: requirementId,
    metadata: { reference_id: requirement.reference_id },
  });
}

export async function replyToClarification(
  requirementId: string,
  message: string,
  partnerId: string,
  partnerUserId: string,
  authorName: string
) {
  const requirement = await getRequirement(requirementId, partnerId);
  if (!requirement) throw new Error('Requirement not found');

  const supabase = createAdminClient();
  await supabase.from('partner_requirement_clarifications').insert({
    requirement_id: requirementId,
    author_type: 'partner',
    author_id: partnerUserId,
    author_name: authorName,
    message,
  });

  if (requirement.status === 'need_clarification') {
    await updateRequirementStatus(requirementId, 'under_review', 'Partner replied to clarification', partnerUserId);
  }

  await logPartnerActivity(partnerId, 'clarification_replied', {
    partnerUserId,
    entityType: 'requirement',
    entityId: requirementId,
    metadata: { reference_id: requirement.reference_id },
  });

  const partner = requirement.partners;
  const salesInbox = process.env.PARTNER_SALES_INBOX || process.env.CONTACT_INBOX || 'sales@techantum.com';
  if (partner) {
    await sendClarificationReplyEmail({
      referenceId: requirement.reference_id,
      projectName: requirement.project_name ?? 'Untitled Project',
      partnerName: authorName,
      partnerCompany: partner.company_name,
      message,
      salesInbox,
    });
  }
}

export async function sendAdminChatMessage(
  requirementId: string,
  message: string,
  adminUserId: string,
  adminName = 'TechAntum Team'
) {
  const requirement = await getRequirement(requirementId);
  if (!requirement) throw new Error('Requirement not found');

  const supabase = createAdminClient();
  await supabase.from('partner_requirement_clarifications').insert({
    requirement_id: requirementId,
    author_type: 'admin',
    author_id: adminUserId,
    author_name: adminName,
    message,
  });

  if (['submitted', 'proposal_sent'].includes(requirement.status)) {
    await updateRequirementStatus(requirementId, 'under_review', 'Admin sent a message', adminUserId);
  }

  await createPartnerNotification({
    partnerId: requirement.partner_id,
    requirementId,
    type: 'clarification',
    title: 'New message on your requirement',
    message: `${requirement.reference_id}: ${message.slice(0, 120)}${message.length > 120 ? '…' : ''}`,
    link: `/partner/requirements/${requirementId}`,
  });

  await logPartnerActivity(requirement.partner_id, 'clarification_message', {
    entityType: 'requirement',
    entityId: requirementId,
    metadata: { reference_id: requirement.reference_id },
  });
}

export async function notifyStatusChange(
  requirementId: string,
  fromStatus: string | null,
  toStatus: string,
  note?: string
) {
  const requirement = await getRequirement(requirementId);
  if (!requirement) return;

  const label = REQUIREMENT_STATUS_LABELS[toStatus as keyof typeof REQUIREMENT_STATUS_LABELS] ?? toStatus;
  await createPartnerNotification({
    partnerId: requirement.partner_id,
    requirementId,
    type: 'status_change',
    title: `Status updated: ${label}`,
    message: note || `${requirement.reference_id} moved from ${fromStatus ?? 'new'} to ${toStatus}.`,
    link: `/partner/requirements/${requirementId}`,
  });

  await logPartnerActivity(requirement.partner_id, 'requirement_status_changed', {
    entityType: 'requirement',
    entityId: requirementId,
    metadata: { from: fromStatus, to: toStatus, reference_id: requirement.reference_id },
  });
}
