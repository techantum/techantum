import type { ExtractedForm, FindingDraft } from './types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isSafeToProbe(form: ExtractedForm): boolean {
  if (form.looksPayment || form.looksAuth || form.looksDestructive) return false;
  const types = form.inputs.map((item) => item.type);
  if (types.includes('file') || types.includes('password')) return false;
  return true;
}

export function validateField(type: string, value: string, required: boolean, pattern?: string, minLength?: number, maxLength?: number) {
  if (required && !value.trim()) return 'required';
  if (!value.trim()) return null;
  if (type === 'email' && !EMAIL_RE.test(value)) return 'email';
  if (type === 'tel' && value.replace(/\D/g, '').length < 8) return 'tel';
  if (pattern) {
    try {
      if (!new RegExp(pattern).test(value)) return 'pattern';
    } catch {
      return null;
    }
  }
  if (minLength && value.length < minLength) return 'minlength';
  if (maxLength && value.length > maxLength) return 'maxlength';
  return null;
}

export function formFindings(forms: ExtractedForm[], pageUrl: string, mode: 'disabled' | 'safe'): FindingDraft[] {
  if (mode === 'disabled' || !forms.length) return [];
  const findings: FindingDraft[] = [];
  forms.forEach((form, index) => {
    if (form.looksPayment) {
      findings.push({
        source: 'SYSTEM',
        rule_code: 'forms.payment_skipped',
        category: 'forms',
        severity: 'suggestion',
        title: 'Payment form skipped',
        description: `A payment-like form on ${pageUrl} was not submitted.`,
        recommendation: 'Test payments in a dedicated authorized environment.',
        page_url: pageUrl,
        evidence: { formIndex: index, action: form.action },
      });
      return;
    }
    const required = form.inputs.filter((item) => item.required);
    if (required.length) {
      const emptyFailures = required
        .map((item) => validateField(item.type, '', true, item.pattern, item.minLength, item.maxLength))
        .filter(Boolean);
      if (!emptyFailures.length) {
        findings.push({
          source: 'SYSTEM',
          rule_code: 'forms.required_not_declared',
          category: 'forms',
          severity: 'low',
          title: 'Required fields may lack HTML required',
          description: `Form ${index + 1} on ${pageUrl} could not prove required-field enforcement from markup.`,
          recommendation: 'Use the required attribute and server-side validation.',
          page_url: pageUrl,
        });
      }
    }
    const emails = form.inputs.filter((item) => item.type === 'email');
    for (const field of emails) {
      if (validateField('email', 'not-an-email', false) !== 'email') continue;
      findings.push({
        source: 'SYSTEM',
        rule_code: 'forms.email_type',
        category: 'forms',
        severity: 'suggestion',
        title: 'Email field uses HTML email validation',
        description: `Form ${index + 1} declares an email input. Safe tests will not submit live data.`,
        recommendation: 'Keep type="email" and show a visible error for invalid values.',
        page_url: pageUrl,
      });
    }
  });
  return findings;
}

export function neverSubmitReason(form: ExtractedForm): string | null {
  if (form.looksPayment) return 'payment';
  if (form.looksAuth) return 'auth';
  if (form.looksDestructive) return 'destructive';
  if (form.inputs.some((item) => item.type === 'file')) return 'file-upload';
  return null;
}
