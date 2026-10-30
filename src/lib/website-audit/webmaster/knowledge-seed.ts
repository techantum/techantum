export type SeedChunk = {
  category: string;
  rule_reference?: string;
  content: string;
  authority_level: number;
  source_name: string;
  version?: string;
  source_url?: string;
};

export const TECHANTUM_STANDARD_SECTIONS = [
  { key: 'layout', title: '1. Layout', body: 'Use a consistent max content width. Align sections to a shared grid. Avoid accidental full-bleed overflow. Keep card grids even.' },
  { key: 'typography', title: '2. Typography', body: 'Limit to 2–3 font families. H1/H2/H3 must form a clear scale. Body text 16px desktop / at least 14px mobile. Avoid one-off sizes unless a named component.' },
  { key: 'spacing', title: '3. Spacing', body: 'Use an 8px spacing scale. Section padding should be consistent. Do not mix arbitrary gaps in repeated components.' },
  { key: 'buttons', title: '4. Buttons', body: 'Primary buttons share height, radius, and type style. Secondary buttons are visually distinct. CTA labels describe the action.' },
  { key: 'forms', title: '5. Forms', body: 'Every input has a visible label. Required fields are declared. Error text is specific. Never submit payment or auth forms in audits.' },
  { key: 'navigation', title: '6. Navigation', body: 'Primary navigation is keyboard reachable and not clipped on mobile. Current page is identifiable. Logout/download links are not treated as content pages.' },
  { key: 'responsive', title: '7. Responsive Design', body: 'Test 1440×900 and 390×844. No horizontal overflow. Tap targets remain usable. Stacked mobile layout must preserve hierarchy.' },
  { key: 'images', title: '8. Images', body: 'Hero and service images must support the page message. Decorative icons may use empty alt. Do not stretch or crop faces poorly.' },
  { key: 'content', title: '9. Content', body: 'No lorem ipsum or placeholders. Headings describe the section. Spelling and grammar must be professional. CTAs are specific.' },
  { key: 'seo', title: '10. SEO', body: 'Unique title and meta description. One H1. Canonical present. robots/sitemap available. AI may judge relevance, not existence of tags.' },
  { key: 'accessibility', title: '11. Accessibility', body: 'Follow WCAG 2.2 automated checks first. Labels, names, contrast, and landmarks are required. Automation cannot certify WCAG compliance.' },
  { key: 'performance', title: '12. Performance', body: 'Use Core Web Vitals from Lighthouse/equivalent. AI interprets LCP/CLS/TBT, it does not invent scores.' },
  { key: 'errors', title: '13. Error Handling', body: 'No console exceptions on production pages. Failed requests and broken images are verified issues.' },
  { key: 'compat', title: '14. Browser Compatibility', body: 'Layouts must not depend on a single engine quirk. Avoid prefix-only CSS for core layout.' },
  { key: 'delivery', title: '15. Delivery Checklist', body: 'HTTPS, no mixed content, no debug banners, forms labeled, SEO basics present, mobile usable, evidence attached to tickets.' },
];

