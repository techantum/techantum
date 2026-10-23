import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { accessibleButtonText, renderBrandedEmail, renderPartnerInvitationEmail, renderPartnerTeamInvitationEmail, safeEmailColor, safeLogoUrl, type EmailBrand } from './template.ts';

const brand: EmailBrand = {
  companyName: 'Techantum Solutions',
  tagline: 'Websites, Web App & Mobile Development',
  logoUrl: 'https://techantum.com/uploads/cms/image-1785916185887.png',
  siteUrl: 'https://techantum.com',
  websiteLabel: 'techantum.com',
  email: 'info@techantum.com',
  linkedinUrl: 'https://www.linkedin.com/company/techantum',
  youtubeUrl: '',
};

describe('branded email template', () => {
  it('uses the company logo in the header and footer', () => {
    const html = renderBrandedEmail(brand, {
      kicker: 'PARTNER PORTAL',
      title: 'New requirement submitted',
      subtitle: 'A new requirement has been submitted.',
      facts: [
        { label: 'Reference No.', value: 'REQ-2026-01002' },
        { label: 'Service', value: 'Website Development' },
        { label: 'Submitted On', value: 'Oct 10, 2026, 3:04 PM' },
      ],
      bodyHtml: '<p>Hello Team,</p>',
      action: { href: 'https://techantum.com/admin/partner-requirements/1', label: 'View Requirement' },
    });

    assert.equal(html.split(brand.logoUrl).length, 3);
    assert.match(html, /New requirement submitted/);
    assert.match(html, /REQ-2026-01002/);
    assert.match(html, /View Requirement/);
    assert.match(html, /https:\/\/techantum.com\/admin\/partner-requirements\/1/);
    assert.doesNotMatch(html, /youtube\.com/);
  });

  it('renders a minimal partner invitation with one password link', () => {
    const onboardUrl = 'https://techantum.com/partner/onboard?token=abc123';
    const html = renderPartnerInvitationEmail(brand, {
      contactName: 'Sudheer',
      companyName: 'SJML – Branding & Advertising',
      onboardUrl,
      audience: 'team',
    });

    assert.match(html, /Welcome to Techantum Partner Portal/);
    assert.match(html, /You've been invited to join SJML/);
    assert.match(html, /Dear Sudheer/);
    assert.match(html, /as a team member/);
    assert.match(html, /Set Password &amp; Join Team/);
    assert.match(html, /expires in 7 days/);
    assert.match(html, /max-width:600px/);
    assert.match(html, /#F44324/);
    assert.equal(html.split(onboardUrl).length, 2);
    assert.doesNotMatch(html, /linkedin/i);
    assert.doesNotMatch(html, /PARTNER PORTAL/);
  });
});

function visibleText(html: string) {
  return html
    .replace(/href="[^"]*"/gi, '')
    .replace(/src="[^"]*"/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');
}

describe('partner team invitation', () => {
  const url = 'https://example.com/partner/onboard?token=secret';

  it('uses each partner logo, name, and brand color', () => {
    const partnerA = renderPartnerTeamInvitationEmail({
      partnerName: 'Northwind Studio',
      inviteeName: 'Ada',
      logoUrl: 'https://cdn.example.com/northwind.png',
      primaryColor: '#0B3D91',
      invitationUrl: url,
      expiryDays: 7,
      siteUrl: 'https://example.com',
    });
    const partnerB = renderPartnerTeamInvitationEmail({
      partnerName: 'Harbor & Co',
      inviteeName: 'Grace',
      logoUrl: 'https://cdn.example.com/harbor.png',
      primaryColor: '#FDE047',
      invitationUrl: url,
      expiryDays: 7,
      siteUrl: 'https://example.com',
    });

    assert.match(partnerA.html, /https:\/\/cdn\.example\.com\/northwind\.png/);
    assert.match(partnerA.html, /Northwind Studio/);
    assert.match(partnerA.html, /#0B3D91/);
    assert.match(partnerA.html, /Dear Ada/);
    assert.equal(partnerA.html.split(url).length, 2);
    assert.equal(partnerA.text.includes(url), true);

    assert.match(partnerB.html, /https:\/\/cdn\.example\.com\/harbor\.png/);
    assert.match(partnerB.html, /Harbor &amp; Co/);
    assert.match(partnerB.html, /#FDE047/);
    assert.match(partnerB.html, /color:#111827;text-decoration:none/);
    assert.match(partnerA.html, /color:#ffffff;text-decoration:none/);
    assert.doesNotMatch(partnerA.html, /Harbor/);
    assert.doesNotMatch(partnerB.html, /Northwind/);
  });

  it('falls back when logo, color, or name is missing and escapes values', () => {
    const message = renderPartnerTeamInvitationEmail({
      partnerName: '<script>alert(1)</script>',
      inviteeName: '',
      logoUrl: 'javascript:alert(1)',
      primaryColor: 'red',
      invitationUrl: url,
      siteUrl: 'https://example.com',
    });

    assert.doesNotMatch(message.html, /<img/);
    assert.doesNotMatch(message.html, /<script>/);
    assert.match(message.html, /&lt;script&gt;/);
    assert.match(message.html, /Hello,/);
    assert.match(message.html, /#334155/);
    assert.match(message.html, /valid for 7 days/);
    assert.match(message.html, /max-width:600px/);
    assert.match(message.html, /Set Password &amp; Join Team/);
    assert.doesNotMatch(visibleText(message.html), /techantum/i);
    assert.doesNotMatch(visibleText(message.html), /linkedin|youtube/i);
    assert.equal(safeEmailColor(null), '#334155');
    assert.equal(safeLogoUrl('javascript:alert(1)', 'https://example.com'), null);
    assert.equal(accessibleButtonText('#FDE047'), '#111827');
    assert.equal(accessibleButtonText('#0B3D91'), '#ffffff');
  });
});
