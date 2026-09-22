const NAME_RE = /^[a-z0-9_]+$/;

export type TemplateDraft = {
  name: string;
  category?: string;
  language?: string;
  headerType?: string;
  headerContent?: string;
  body: string;
  footer?: string;
  buttons?: { type: string; text: string; url?: string; phone_number?: string }[];
  examples?: Record<string, string>;
};

export type TemplateValidationResult = {
  ok: boolean;
  errors: string[];
  variables: string[];
};

export function extractTemplateVariables(body: string, header = '') {
  const matches = `${header}\n${body}`.match(/\{\{(\d+)\}\}/g) || [];
  return [...new Set(matches.map((m) => m.replace(/[{}]/g, '')))].sort((a, b) => Number(a) - Number(b));
}

export function validateTemplateDraft(draft: TemplateDraft): TemplateValidationResult {
  const errors: string[] = [];
  if (!draft.name?.trim()) errors.push('Template name is required.');
  else if (!NAME_RE.test(draft.name)) errors.push('Template name must be lowercase letters, numbers and underscores only.');
  if (!draft.body?.trim()) errors.push('Body text is required.');
  if (draft.body && draft.body.length > 1024) errors.push('Body exceeds 1024 characters.');
  if (draft.footer && draft.footer.length > 60) errors.push('Footer exceeds 60 characters.');
  if (draft.headerType === 'TEXT' && draft.headerContent && draft.headerContent.length > 60) {
    errors.push('Header text exceeds 60 characters.');
  }

  const variables = extractTemplateVariables(draft.body, draft.headerType === 'TEXT' ? draft.headerContent || '' : '');
  for (let i = 0; i < variables.length; i += 1) {
    if (Number(variables[i]) !== i + 1) {
      errors.push('Variables must be sequential starting at {{1}}.');
      break;
    }
  }
  for (const variable of variables) {
    if (!draft.examples?.[variable]?.trim()) errors.push(`Sample value for {{${variable}}} is required.`);
  }

  const buttons = draft.buttons || [];
  if (buttons.length > 10) errors.push('A template can have at most 10 buttons.');
  const urlCount = buttons.filter((b) => b.type === 'URL').length;
  const phoneCount = buttons.filter((b) => b.type === 'PHONE_NUMBER').length;
  if (urlCount > 2) errors.push('At most two URL buttons are allowed.');
  if (phoneCount > 1) errors.push('At most one phone button is allowed.');
  if (buttons.some((b) => !b.text?.trim())) errors.push('Every button needs a label.');
  if (buttons.some((b) => b.type === 'URL' && !b.url)) errors.push('URL buttons need a destination URL.');
  if (buttons.some((b) => b.type === 'PHONE_NUMBER' && !b.phone_number)) errors.push('Phone buttons need a phone number.');

  return { ok: errors.length === 0, errors, variables };
}

export function mapMetaTemplateStatus(status?: string | null) {
  const value = (status || '').toUpperCase();
  const map: Record<string, string> = {
    APPROVED: 'META_APPROVED',
    PENDING: 'META_PENDING',
    REJECTED: 'META_REJECTED',
    FLAGGED: 'META_FLAGGED',
    DISABLED: 'META_DISABLED',
    DELETED: 'DELETED',
    REINSTATED: 'META_APPROVED',
    IN_APPEAL: 'META_PENDING',
    PENDING_DELETION: 'DELETED',
  };
  return map[value] || 'META_PENDING';
}

export function buildMetaTemplatePayload(draft: TemplateDraft) {
  const components: Record<string, unknown>[] = [];
  if (draft.headerType && draft.headerType !== 'NONE') {
    const header: Record<string, unknown> = { type: 'HEADER', format: draft.headerType };
    if (draft.headerType === 'TEXT') {
      header.text = draft.headerContent;
      if (draft.examples?.header) header.example = { header_text: [draft.examples.header] };
    }
    components.push(header);
  }
  const variables = extractTemplateVariables(draft.body);
  const body: Record<string, unknown> = { type: 'BODY', text: draft.body };
  if (variables.length) {
    body.example = { body_text: [variables.map((v) => draft.examples?.[v] || `sample_${v}`)] };
  }
  components.push(body);
  if (draft.footer) components.push({ type: 'FOOTER', text: draft.footer });
  if (draft.buttons?.length) {
    components.push({
      type: 'BUTTONS',
      buttons: draft.buttons.map((button) => {
        if (button.type === 'URL') return { type: 'URL', text: button.text, url: button.url };
        if (button.type === 'PHONE_NUMBER') return { type: 'PHONE_NUMBER', text: button.text, phone_number: button.phone_number };
        return { type: button.type, text: button.text };
      }),
    });
  }
  return {
    name: draft.name,
    language: draft.language || 'en',
    category: draft.category || 'UTILITY',
    components,
  };
}
