import { Resend } from 'resend';
import { escapeHtml, loadEmailBrand, renderBrandedEmail } from '@/lib/email/template';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendAdminInviteEmail(input: {
  to: string;
  name: string;
  roleName: string;
  inviteUrl: string;
  hours: number;
}): Promise<{ ok: boolean; error?: string }> {
  if (!resend) return { ok: false, error: 'RESEND_API_KEY is not configured' };
  const from = process.env.RESEND_FROM_EMAIL || 'TechAntum <info@techantum.com>';
  const brand = await loadEmailBrand();
  const { error } = await resend.emails.send({
    from,
    to: [input.to],
    subject: 'You are invited to the Techantum Admin Portal',
    html: renderBrandedEmail(brand, {
      kicker: 'ADMIN PORTAL',
      title: 'You are invited',
      subtitle: `This invitation expires in ${input.hours} hours.`,
      facts: [
        { label: 'Role', value: input.roleName },
        { label: 'Email', value: input.to },
      ],
      bodyHtml: `<p style="margin:0 0 12px;">Dear ${escapeHtml(input.name)},</p>
        <p style="margin:0;">You have been invited to the Techantum Admin Portal. Create your password using the button below. We never send passwords by email.</p>`,
      action: { href: input.inviteUrl, label: 'Accept Invitation' },
      footnote: 'If you were not expecting this invitation, you can ignore this email.',
    }),
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
