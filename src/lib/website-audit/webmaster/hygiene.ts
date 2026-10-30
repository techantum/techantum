import type { ExtractedPage, FindingDraft } from '../types';

export function securityHygieneFindings(page: ExtractedPage): FindingDraft[] {
  const findings: FindingDraft[] = [];
  const url = page.normalizedUrl;
  if (url.startsWith('http://')) {
    findings.push({
      source: 'SYSTEM',
      rule_code: 'sec.http',
      category: 'ux',
      severity: 'high',
      title: 'Page is served over HTTP',
      description: `${url} is not HTTPS.`,
      recommendation: 'Redirect the site to HTTPS.',
      page_url: url,
    });
  }
  for (const form of page.forms) {
    const action = form.action || '';
    if (/^http:\/\//i.test(action) || (url.startsWith('https:') && action.startsWith('http://'))) {
      findings.push({
        source: 'SYSTEM',
        rule_code: 'sec.insecure_form_action',
        category: 'forms',
        severity: 'high',
        title: 'Form posts over HTTP',
        description: `A form on ${url} uses insecure action ${action}.`,
        recommendation: 'Submit forms only to HTTPS endpoints.',
        page_url: url,
      });
    }
  }
  if (/debug|trace enabled|phpinfo\(|stack trace/i.test(page.visibleText)) {
    findings.push({
      source: 'SYSTEM',
      rule_code: 'sec.debug_exposed',
      category: 'ux',
      severity: 'medium',
      title: 'Possible debug output exposed',
      description: `${url} appears to expose debug or stack-trace text.`,
      recommendation: 'Remove debug banners from production pages.',
      page_url: url,
    });
  }
  return findings;
}
