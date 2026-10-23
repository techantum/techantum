import { Resend } from 'resend';
import { escapeHtml, loadEmailBrand, renderBrandedEmail } from '@/lib/email/template';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export interface ContactEmailData {
  name: string;
  phone: string;
  productCategory: string;
  source?: string;
  country?: string;
  email?: string;
  quantity?: string;
  message?: string;
}

const SOURCE_LABELS: Record<string, string> = {
  homepage_hero: 'Homepage hero form',
  contact_page: 'Contact page form',
};

async function buildContactEmailHtml(data: ContactEmailData): Promise<string> {
  const sourceLabel = SOURCE_LABELS[data.source || 'contact_page'] || data.source || 'Website form';
  const isHero = data.source === 'homepage_hero';

  const rows = isHero
    ? [
        ['Full Name', data.name],
        ['Phone Number', data.phone],
        ['Service Required', data.productCategory],
        ['Form Source', sourceLabel],
      ]
    : [
        ['Full Name', data.name],
        ['Country', data.country || '—'],
        ['Email Address', data.email || '—'],
        ['Phone Number', data.phone],
        ['Service Required', data.productCategory],
        ['Timeline / Budget', data.quantity || '—'],
        ['Additional Message', data.message || '—'],
        ['Form Source', sourceLabel],
      ];

  const tableRows = rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#374151;width:180px;vertical-align:top;">${escapeHtml(label)}</td>
          <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;color:#111827;">${escapeHtml(value)}</td>
        </tr>`
    )
    .join('');

  const replyNote = data.email && data.email.includes('@')
    ? `Reply directly to <a href="mailto:${escapeHtml(data.email)}" style="color:#EF4323;">${escapeHtml(data.email)}</a> to continue the conversation.`
    : `Contact the lead by phone at <strong>${escapeHtml(data.phone)}</strong>.`;

  const brand = await loadEmailBrand();
  return renderBrandedEmail(brand, {
    kicker: 'WEBSITE',
    title: `New lead — ${sourceLabel}`,
    subtitle: 'A prospective client has submitted an inquiry. Please respond within 24 hours.',
    facts: [
      { label: 'Name', value: data.name },
      { label: 'Service', value: data.productCategory },
    ],
    bodyHtml: `<p style="margin:0 0 12px;">Dear Team,</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8edf2;border-radius:12px;border-collapse:separate;">
        ${tableRows}
      </table>
      <p style="margin:16px 0 0;font-size:13px;color:#64748b;">${replyNote}</p>`,
  });
}

export async function sendContactNotification(data: ContactEmailData): Promise<{ ok: boolean; error?: string }> {
  if (!resend) {
    return { ok: false, error: 'RESEND_API_KEY is not configured' };
  }

  const to = process.env.CONTACT_INBOX || 'info@techantum.com';
  const from = process.env.RESEND_FROM_EMAIL || 'TechAntum <onboarding@resend.dev>';
  const sourceLabel = SOURCE_LABELS[data.source || 'contact_page'] || 'Website';

  const payload: Parameters<typeof resend.emails.send>[0] = {
    from,
    to: [to],
    subject: `[TechAntum] New lead from ${data.name} — ${data.productCategory} (${sourceLabel})`,
    html: await buildContactEmailHtml(data),
  };

  if (data.email && data.email.includes('@')) {
    payload.replyTo = data.email;
  }

  const { error } = await resend.emails.send(payload);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function sendContactConfirmation(data: ContactEmailData): Promise<{ ok: boolean; error?: string }> {
  if (!resend) {
    return { ok: false, error: 'RESEND_API_KEY is not configured' };
  }

  if (!data.email || !data.email.includes('@')) {
    return { ok: true };
  }

  const from = process.env.RESEND_FROM_EMAIL || 'TechAntum <onboarding@resend.dev>';
  const brand = await loadEmailBrand();

  const { error } = await resend.emails.send({
    from,
    to: [data.email],
    subject: 'Thank you for contacting TechAntum',
    html: renderBrandedEmail(brand, {
      kicker: 'TECHANTUM',
      title: 'Thank you for contacting us',
      subtitle: 'We will respond within 24 hours.',
      facts: [{ label: 'Service', value: data.productCategory }],
      bodyHtml: `<p style="margin:0 0 12px;">Dear ${escapeHtml(data.name)},</p>
        <p style="margin:0;">Thank you for reaching out. We have received your inquiry regarding <strong>${escapeHtml(data.productCategory)}</strong>.</p>`,
    }),
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
