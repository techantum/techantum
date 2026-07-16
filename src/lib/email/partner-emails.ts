import { Resend } from 'resend';
import { PARTNER_TYPE_LABELS, type PartnerType } from '@/lib/partner/types';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface PartnerInviteEmailData {
  to: string;
  contactName: string;
  companyName: string;
  partnerCode: string;
  partnerType: PartnerType;
  onboardUrl: string;
}

function buildPartnerInviteHtml(data: PartnerInviteEmailData): string {
  const typeLabel = PARTNER_TYPE_LABELS[data.partnerType] || data.partnerType;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Inter,Segoe UI,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#1e1b4b,#6366f1);padding:32px;">
              <p style="margin:0 0 4px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.85);">TechAntum</p>
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#ffffff;">Partner Portal Invitation</h1>
              <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.9);">You're invited to join as a ${escapeHtml(typeLabel)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
                Dear ${escapeHtml(data.contactName)},<br><br>
                Welcome to the <strong>TechAntum Partner Portal</strong>. Your account for
                <strong>${escapeHtml(data.companyName)}</strong> has been created.
              </p>
              <table role="presentation" width="100%" style="background:#f9fafb;border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 4px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Partner ID</p>
                    <p style="margin:0;font-size:18px;font-weight:700;color:#1e1b4b;font-family:monospace;">${escapeHtml(data.partnerCode)}</p>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
                Click the button below to set your password and complete onboarding. This link expires in 7 days.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#6366f1;border-radius:8px;">
                    <a href="${escapeHtml(data.onboardUrl)}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
                      Set Password &amp; Get Started
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;line-height:1.5;">
                If the button doesn't work, copy this link:<br>
                <a href="${escapeHtml(data.onboardUrl)}" style="color:#6366f1;word-break:break-all;">${escapeHtml(data.onboardUrl)}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center;">
                TechAntum Partner Portal · info@techantum.com
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendPartnerInviteEmail(
  data: PartnerInviteEmailData
): Promise<{ ok: boolean; error?: string }> {
  if (!resend) {
    return { ok: false, error: 'RESEND_API_KEY is not configured' };
  }

  const from = process.env.RESEND_FROM_EMAIL || 'TechAntum <info@techantum.com>';

  const { error } = await resend.emails.send({
    from,
    to: [data.to],
    subject: `Welcome to TechAntum Partner Portal — Set Your Password (${data.partnerCode})`,
    html: buildPartnerInviteHtml(data),
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

  const { error } = await resend.emails.send({
    from,
    to: [to],
    subject: 'Reset your TechAntum Partner Portal password',
    html: `<!DOCTYPE html>
<html><body style="font-family:Inter,sans-serif;color:#374151;line-height:1.6;padding:24px;">
  <p>Dear ${escapeHtml(contactName)},</p>
  <p>We received a request to reset your Partner Portal password.</p>
  <p><a href="${escapeHtml(resetUrl)}" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Reset Password</a></p>
  <p style="font-size:12px;color:#9ca3af;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
  <p>Best regards,<br><strong>TechAntum Team</strong></p>
</body></html>`,
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
}

function buildInternalRequirementHtml(data: RequirementSubmittedEmailData): string {
  return `<!DOCTYPE html>
<html><body style="font-family:Inter,sans-serif;color:#374151;line-height:1.6;padding:24px;">
  <h2 style="color:#1e1b4b;">New Client Requirement Submitted</h2>
  <table style="border-collapse:collapse;width:100%;max-width:600px;">
    <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:600;">Reference ID</td><td style="padding:8px;border:1px solid #e5e7eb;">${escapeHtml(data.referenceId)}</td></tr>
    <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:600;">Project</td><td style="padding:8px;border:1px solid #e5e7eb;">${escapeHtml(data.projectName)}</td></tr>
    <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:600;">Partner</td><td style="padding:8px;border:1px solid #e5e7eb;">${escapeHtml(data.partnerName)} (${escapeHtml(data.partnerCompany)})</td></tr>
    <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:600;">Service</td><td style="padding:8px;border:1px solid #e5e7eb;">${escapeHtml(data.serviceName)}</td></tr>
    <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:600;">Package</td><td style="padding:8px;border:1px solid #e5e7eb;">${escapeHtml(data.packageName)}</td></tr>
    <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:600;">Budget</td><td style="padding:8px;border:1px solid #e5e7eb;">${escapeHtml(data.budgetRange)}</td></tr>
    <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:600;">Timeline</td><td style="padding:8px;border:1px solid #e5e7eb;">${escapeHtml(data.timeline)}</td></tr>
  </table>
  <p style="margin-top:24px;">Review the full Scope of Work in Admin → Partner Requirements.</p>
</body></html>`;
}

export async function sendRequirementSubmittedEmails(
  data: RequirementSubmittedEmailData
): Promise<{ internalOk: boolean; partnerOk: boolean; internalError?: string; partnerError?: string }> {
  if (!resend) {
    return { internalOk: false, partnerOk: false, internalError: 'RESEND not configured', partnerError: 'RESEND not configured' };
  }

  const from = process.env.RESEND_FROM_EMAIL || 'TechAntum <info@techantum.com>';
  const salesInbox = process.env.PARTNER_SALES_INBOX || process.env.CONTACT_INBOX || 'sales@techantum.com';
  const supportInbox = process.env.PARTNER_SUPPORT_INBOX || 'support@techantum.com';
  const recipients = [...new Set([salesInbox, supportInbox])];

  const internalResult = await resend.emails.send({
    from,
    to: recipients,
    subject: `New Client Requirement Submitted — ${data.referenceId}`,
    html: buildInternalRequirementHtml(data),
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
      html: `<!DOCTYPE html>
<html><body style="font-family:Inter,sans-serif;color:#374151;padding:24px;">
  <p>Dear ${escapeHtml(data.partnerName)},</p>
  <p>Your client requirement <strong>${escapeHtml(data.referenceId)}</strong> for <strong>${escapeHtml(data.projectName)}</strong> has been submitted successfully.</p>
  <p>Our team will review and respond within 24–48 business hours.</p>
  <p>Best regards,<br><strong>TechAntum Team</strong></p>
</body></html>`,
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

  const { error } = await resend.emails.send({
    from,
    to: [to],
    subject: `${otpCode} — Your TechAntum Partner Portal verification code`,
    html: `<!DOCTYPE html>
<html><body style="font-family:Inter,sans-serif;color:#374151;padding:24px;">
  <p>Dear ${escapeHtml(contactName)},</p>
  <p>Your verification code for the Partner Portal is:</p>
  <p style="font-size:32px;font-weight:700;letter-spacing:8px;color:#1e1b4b;">${escapeHtml(otpCode)}</p>
  <p>This code expires in ${expiryMinutes} minutes. If you didn't attempt to sign in, ignore this email.</p>
  <p>Best regards,<br><strong>TechAntum Team</strong></p>
</body></html>`,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export interface PartnerTeamInviteEmailData {
  to: string;
  contactName: string;
  companyName: string;
  partnerCode: string;
  onboardUrl: string;
}

export async function sendPartnerTeamInviteEmail(
  data: PartnerTeamInviteEmailData
): Promise<{ ok: boolean; error?: string }> {
  if (!resend) {
    return { ok: false, error: 'RESEND_API_KEY is not configured' };
  }

  const from = process.env.RESEND_FROM_EMAIL || 'TechAntum <info@techantum.com>';

  const { error } = await resend.emails.send({
    from,
    to: [data.to],
    subject: `You're invited to ${data.companyName} on TechAntum Partner Portal`,
    html: `<!DOCTYPE html>
<html><body style="font-family:Inter,sans-serif;color:#374151;padding:24px;">
  <p>Dear ${escapeHtml(data.contactName)},</p>
  <p>You've been invited to join <strong>${escapeHtml(data.companyName)}</strong> (${escapeHtml(data.partnerCode)}) on the TechAntum Partner Portal.</p>
  <p><a href="${escapeHtml(data.onboardUrl)}" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Set Password &amp; Join Team</a></p>
  <p style="font-size:12px;color:#9ca3af;">Link expires in 7 days.</p>
</body></html>`,
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

  const { error } = await resend.emails.send({
    from,
    to: [data.partnerEmail],
    subject: `Project Proposal — ${data.referenceId}`,
    html: `<!DOCTYPE html>
<html><body style="font-family:Inter,sans-serif;color:#374151;padding:24px;">
  <h2 style="color:#1e1b4b;">Project Proposal Ready</h2>
  <p>Dear ${escapeHtml(data.partnerName)},</p>
  <p>Our team has prepared a proposal for <strong>${escapeHtml(data.projectName)}</strong> (${escapeHtml(data.referenceId)}).</p>
  <table style="border-collapse:collapse;width:100%;max-width:500px;margin:16px 0;">
    <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:600;">Estimated Investment</td><td style="padding:8px;border:1px solid #e5e7eb;">${escapeHtml(data.proposalAmount)}</td></tr>
    <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:600;">Timeline</td><td style="padding:8px;border:1px solid #e5e7eb;">${escapeHtml(data.proposalTimeline)}</td></tr>
  </table>
  <p>${escapeHtml(data.proposalSummary)}</p>
  <p>View full details in your Partner Portal under My Requirements.</p>
  <p>Best regards,<br><strong>TechAntum Team</strong></p>
</body></html>`,
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
  const { error } = await resend.emails.send({
    from,
    to: [data.partnerEmail],
    subject: `Clarification Needed — ${data.referenceId}`,
    html: `<!DOCTYPE html>
<html><body style="font-family:Inter,sans-serif;color:#374151;padding:24px;">
  <p>Dear ${escapeHtml(data.partnerName)},</p>
  <p>We need additional information for <strong>${escapeHtml(data.projectName)}</strong> (${escapeHtml(data.referenceId)}).</p>
  <blockquote style="border-left:4px solid #6366f1;padding-left:16px;margin:16px 0;color:#4b5563;">
    ${escapeHtml(data.message)}
  </blockquote>
  <p>Please reply in the Partner Portal under My Requirements.</p>
  <p>Best regards,<br><strong>TechAntum Team</strong></p>
</body></html>`,
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
  const { error } = await resend.emails.send({
    from,
    to: [data.salesInbox],
    subject: `Partner Clarification Reply — ${data.referenceId}`,
    html: `<!DOCTYPE html>
<html><body style="font-family:Inter,sans-serif;color:#374151;padding:24px;">
  <h2 style="color:#1e1b4b;">Partner Clarification Reply</h2>
  <p><strong>${escapeHtml(data.partnerName)}</strong> (${escapeHtml(data.partnerCompany)}) replied on ${escapeHtml(data.referenceId)}.</p>
  <blockquote style="border-left:4px solid #6366f1;padding-left:16px;margin:16px 0;">
    ${escapeHtml(data.message)}
  </blockquote>
  <p>Review in Admin → Partner Requirements.</p>
</body></html>`,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
