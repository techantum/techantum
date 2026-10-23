import { Resend } from 'resend';
import type { PartnerType } from '@/lib/partner/types';
import { escapeHtml, formatEmailDate, loadEmailBrand, renderBrandedEmail, renderPartnerInvitationEmail, renderPartnerTeamInvitationEmail, type EmailBrand } from '@/lib/email/template';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export interface PartnerInviteEmailData {
  to: string;
  contactName: string;
  companyName: string;
  partnerCode: string;
  partnerType: PartnerType;
  onboardUrl: string;
}

function buildPartnerInviteHtml(brand: EmailBrand, data: PartnerInviteEmailData): string {
  return renderPartnerInvitationEmail(brand, {
    contactName: data.contactName,
    companyName: data.companyName,
    onboardUrl: data.onboardUrl,
    audience: 'partner',
  });
}

export async function sendPartnerInviteEmail(
  data: PartnerInviteEmailData
): Promise<{ ok: boolean; error?: string }> {
  if (!resend) {
    return { ok: false, error: 'RESEND_API_KEY is not configured' };
  }

  const from = process.env.RESEND_FROM_EMAIL || 'TechAntum <info@techantum.com>';
  const brand = await loadEmailBrand();

  const { error } = await resend.emails.send({
    from,
    to: [data.to],
    subject: `Welcome to Techantum Partner Portal — set your password`,
    html: buildPartnerInviteHtml(brand, data),
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function sendPartnerPasswordResetEmail(
  to: string,
  contactName: string,
  resetUrl: string
): Promise<{ ok: boolean; error?: string }> {
  if (!resend) {
    return { ok: false, error: 'RESEND_API_KEY is not configured' };
  }

  const from = process.env.RESEND_FROM_EMAIL || 'TechAntum <info@techantum.com>';
  const brand = await loadEmailBrand();

  const { error } = await resend.emails.send({
    from,
    to: [to],
    subject: 'Reset your TechAntum Partner Portal password',
    html: renderBrandedEmail(brand, {
      kicker: 'PARTNER PORTAL',
      title: 'Reset your password',
      subtitle: 'This link expires in 1 hour.',
      bodyHtml: `<p style="margin:0 0 12px;">Dear ${escapeHtml(contactName)},</p>
        <p style="margin:0;">We received a request to reset your Partner Portal password. If you didn't request this, you can ignore this email.</p>`,
      action: { href: resetUrl, label: 'Reset password' },
    }),
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export interface RequirementSubmittedEmailData {
  referenceId: string;
  projectName: string;
  partnerName: string;
  partnerEmail: string;
  partnerCompany: string;
  serviceName: string;
  packageName: string;
  budgetRange: string;
  timeline: string;
  sowMarkdown: string;
  promptText: string;
  questionnaireJson: string;
  requirementId?: string;
  submittedAt?: string;
}

function detailLine(label: string, value: string) {
  return `<p style="margin:0 0 6px;"><strong style="color:#0f172a;">${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`;
}

function buildInternalRequirementHtml(brand: EmailBrand, data: RequirementSubmittedEmailData): string {
  const reviewUrl = data.requirementId ? `${brand.siteUrl}/admin/partner-requirements/${data.requirementId}` : '';
  return renderBrandedEmail(brand, {
    kicker: 'PARTNER PORTAL',
    title: 'New requirement submitted',
    subtitle: `A new requirement has been submitted on the ${brand.companyName} Partner Portal and is ready for your review.`,
    facts: [
      { label: 'Reference No.', value: data.referenceId },
      { label: 'Service', value: data.serviceName },
      { label: 'Submitted On', value: formatEmailDate(data.submittedAt || new Date()) },
    ],
    bodyHtml: `<p style="margin:0 0 12px;">Hello Team,</p>
      <p style="margin:0 0 16px;">A new requirement has been submitted. Please review the details, prepare the proposal with timeline and cost, and update the status in the partner portal.</p>
      ${detailLine('Project', data.projectName)}
      ${detailLine('Partner', `${data.partnerName} (${data.partnerCompany})`)}
      ${detailLine('Package', data.packageName)}
      ${detailLine('Budget', data.budgetRange)}
      ${detailLine('Timeline', data.timeline)}`,
    action: reviewUrl ? { href: reviewUrl, label: 'View Requirement' } : undefined,
  });
}

function buildPartnerRequirementHtml(brand: EmailBrand, data: RequirementSubmittedEmailData): string {
  const reviewUrl = data.requirementId ? `${brand.siteUrl}/partner/requirements/${data.requirementId}` : `${brand.siteUrl}/partner/requirements`;
  return renderBrandedEmail(brand, {
    kicker: 'PARTNER PORTAL',
    title: 'Requirement submitted',
    subtitle: 'Our team will review it and respond within 24–48 business hours.',
    facts: [
      { label: 'Reference No.', value: data.referenceId },
      { label: 'Service', value: data.serviceName },
      { label: 'Submitted On', value: formatEmailDate(data.submittedAt || new Date()) },
    ],
    bodyHtml: `<p style="margin:0 0 12px;">Dear ${escapeHtml(data.partnerName)},</p>
      <p style="margin:0;">Your requirement for <strong>${escapeHtml(data.projectName)}</strong> has been submitted. You can follow the status from the Partner Portal.</p>`,
    action: { href: reviewUrl, label: 'View Requirement' },
  });
}

export async function sendRequirementSubmittedEmails(
  data: RequirementSubmittedEmailData
): Promise<{ internalOk: boolean; partnerOk: boolean; internalError?: string; partnerError?: string }> {
  if (!resend) {
    return { internalOk: false, partnerOk: false, internalError: 'RESEND not configured', partnerError: 'RESEND not configured' };
  }

  const from = process.env.RESEND_FROM_EMAIL || 'TechAntum <info@techantum.com>';
  const brand = await loadEmailBrand();
  const salesInbox = process.env.PARTNER_SALES_INBOX || process.env.CONTACT_INBOX || 'sales@techantum.com';
  const supportInbox = process.env.PARTNER_SUPPORT_INBOX || 'support@techantum.com';
  const recipients = [...new Set([salesInbox, supportInbox])];

  const internalResult = await resend.emails.send({
    from,
    to: recipients,
    subject: `New Client Requirement Submitted — ${data.referenceId}`,
    html: buildInternalRequirementHtml(brand, data),
    attachments: [
      { filename: `${data.referenceId}-SOW.md`, content: Buffer.from(data.sowMarkdown).toString('base64') },
      { filename: `${data.referenceId}-questionnaire.json`, content: Buffer.from(data.questionnaireJson).toString('base64') },
    ],
  });

  let partnerOk = false;
  let partnerError: string | undefined;

  if (data.partnerEmail) {
    const partnerResult = await resend.emails.send({
      from,
      to: [data.partnerEmail],
      subject: `Requirement Submitted — ${data.referenceId}`,
      html: buildPartnerRequirementHtml(brand, data),
      attachments: [
        { filename: `${data.referenceId}-SOW.md`, content: Buffer.from(data.sowMarkdown).toString('base64') },
      ],
    });
    partnerOk = !partnerResult.error;
    partnerError = partnerResult.error?.message;
  }

  return {
    internalOk: !internalResult.error,
    partnerOk,
    internalError: internalResult.error?.message,
    partnerError,
  };
}

export async function sendPartnerOtpEmail(
  to: string,
  contactName: string,
  otpCode: string,
  expiryMinutes: number
): Promise<{ ok: boolean; error?: string }> {
  if (!resend) {
    return { ok: false, error: 'RESEND_API_KEY is not configured' };
  }

  const from = process.env.RESEND_FROM_EMAIL || 'TechAntum <info@techantum.com>';
  const brand = await loadEmailBrand();

  const { error } = await resend.emails.send({
    from,
    to: [to],
    subject: `${otpCode} — Your TechAntum Partner Portal verification code`,
    html: renderBrandedEmail(brand, {
      kicker: 'PARTNER PORTAL',
      title: 'Verification code',
      subtitle: `This code expires in ${expiryMinutes} minutes.`,
      facts: [{ label: 'Code', value: otpCode }],
      bodyHtml: `<p style="margin:0 0 12px;">Dear ${escapeHtml(contactName)},</p>
        <p style="margin:0 0 12px;">Use this code to continue signing in to the Partner Portal:</p>
        <p style="margin:0;font-size:32px;font-weight:700;letter-spacing:8px;color:#0f172a;">${escapeHtml(otpCode)}</p>
        <p style="margin:16px 0 0;">If you didn't attempt to sign in, you can ignore this email.</p>`,
    }),
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export interface PartnerTeamInviteEmailData {
  to: string;
  contactName: string;
  companyName: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  onboardUrl: string;
  expiryDays?: number;
}

function partnerFromAddress(partnerName: string) {
  const configured = process.env.RESEND_FROM_EMAIL || 'invites@techantum.com';
  const match = configured.match(/<([^>]+)>/);
  const email = (match?.[1] || configured).replace(/[\r\n<>]/g, '').trim();
  const name = partnerName.replace(/[\r\n<>"]/g, ' ').replace(/\s+/g, ' ').trim() || 'Team';
  return `${name} <${email}>`;
}

export async function sendPartnerTeamInviteEmail(
  data: PartnerTeamInviteEmailData
): Promise<{ ok: boolean; error?: string }> {
  if (!resend) {
    return { ok: false, error: 'RESEND_API_KEY is not configured' };
  }

  const partnerName = data.companyName.replace(/[\r\n]/g, ' ').trim();
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://techantum.com').replace(/\/$/, '');
  const message = renderPartnerTeamInvitationEmail({
    partnerName,
    inviteeName: data.contactName,
    logoUrl: data.logoUrl,
    primaryColor: data.primaryColor,
    invitationUrl: data.onboardUrl,
    expiryDays: data.expiryDays,
    siteUrl,
  });

  const { error } = await resend.emails.send({
    from: partnerFromAddress(partnerName),
    to: [data.to],
    subject: `You're Invited to Join ${partnerName}`,
    html: message.html,
    text: message.text,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function sendProposalToPartnerEmail(data: {
  referenceId: string;
  projectName: string;
  partnerName: string;
  partnerEmail: string;
  proposalSummary: string;
  proposalAmount: string;
  proposalTimeline: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!resend) {
    return { ok: false, error: 'RESEND_API_KEY is not configured' };
  }

  const from = process.env.RESEND_FROM_EMAIL || 'TechAntum <info@techantum.com>';
  const brand = await loadEmailBrand();

  const { error } = await resend.emails.send({
    from,
    to: [data.partnerEmail],
    subject: `Project Proposal — ${data.referenceId}`,
    html: renderBrandedEmail(brand, {
      kicker: 'PARTNER PORTAL',
      title: 'Project proposal ready',
      subtitle: 'Review the estimate and timeline in the Partner Portal.',
      facts: [
        { label: 'Reference No.', value: data.referenceId },
        { label: 'Investment', value: data.proposalAmount },
        { label: 'Timeline', value: data.proposalTimeline },
      ],
      bodyHtml: `<p style="margin:0 0 12px;">Dear ${escapeHtml(data.partnerName)},</p>
        <p style="margin:0 0 12px;">Our team has prepared a proposal for <strong>${escapeHtml(data.projectName)}</strong>.</p>
        <p style="margin:0;">${escapeHtml(data.proposalSummary)}</p>`,
      action: { href: `${brand.siteUrl}/partner/requirements`, label: 'View Requirement' },
    }),
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function sendClarificationRequestEmail(data: {
  referenceId: string;
  projectName: string;
  partnerName: string;
  partnerEmail: string;
  message: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!resend) return { ok: false, error: 'RESEND not configured' };

  const from = process.env.RESEND_FROM_EMAIL || 'TechAntum <info@techantum.com>';
  const brand = await loadEmailBrand();
  const { error } = await resend.emails.send({
    from,
    to: [data.partnerEmail],
    subject: `Clarification Needed — ${data.referenceId}`,
    html: renderBrandedEmail(brand, {
      kicker: 'PARTNER PORTAL',
      title: 'Clarification needed',
      subtitle: 'Please reply from My Requirements in the Partner Portal.',
      facts: [
        { label: 'Reference No.', value: data.referenceId },
        { label: 'Project', value: data.projectName },
      ],
      bodyHtml: `<p style="margin:0 0 12px;">Dear ${escapeHtml(data.partnerName)},</p>
        <p style="margin:0 0 12px;">We need additional information before we can continue.</p>
        <p style="margin:0;padding:12px 16px;border-left:4px solid #EF4323;background:#f8fafc;">${escapeHtml(data.message)}</p>`,
      action: { href: `${brand.siteUrl}/partner/requirements`, label: 'View Requirement' },
    }),
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function sendClarificationReplyEmail(data: {
  referenceId: string;
  projectName: string;
  partnerName: string;
  partnerCompany: string;
  message: string;
  salesInbox: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!resend) return { ok: false, error: 'RESEND not configured' };

  const from = process.env.RESEND_FROM_EMAIL || 'TechAntum <info@techantum.com>';
  const brand = await loadEmailBrand();
  const { error } = await resend.emails.send({
    from,
    to: [data.salesInbox],
    subject: `Partner Clarification Reply — ${data.referenceId}`,
    html: renderBrandedEmail(brand, {
      kicker: 'PARTNER PORTAL',
      title: 'Clarification reply',
      subtitle: `${data.partnerName} (${data.partnerCompany}) replied on this requirement.`,
      facts: [
        { label: 'Reference No.', value: data.referenceId },
        { label: 'Project', value: data.projectName },
      ],
      bodyHtml: `<p style="margin:0;padding:12px 16px;border-left:4px solid #EF4323;background:#f8fafc;">${escapeHtml(data.message)}</p>`,
      action: { href: `${brand.siteUrl}/admin/partner-requirements`, label: 'View Requirement' },
    }),
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
