import type { ExtractedPage, FindingDraft } from './types';

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
  const emptyButtons = buttons.filter((match) => {
    const attrs = match[1] || '';
    const text = (match[2] || '').replace(/<[^>]+>/g, '').trim();
    const name = /aria-label\s*=/i.test(attrs) || /aria-labelledby\s*=/i.test(attrs) || /title\s*=/i.test(attrs);
    return !text && !name;
  });
  if (emptyButtons.length) {
    findings.push(finding({
      rule_code: 'a11y.empty_button',
      category: 'accessibility',
      severity: 'high',
      title: 'Empty buttons',
      description: `${emptyButtons.length} button(s) on ${url} have no accessible name.`,
      recommendation: 'Add visible text or aria-label to every button.',
      page_url: url,
      selector: 'button',
      evidence: { axe_rule: 'button-name', count: emptyButtons.length },
    }));
  }
  const unlabeled = page.forms.flatMap((form) => form.inputs.filter((input) => {
    if (['hidden', 'submit', 'button', 'reset'].includes(input.type)) return false;
    return !input.label.trim();
  }));
  if (unlabeled.length) {
    findings.push(finding({
      rule_code: 'a11y.missing_label',
      category: 'accessibility',
      severity: 'high',
      title: 'Form fields missing labels',
      description: `${unlabeled.length} input(s) on ${url} have no associated label.`,
      recommendation: 'Associate every input with a <label> or aria-label.',
      page_url: url,
      selector: 'input',
      evidence: { axe_rule: 'label', names: unlabeled.map((item) => item.name).slice(0, 8) },
    }));
  }
  const invalidAria = (html.match(/\baria-[a-z-]+=["'][^"']*["']/gi) || []).filter((item) =>
    /\baria-(invalidname|foo|unknown)\b/i.test(item)
  );
  if (/aria-invalidname=/i.test(html) || invalidAria.length) {
    findings.push(finding({
      rule_code: 'a11y.invalid_aria',
      category: 'accessibility',
      severity: 'medium',
      title: 'Invalid ARIA attribute',
      description: `${url} contains invalid ARIA attributes.`,
      recommendation: 'Use only supported ARIA attributes and values.',
      page_url: url,
      evidence: { axe_rule: 'aria-valid-attr' },
    }));
  }
  const vagueLinks = page.links.filter((link) => /^(click here|here|read more|more|learn more)$/i.test(link.text.trim()));
  if (vagueLinks.length) {
    findings.push(finding({
      rule_code: 'a11y.link_text',
      category: 'accessibility',
      severity: 'low',
      title: 'Non-descriptive link text',
      description: `${vagueLinks.length} link(s) use generic text such as “click here”.`,
      recommendation: 'Use link text that describes the destination.',
      page_url: url,
      evidence: { axe_rule: 'link-name', samples: vagueLinks.slice(0, 5).map((item) => item.href) },
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
