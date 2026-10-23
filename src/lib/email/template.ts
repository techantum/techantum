export interface EmailBrand {
  companyName: string;
  tagline: string;
  logoUrl: string;
  siteUrl: string;
  websiteLabel: string;
  email: string;
  linkedinUrl: string;
  youtubeUrl: string;
}

export interface EmailFact {
  label: string;
  value: string;
}

export interface BrandedEmailOptions {
  kicker: string;
  title: string;
  subtitle?: string;
  facts?: EmailFact[];
  bodyHtml: string;
  action?: { href: string; label: string };
  footnote?: string;
}

const ORANGE = '#EF4323';

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function absoluteUrl(siteUrl: string, value: string | null | undefined, fallbackPath: string) {
  const raw = (value || fallbackPath).trim();
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${siteUrl}/${raw.replace(/^\//, '')}`;
}

export async function loadEmailBrand(): Promise<EmailBrand> {
  let companyName = 'Techantum Solutions';
  let tagline = 'Smarter Insights. Stronger Growth.';
  let logo: string | null = null;
  let email = 'info@techantum.com';
  let siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://techantum.com').replace(/\/$/, '');
  let linkedinUrl = 'https://www.linkedin.com/company/techantum';
  let youtubeUrl = '';

  try {
    const { getBranding, getSeo } = await import('@/lib/cms');
    const [branding, seo] = await Promise.all([getBranding(), getSeo()]);
    companyName = branding.company_name || companyName;
    tagline = branding.tagline || tagline;
    logo = branding.logo_url || branding.footer_logo_url;
    email = branding.email || email;
    siteUrl = (seo.site_url || siteUrl).replace(/\/$/, '');
    linkedinUrl = seo.linkedin_url || linkedinUrl;
    youtubeUrl = seo.youtube_url || '';
  } catch {
    /* Keep the public logo and site defaults if branding cannot be read. */
  }

  return {
    companyName,
    tagline,
    logoUrl: absoluteUrl(siteUrl, logo, '/logo.jpg'),
    siteUrl,
    websiteLabel: siteUrl.replace(/^https?:\/\//, '').replace(/^techantum\.com$/, 'www.techantum.com'),
    email,
    linkedinUrl,
    youtubeUrl,
  };
}

function logoImage(brand: EmailBrand, height: number) {
  return `<img src="${escapeHtml(brand.logoUrl)}" alt="${escapeHtml(brand.companyName)}" height="${height}" style="display:block;height:${height}px;width:auto;max-width:180px;border:0;outline:none;text-decoration:none;">`;
}

function assetUrl(brand: EmailBrand, name: string) {
  return `${brand.siteUrl}/email/${name}.png`;
}

function socialLink(brand: EmailBrand, href: string, icon: string, label: string) {
  if (!href) return '';
  return `<td style="padding:0 6px;">
    <a href="${escapeHtml(href)}" style="text-decoration:none;">
      <img src="${escapeHtml(assetUrl(brand, icon))}" alt="${escapeHtml(label)}" width="32" height="32" style="display:block;width:32px;height:32px;border:0;">
    </a>
  </td>`;
}

function factsRow(facts: EmailFact[]) {
  if (!facts.length) return '';
  const cells = facts
    .map(
      (fact, index) => `<td width="${Math.floor(100 / facts.length)}%" style="padding:14px 16px;${index ? 'border-left:1px solid #e8edf2;' : ''}" valign="top">
        <p style="margin:0 0 4px;font-size:12px;line-height:1.3;color:#94a3b8;">${escapeHtml(fact.label)}</p>
        <p style="margin:0;font-size:14px;line-height:1.4;font-weight:700;color:#0f172a;">${escapeHtml(fact.value)}</p>
      </td>`
    )
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 8px;background:#f8fafc;border-radius:12px;">
    <tr>${cells}</tr>
  </table>`;
}

export function renderBrandedEmail(brand: EmailBrand, options: BrandedEmailOptions): string {
  const facts = (options.facts || []).filter((fact) => fact.value);
  const action = options.action?.href
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 8px;">
        <tr>
          <td bgcolor="${ORANGE}" style="border-radius:8px;">
            <a href="${escapeHtml(options.action.href)}" style="display:inline-block;padding:12px 22px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">${escapeHtml(options.action.label)} &rarr;</a>
          </td>
        </tr>
      </table>`
    : '';
  const social = [
    socialLink(brand, brand.linkedinUrl, 'linkedin', 'LinkedIn'),
    socialLink(brand, brand.youtubeUrl, 'youtube', 'YouTube'),
    socialLink(brand, brand.siteUrl, 'globe', 'Website'),
  ].join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(options.title)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#334155;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="width:640px;max-width:640px;background:#ffffff;border:1px solid #e8edf2;border-radius:16px;">
          <tr>
            <td style="padding:22px 28px 18px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td valign="middle">${logoImage(brand, 38)}</td>
                  <td valign="middle" align="right" style="font-size:13px;line-height:1.4;color:#94a3b8;">${escapeHtml(brand.tagline)}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr><td style="padding:0 28px;"><div style="height:1px;background:#eef2f6;line-height:1px;font-size:1px;">&nbsp;</div></td></tr>
          <tr>
            <td style="padding:26px 28px 8px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td valign="top" style="padding-right:14px;">
                    <img src="${escapeHtml(assetUrl(brand, 'doc'))}" alt="" width="48" height="48" style="display:block;width:48px;height:48px;border:0;">
                  </td>
                  <td valign="middle">
                    <p style="margin:0 0 4px;font-size:11px;letter-spacing:1.4px;font-weight:700;color:#94a3b8;">${escapeHtml(options.kicker)}</p>
                    <h1 style="margin:0;font-size:26px;line-height:1.25;font-weight:700;color:#0f172a;">${escapeHtml(options.title)}</h1>
                  </td>
                </tr>
              </table>
              ${options.subtitle ? `<p style="margin:14px 0 0;font-size:15px;line-height:1.6;color:#64748b;">${escapeHtml(options.subtitle)}</p>` : ''}
              ${factsRow(facts)}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 8px;font-size:15px;line-height:1.65;color:#475569;">
              ${options.bodyHtml}
              ${action}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 22px;">
              <div style="height:1px;background:#eef2f6;line-height:1px;font-size:1px;margin-bottom:14px;">&nbsp;</div>
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td valign="middle" style="padding-right:8px;"><img src="${escapeHtml(assetUrl(brand, 'info'))}" alt="" width="16" height="16" style="display:block;width:16px;height:16px;border:0;"></td>
                  <td valign="middle" style="font-size:12px;line-height:1.5;color:#94a3b8;">${escapeHtml(options.footnote || `This is an automated email from ${brand.companyName}. Please do not reply to this email.`)}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="width:640px;max-width:640px;margin-top:18px;">
          <tr>
            <td valign="middle" width="34%">${logoImage(brand, 28)}</td>
            <td valign="middle" align="center">
              <table role="presentation" cellpadding="0" cellspacing="0"><tr>${social}</tr></table>
            </td>
            <td valign="middle" align="right" width="34%">
              <a href="${escapeHtml(brand.siteUrl)}" style="font-size:13px;color:#64748b;text-decoration:none;">${escapeHtml(brand.websiteLabel)}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

const INVITE_ORANGE = '#F44324';

export function renderPartnerInvitationEmail(
  brand: EmailBrand,
  options: {
    contactName: string;
    companyName: string;
    onboardUrl: string;
    audience: 'team' | 'partner';
  }
): string {
  const company = escapeHtml(options.companyName);
  const membership = options.audience === 'team'
    ? `You have been invited to join ${company} as a team member on the Techantum Partner Portal.`
    : `You have been invited to join ${company} on the Techantum Partner Portal.`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Welcome to Techantum Partner Portal</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#334155;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#ffffff;">
          <tr>
            <td style="padding:28px 32px 8px;background:#ffffff;">${logoImage(brand, 36)}</td>
          </tr>
          <tr>
            <td style="padding:12px 32px 0;background:#ffffff;">
              <h1 style="margin:0;font-size:24px;line-height:1.3;font-weight:700;color:#0f2744;">Welcome to Techantum Partner Portal</h1>
              <p style="margin:8px 0 0;font-size:16px;line-height:1.5;color:#0f2744;">You've been invited to join ${company}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 0;background:#ffffff;font-size:15px;line-height:1.7;color:#334155;">
              <p style="margin:0 0 16px;">Dear ${escapeHtml(options.contactName)},</p>
              <p style="margin:0 0 16px;">${membership}</p>
              <p style="margin:0;">To activate your account and access your team's workspace, please set your password using the invitation link below.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 0;background:#ffffff;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td bgcolor="${INVITE_ORANGE}" style="border-radius:8px;">
                    <a href="${escapeHtml(options.onboardUrl)}" style="display:inline-block;padding:12px 22px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;line-height:20px;color:#ffffff;text-decoration:none;">Set Password &amp; Join Team</a>
                  </td>
                </tr>
              </table>
              <p style="margin:12px 0 0;font-size:13px;line-height:1.5;color:#94a3b8;">This secure invitation link expires in 7 days.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 0;background:#ffffff;font-size:15px;line-height:1.7;color:#334155;">
              <p style="margin:0 0 16px;">If you weren't expecting this invitation, you can safely ignore this email.</p>
              <p style="margin:0;">Best regards,<br>${escapeHtml(brand.companyName)} Team</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 28px;background:#ffffff;">
              <div style="border-top:1px solid #e5e7eb;padding-top:16px;font-size:12px;line-height:1.6;color:#94a3b8;">
                This is an automated invitation sent by ${escapeHtml(brand.companyName)}.<br>
                <a href="${escapeHtml(brand.siteUrl)}" style="color:#64748b;text-decoration:none;">${escapeHtml(brand.websiteLabel)}</a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export const DEFAULT_PARTNER_BUTTON = '#334155';

export function parseBrandColor(value: unknown): { ok: true; color: string | null } | { ok: false } {
  if (value == null || String(value).trim() === '') return { ok: true, color: null };
  const match = String(value).trim().match(/^#?([0-9a-fA-F]{6})$/);
  if (!match) return { ok: false };
  return { ok: true, color: `#${match[1].toUpperCase()}` };
}

export function safeEmailColor(value: string | null | undefined): string {
  const parsed = parseBrandColor(value);
  return parsed.ok && parsed.color ? parsed.color : DEFAULT_PARTNER_BUTTON;
}

export function accessibleButtonText(background: string): '#ffffff' | '#111827' {
  const hex = safeEmailColor(background).slice(1);
  const channel = (pair: string) => {
    const value = parseInt(pair, 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(hex.slice(0, 2)) + 0.7152 * channel(hex.slice(2, 4)) + 0.0722 * channel(hex.slice(4, 6));
  return luminance > 0.45 ? '#111827' : '#ffffff';
}

export function safeLogoUrl(value: string | null | undefined, siteUrl: string): string | null {
  const raw = (value || '').trim();
  if (!raw) return null;
  const origin = siteUrl.replace(/\/$/, '');
  if (raw.startsWith('/') && !raw.startsWith('//')) return `${origin}${raw}`;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function renderPartnerTeamInvitationEmail(options: {
  partnerName: string;
  inviteeName?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  invitationUrl: string;
  expiryDays?: number;
  siteUrl?: string;
}): { html: string; text: string } {
  const partnerName = options.partnerName.trim() || 'your team';
  const partner = escapeHtml(partnerName);
  const invitee = (options.inviteeName || '').trim();
  const greeting = invitee ? `Dear ${escapeHtml(invitee)},` : 'Hello,';
  const days = Math.max(1, Math.round(options.expiryDays || 7));
  const dayLabel = days === 1 ? '1 day' : `${days} days`;
  const color = safeEmailColor(options.primaryColor);
  const textColor = accessibleButtonText(color);
  const logo = safeLogoUrl(options.logoUrl, options.siteUrl || '');
  const header = logo
    ? `<img src="${escapeHtml(logo)}" alt="${partner}" width="160" style="display:block;width:auto;max-width:160px;height:auto;border:0;outline:none;text-decoration:none;">`
    : `<p style="margin:0;font-size:20px;line-height:1.3;font-weight:700;color:#111827;">${partner}</p>`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>You're Invited to Join ${partner}</title>
</head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;">
    <tr>
      <td align="center" style="padding:28px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#ffffff;">
          <tr>
            <td style="padding:8px 8px 0;">${header}</td>
          </tr>
          <tr>
            <td style="padding:28px 8px 0;">
              <h1 style="margin:0;font-size:24px;line-height:1.3;font-weight:700;color:#111827;">You're Invited to Join ${partner}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 8px 0;font-size:15px;line-height:1.6;color:#1f2937;">
              <p style="margin:0 0 16px;">${greeting}</p>
              <p style="margin:0 0 16px;">You have been invited to join <strong>${partner}</strong> as a team member.</p>
              <p style="margin:0;">To get started, please activate your account by setting your password.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 8px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td bgcolor="${color}" style="border-radius:6px;">
                    <a href="${escapeHtml(options.invitationUrl)}" style="display:inline-block;padding:12px 22px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;line-height:20px;color:${textColor};text-decoration:none;">Set Password &amp; Join Team</a>
                  </td>
                </tr>
              </table>
              <p style="margin:12px 0 0;font-size:13px;line-height:1.5;color:#6b7280;">This invitation link is valid for ${dayLabel}.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 8px 0;font-size:15px;line-height:1.6;color:#1f2937;">
              <p style="margin:0 0 16px;">If you were not expecting this invitation, you can safely ignore this email.</p>
              <p style="margin:0;">Best regards,<br><strong>${partner} Team</strong></p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 8px 8px;">
              <div style="border-top:1px solid #e5e7eb;padding-top:14px;font-size:12px;line-height:1.5;color:#6b7280;">
                ${partner}<br>
                This is an automated email. Please do not reply.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    `You're Invited to Join ${partnerName}`,
    '',
    invitee ? `Dear ${invitee},` : 'Hello,',
    '',
    `You have been invited to join ${partnerName} as a team member.`,
    '',
    'To get started, please activate your account by setting your password.',
    '',
    'Set Password & Join Team',
    options.invitationUrl,
    '',
    `This invitation link is valid for ${dayLabel}.`,
    '',
    'If you were not expecting this invitation, you can safely ignore this email.',
    '',
    'Best regards,',
    `${partnerName} Team`,
    '',
    partnerName,
    'This is an automated email. Please do not reply.',
  ].join('\n');

  return { html, text };
}

export function formatEmailDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}
