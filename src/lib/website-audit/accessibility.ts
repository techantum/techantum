import { cssSelector } from './html';
import type { EvidenceInstance, ExtractedPage, FindingDraft } from './types';

function finding(partial: Omit<FindingDraft, 'source'>): FindingDraft {
  return { source: 'ACCESSIBILITY', ...partial };
}

export function accessibilityFindings(page: ExtractedPage, html: string): FindingDraft[] {
  const findings: FindingDraft[] = [];
  const url = page.normalizedUrl;
  if (!page.lang) {
    findings.push(finding({
      rule_code: 'a11y.html_lang',
      category: 'accessibility',
      severity: 'medium',
      title: 'Missing html lang',
      description: `${url} does not set lang on the <html> element.`,
      recommendation: 'Set <html lang="en"> or the correct language code.',
      page_url: url,
      selector: 'html',
      evidence: { axe_rule: 'html-has-lang' },
    }));
  }
  const buttons = [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)];
  const emptyButtons = buttons.flatMap((match, index) => {
    const attrs = match[1] || '';
    const text = (match[2] || '').replace(/<[^>]+>/g, '').trim();
    const name = /aria-label\s*=/i.test(attrs) || /aria-labelledby\s*=/i.test(attrs) || /title\s*=/i.test(attrs);
    if (text || name) return [];
    const selector = cssSelector('button', attrs) === 'button' ? `button:nth-of-type(${index + 1})` : cssSelector('button', attrs);
    return [{
      selector,
      snippet: match[0].replace(/\s+/g, ' ').trim().slice(0, 240),
      page_url: url,
      why: 'No visible text, aria-label, aria-labelledby, or title',
    } satisfies EvidenceInstance];
  });
  if (emptyButtons.length) {
    findings.push(finding({
      rule_code: 'a11y.empty_button',
      category: 'accessibility',
      severity: 'high',
      title: 'Empty buttons',
      description: `Empty <button> at ${emptyButtons[0].selector} on ${url}${emptyButtons.length > 1 ? ` (+${emptyButtons.length - 1} more)` : ''}.`,
      recommendation: `Add visible text or aria-label on ${emptyButtons.map((item) => item.selector).join(', ')}.`,
      page_url: url,
      selector: emptyButtons[0].selector,
      evidence: { axe_rule: 'button-name', wcag: '4.1.2 Name, Role, Value', count: emptyButtons.length, instances: emptyButtons.slice(0, 20) },
    }));
  }
  const unlabeled = page.forms.flatMap((form) => form.inputs.flatMap((input) => {
    if (['hidden', 'submit', 'button', 'reset', 'image'].includes(input.type)) return [];
    if (input.accessibleName.trim()) return [];
    const why = input.placeholder
      ? `Placeholder "${input.placeholder}" is not a label`
      : 'No <label for>, wrapping <label>, aria-label, or aria-labelledby';
    return [{
      selector: input.selector,
      snippet: input.snippet,
      page_url: url,
      form: form.action || form.selector,
      name: input.name,
      id: input.id,
      type: input.type,
      why,
    } satisfies EvidenceInstance];
  }));
  if (unlabeled.length) {
    const first = unlabeled[0];
    const field = first.name || first.id || first.selector;
    findings.push(finding({
      rule_code: 'a11y.missing_label',
      category: 'accessibility',
      severity: 'high',
      title: first.name ? `Unlabeled ${first.type || 'input'} “${first.name}”` : 'Form fields missing labels',
      description: `${first.type || 'input'} ${field} on ${url} has no associated <label> (${first.why}).${unlabeled.length > 1 ? ` ${unlabeled.length - 1} more unlabeled field(s) on this page.` : ''}`,
      recommendation: first.id
        ? `Add <label for="${first.id}">…</label> next to ${first.selector}.`
        : `Give ${first.selector} an id and a matching <label for>, or an aria-label.`,
      page_url: url,
      selector: first.selector,
      evidence: {
        axe_rule: 'label',
        wcag: '1.3.1 Info and Relationships / 3.3.2 Labels or Instructions',
        count: unlabeled.length,
        names: unlabeled.map((item) => item.name).filter(Boolean).slice(0, 12),
        instances: unlabeled.slice(0, 20),
      },
    }));
  }
  const invalidAria = [...html.matchAll(/<([a-z0-9]+)([^>]*\baria-[a-z-]+\s*=\s*["'][^"']*["'][^>]*)>/gi)]
    .map((match) => {
      const attrs = match[2] || '';
      const bad = attrs.match(/\baria-(invalidname|foo|unknown)\s*=\s*["'][^"']*["']/i);
      if (!bad) return null;
      return {
        selector: cssSelector(match[1] || 'div', attrs),
        snippet: match[0].replace(/\s+/g, ' ').trim().slice(0, 240),
        page_url: url,
        why: `Invalid attribute ${bad[0]}`,
      } satisfies EvidenceInstance;
    })
    .filter(Boolean) as EvidenceInstance[];
  if (invalidAria.length) {
    findings.push(finding({
      rule_code: 'a11y.invalid_aria',
      category: 'accessibility',
      severity: 'medium',
      title: 'Invalid ARIA attribute',
      description: `${invalidAria[0].why} on ${invalidAria[0].selector} (${url}).`,
      recommendation: `Remove or replace ${invalidAria.map((item) => item.why).join('; ')}.`,
      page_url: url,
      selector: invalidAria[0].selector,
      evidence: { axe_rule: 'aria-valid-attr', wcag: '4.1.2', instances: invalidAria.slice(0, 20) },
    }));
  }
  const vagueLinks = page.links
    .filter((link) => /^(click here|here|read more|more|learn more)$/i.test(link.text.trim()))
    .map((link) => ({
      selector: `a[href="${link.href}"]`,
      href: link.href,
      text: link.text,
      page_url: url,
      snippet: `<a href="${link.href}">${link.text}</a>`,
      why: `Link text “${link.text}” does not describe the destination`,
    } satisfies EvidenceInstance));
  if (vagueLinks.length) {
    findings.push(finding({
      rule_code: 'a11y.link_text',
      category: 'accessibility',
      severity: 'low',
      title: 'Non-descriptive link text',
      description: `Link “${vagueLinks[0].text}” points to ${vagueLinks[0].href} on ${url}.${vagueLinks.length > 1 ? ` ${vagueLinks.length - 1} more.` : ''}`,
      recommendation: `Rewrite the link text for ${vagueLinks[0].href} so it describes the destination.`,
      page_url: url,
      selector: vagueLinks[0].selector,
      evidence: { axe_rule: 'link-name', wcag: '2.4.4 Link Purpose', count: vagueLinks.length, samples: vagueLinks.slice(0, 8).map((item) => item.href), instances: vagueLinks.slice(0, 20) },
    }));
  }
  if (!/<header\b|<nav\b|<main\b|<footer\b|role=["']main["']/i.test(html)) {
    findings.push(finding({
      rule_code: 'a11y.landmarks',
      category: 'accessibility',
      severity: 'low',
      title: 'Missing landmark regions',
      description: `${url} does not expose main/nav landmarks.`,
      recommendation: 'Use semantic landmarks such as header, nav, main, and footer.',
      page_url: url,
      evidence: { axe_rule: 'region' },
    }));
  }
  return findings;
}

export function summarizeAccessibility(findings: FindingDraft[]) {
  const count = findings.filter((item) => item.category === 'accessibility').length;
  return { violationCount: count, engine: 'html-axe-adapter' };
}
