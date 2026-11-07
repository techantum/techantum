import { Resend } from 'resend';
import { escapeHtml, loadEmailBrand, renderBrandedEmail } from '@/lib/email/template';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

function hrFromAddress() {
  return process.env.HR_FROM_EMAIL || 'TechAntum HR <hr@techantum.com>';
}

export async function sendPayslipEmail(input: {
  to: string;
  employeeName: string;
  employeeCode: string;
  monthLabel: string;
  filename: string;
  pdf: Buffer;
}): Promise<{ ok: boolean; error?: string }> {
  if (!resend) return { ok: false, error: 'RESEND_API_KEY is not configured' };

  const brand = await loadEmailBrand();
  const { error } = await resend.emails.send({
    from: hrFromAddress(),
    to: [input.to],
    replyTo: 'hr@techantum.com',
    subject: `Payslip for ${input.monthLabel} — ${input.employeeCode}`,
    html: renderBrandedEmail(brand, {
      kicker: 'HR · PAYSLIP',
      title: `Your payslip for ${input.monthLabel}`,
      subtitle: 'The PDF is attached to this email for your records.',
      facts: [
        { label: 'Employee', value: input.employeeName },
        { label: 'Employee ID', value: input.employeeCode },
        { label: 'Period', value: input.monthLabel },
      ],
      bodyHtml: `<p style="margin:0 0 12px;">Dear ${escapeHtml(input.employeeName)},</p>
        <p style="margin:0 0 12px;">Please find attached your payslip for <strong>${escapeHtml(input.monthLabel)}</strong>.</p>
        <p style="margin:0;">If you have any questions about this payslip, reply to this email or write to <a href="mailto:hr@techantum.com" style="color:#EF4323;">hr@techantum.com</a>.</p>`,
      footnote: 'This email was sent by Techantum HR. Please keep your payslip confidential.',
    }),
    attachments: [
      {
        filename: input.filename,
        content: input.pdf.toString('base64'),
      },
    ],
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
