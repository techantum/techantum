/**
 * Template AI assistant architecture.
 * AI must never submit anything to Meta. Authorized users must confirm every action.
 */
export type TemplateAiAction =
  | 'generate'
  | 'improve'
  | 'suggest_variables'
  | 'suggest_category'
  | 'detect_missing_samples'
  | 'explain_rejection'
  | 'suggest_correction'
  | 'translate'
  | 'detect_duplicates';

export type TemplateAiRequest = {
  action: TemplateAiAction;
  requirement?: string;
  template?: Record<string, unknown>;
  rejectionReason?: string;
  targetLanguage?: string;
};

export function assertHumanConfirmation(confirmed: boolean) {
  if (!confirmed) {
    throw new Error('AI suggestions require an authorized user action before any Meta submission.');
  }
}

export async function runTemplateAssistant(_request: TemplateAiRequest) {
  return {
    enabled: false,
    message: 'AI assistance is prepared but not auto-wired. Suggestions will never be submitted to Meta automatically.',
    suggestions: [],
  };
}
