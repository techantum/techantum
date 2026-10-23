import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderBrandedEmail, type EmailBrand } from './template.ts';

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
});