export const SEED_CHUNKS: SeedChunk[] = [
  { category: 'accessibility', authority_level: 1, source_name: 'WCAG 2.2', version: '2.2', source_url: 'https://www.w3.org/TR/WCAG22/', rule_reference: '1.1.1', content: 'Non-text content has a text alternative. Missing alt on informative images is a verified accessibility issue. Decorative images may use empty alt.' },
  { category: 'accessibility', authority_level: 1, source_name: 'WCAG 2.2', version: '2.2', source_url: 'https://www.w3.org/TR/WCAG22/', rule_reference: '1.3.1', content: 'Info and relationships: form controls need programmatically associated labels. Empty buttons fail Name, Role, Value.' },
  { category: 'accessibility', authority_level: 1, source_name: 'WCAG 2.2', version: '2.2', source_url: 'https://www.w3.org/TR/WCAG22/', rule_reference: '1.4.3', content: 'Contrast (Minimum): text contrast should meet 4.5:1 for normal text. Automated contrast is indicative, not a full WCAG certification.' },
  { category: 'seo', authority_level: 1, source_name: 'Google Search documentation', version: '2024', source_url: 'https://developers.google.com/search/docs', rule_reference: 'title-link', content: 'Each page needs a unique descriptive title. Missing or duplicate titles are technical SEO issues determined by the scanner, not by AI invention.' },
  { category: 'seo', authority_level: 1, source_name: 'Google Search documentation', version: '2024', source_url: 'https://developers.google.com/search/docs', rule_reference: 'meta-description', content: 'Meta descriptions should summarize the page. Existence is deterministic. Quality and intent match may be AI-reviewed.' },
  { category: 'performance', authority_level: 1, source_name: 'web.dev Core Web Vitals', version: '2024', source_url: 'https://web.dev/articles/vitals', rule_reference: 'LCP', content: 'Largest Contentful Paint should typically be under 2.5s. Interpret provided LCP/CLS/INP metrics; do not invent scores.' },
  { category: 'html', authority_level: 1, source_name: 'WHATWG HTML', version: 'Living Standard', source_url: 'https://html.spec.whatwg.org/', rule_reference: 'h1', content: 'Use heading elements to outline the document. Multiple H1s are allowed in HTML but Techantum delivery prefers one H1 per page for clarity.' },
  { category: 'responsive', authority_level: 2, source_name: 'Responsive design guidance', version: '1', content: 'Pages must not require horizontal scrolling at 390px width. Overflow is a verified layout issue when the scanner reports body width greater than viewport.' },
  { category: 'forms', authority_level: 1, source_name: 'WCAG 2.2', version: '2.2', rule_reference: '3.3.2', content: 'Labels or instructions are provided when content requires user input. Missing labels are verified issues.' },
  { category: 'ui', authority_level: 3, source_name: 'Techantum Web Quality Standard', version: '1.0', rule_reference: 'UI-TYPO-001', content: 'Primary heading consistency: H1/H2 styles should match across equivalent templates. Flag outliers only when most instances share one size/weight.' },
  { category: 'ux', authority_level: 3, source_name: 'Techantum Web Quality Standard', version: '1.0', rule_reference: 'UX-CTA-001', content: 'Primary CTA should be visually dominant relative to secondary actions. Weak hierarchy is an AI recommendation unless clipping/overflow is proven.' },
  { category: 'typography', authority_level: 3, source_name: 'Techantum Web Quality Standard', version: '1.0', rule_reference: 'UI-TYPO-001', content: 'If ~90% of a heading level uses one size/weight, a one-off size is an inconsistency unless it maps to a distinct component.' },
  { category: 'content', authority_level: 3, source_name: 'Techantum Web Quality Standard', version: '1.0', content: 'Placeholder copy, lorem ipsum, and unclear CTAs fail delivery. Spelling/grammar findings are AI recommendations unless placeholder text is detected deterministically.' },
  { category: 'images', authority_level: 3, source_name: 'Techantum Web Quality Standard', version: '1.0', content: 'Evaluate hero/service/product/CTA images only. Relevance is AI_RECOMMENDATION. Do not fail decorative icons with empty alt.' },
  { category: 'security', authority_level: 3, source_name: 'Techantum Web Quality Standard', version: '1.0', content: 'Pages and form actions should use HTTPS. Mixed content and password fields on HTTP are verified hygiene issues. No penetration testing.' },
  { category: 'techantum', authority_level: 3, source_name: 'Techantum Web Quality Standard', version: '1.0', content: TECHANTUM_STANDARD_SECTIONS.map((item) => `${item.title}: ${item.body}`).join('\n') },
];

export const SEED_RULES = [
  { rule_code: 'UI-TYPO-001', category: 'typography', rule_name: 'Primary heading consistency', description: 'Equivalent headings share size and weight.', authority_level: 3, severity_default: 'low', evaluation_type: 'AI_REVIEW', source_reference: 'Techantum Web Quality Standard §2' },
  { rule_code: 'UI-BTN-001', category: 'ui', rule_name: 'Primary button consistency', description: 'Primary buttons share height and style unless a distinct component.', authority_level: 3, severity_default: 'low', evaluation_type: 'AI_REVIEW', source_reference: 'Techantum Web Quality Standard §4' },
  { rule_code: 'A11Y-LABEL-001', category: 'accessibility', rule_name: 'Form labels', description: 'Inputs have accessible names.', authority_level: 1, severity_default: 'high', evaluation_type: 'DETERMINISTIC', source_reference: 'WCAG 2.2 1.3.1 / 3.3.2' },
  { rule_code: 'SEO-H1-001', category: 'seo', rule_name: 'Single descriptive H1', description: 'Page has one descriptive H1.', authority_level: 3, severity_default: 'medium', evaluation_type: 'DETERMINISTIC', source_reference: 'Techantum Web Quality Standard §10' },
  { rule_code: 'IMG-REL-001', category: 'images', rule_name: 'Hero image relevance', description: 'Hero/service images support page purpose.', authority_level: 4, severity_default: 'suggestion', evaluation_type: 'AI_REVIEW', source_reference: 'AI Recommendation' },
  { rule_code: 'A11Y-MANUAL-001', category: 'accessibility', rule_name: 'Keyboard path manual review', description: 'Complex widgets need manual keyboard testing.', authority_level: 1, severity_default: 'medium', evaluation_type: 'MANUAL_REVIEW', source_reference: 'WCAG 2.2 2.1.1' },
];
