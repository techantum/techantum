export type AIProviderId = 'openai' | 'gemini' | 'claude';

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type GenerateAIRequest = {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
  timeoutMs?: number;
  purpose?: string;
};

export type ProviderAttempt = {
  provider: AIProviderId;
  model: string;
  status: 'success' | 'failed' | 'skipped';
  reason?: string;
};

export type GenerateAIResult = {
  text: string;
  provider: AIProviderId;
  model: string;
  id: string | null;
  usedFallback: boolean;
  attempts: ProviderAttempt[];
};

export type ProviderCredentialPublic = {
  provider: AIProviderId;
  label: string;
  configured: boolean;
  source: 'admin' | 'env' | 'none';
  keyHint: string | null;
  model: string;
  enabled: boolean;
  defaultModel: string;
  comingSoon?: boolean;
};

export type GatewaySettingsPublic = {
  primaryProvider: AIProviderId;
  fallbackProvider: AIProviderId;
  secondFallbackProvider: AIProviderId | null;
  encryptionReady: boolean;
  providers: ProviderCredentialPublic[];
};

export type ProviderEventPublic = {
  id: string;
  createdAt: string;
  purpose: string | null;
  usedProvider: string | null;
  usedModel: string | null;
  status: string;
  reason: string | null;
  attempts: ProviderAttempt[];
};

export type ResolvedProvider = {
  id: AIProviderId;
  apiKey: string;
  model: string;
  source: 'admin' | 'env';
};

export type ProviderGenerateInput = {
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
  timeoutMs?: number;
};

export type ProviderGenerateResult = {
  text: string;
  id: string | null;
  model: string;
};

export const PROVIDER_LABELS: Record<AIProviderId, string> = {
  openai: 'OpenAI',
  gemini: 'Google Gemini',
  claude: 'Anthropic Claude',
};

export const DEFAULT_MODELS: Record<AIProviderId, string> = {
  openai: 'gpt-4o-mini',
  gemini: 'gemini-3.6-flash',
  claude: 'claude-3-5-haiku-latest',
};

export const GEMINI_CAPACITY_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.8-flash',
  'gemini-flash-latest',
] as const;

export function normalizeGeminiModel(model?: string | null) {
  const name = (model || '').trim().replace(/^models\//, '');
  if (!name || /^(gemini-1\.5|gemini-2\.0|gemini-2\.5)(-|$)/.test(name)) return DEFAULT_MODELS.gemini;
  return name;
}

export function geminiModelRetryChain(preferred?: string | null) {
  const start = normalizeGeminiModel(preferred);
  return [start, ...GEMINI_CAPACITY_MODELS.filter((model) => model !== start)];
}

export type ModelOption = {
  value: string;
  label: string;
  group: string;
};

export const MODEL_OPTIONS: Record<AIProviderId, ModelOption[]> = {
  openai: [
    { group: 'GPT-6', value: 'gpt-6-astra', label: 'gpt-6-astra (flagship)' },
    { group: 'GPT-5.6', value: 'gpt-5.6', label: 'gpt-5.6 (alias of Sol)' },
    { group: 'GPT-5.6', value: 'gpt-5.6-sol', label: 'gpt-5.6-sol' },
    { group: 'GPT-5.6', value: 'gpt-5.6-terra', label: 'gpt-5.6-terra (balanced)' },
    { group: 'GPT-5.6', value: 'gpt-5.6-luna', label: 'gpt-5.6-luna (high volume)' },
    { group: 'GPT-5.5', value: 'gpt-5.5', label: 'gpt-5.5' },
    { group: 'GPT-5.4', value: 'gpt-5.4', label: 'gpt-5.4' },
    { group: 'GPT-5.4', value: 'gpt-5.4-mini', label: 'gpt-5.4-mini' },
    { group: 'GPT-5.4', value: 'gpt-5.4-nano', label: 'gpt-5.4-nano' },
    { group: 'GPT-5.3', value: 'gpt-5.3-chat', label: 'gpt-5.3-chat' },
    { group: 'GPT-5.2', value: 'gpt-5.2', label: 'gpt-5.2' },
    { group: 'GPT-5.2', value: 'gpt-5.2-chat', label: 'gpt-5.2-chat' },
    { group: 'GPT-5.1', value: 'gpt-5.1', label: 'gpt-5.1' },
    { group: 'GPT-5.1', value: 'gpt-5.1-chat', label: 'gpt-5.1-chat' },
    { group: 'GPT-5', value: 'gpt-5', label: 'gpt-5' },
    { group: 'GPT-5', value: 'gpt-5-mini', label: 'gpt-5-mini' },
    { group: 'GPT-5', value: 'gpt-5-nano', label: 'gpt-5-nano' },
    { group: 'GPT-5', value: 'gpt-5-chat-latest', label: 'gpt-5-chat-latest' },
    { group: 'GPT-4.1', value: 'gpt-4.1', label: 'gpt-4.1' },
    { group: 'GPT-4.1', value: 'gpt-4.1-mini', label: 'gpt-4.1-mini' },
    { group: 'GPT-4.1', value: 'gpt-4.1-nano', label: 'gpt-4.1-nano' },
    { group: 'GPT-4o', value: 'gpt-4o-mini', label: 'gpt-4o-mini (recommended)' },
    { group: 'GPT-4o', value: 'gpt-4o', label: 'gpt-4o' },
    { group: 'Reasoning', value: 'o4-mini', label: 'o4-mini' },
    { group: 'Reasoning', value: 'o3', label: 'o3' },
    { group: 'Reasoning', value: 'o3-mini', label: 'o3-mini' },
  ],
  gemini: [
    { group: 'Gemini 3 Flash', value: 'gemini-3.8-flash', label: 'gemini-3.8-flash (most capable Flash)' },
    { group: 'Gemini 3 Flash', value: 'gemini-3.7-flash', label: 'gemini-3.7-flash' },
    { group: 'Gemini 3 Flash', value: 'gemini-3.6-flash', label: 'gemini-3.6-flash (recommended)' },
    { group: 'Gemini 3 Flash', value: 'gemini-3.5-flash', label: 'gemini-3.5-flash' },
    { group: 'Gemini 3 Flash', value: 'gemini-3.5-flash-lite', label: 'gemini-3.5-flash-lite' },
    { group: 'Gemini 3 Flash', value: 'gemini-3.1-flash-lite', label: 'gemini-3.1-flash-lite' },
    { group: 'Gemini 3 Flash', value: 'gemini-3-flash-preview', label: 'gemini-3-flash-preview' },
    { group: 'Gemini 3 Flash', value: 'gemini-flash-latest', label: 'gemini-flash-latest' },
    { group: 'Gemini 3 Pro', value: 'gemini-3.1-pro-preview', label: 'gemini-3.1-pro-preview' },
  ],
  claude: [
    { group: 'Current', value: 'claude-sonnet-5', label: 'claude-sonnet-5 (recommended)' },
    { group: 'Current', value: 'claude-haiku-4-5', label: 'claude-haiku-4-5 (fast)' },
    { group: 'Current', value: 'claude-haiku-4-5-20251001', label: 'claude-haiku-4-5-20251001' },
    { group: 'Current', value: 'claude-opus-5', label: 'claude-opus-5' },
    { group: 'Current', value: 'claude-fable-5-1', label: 'claude-fable-5-1' },
    { group: 'Claude 4', value: 'claude-sonnet-4-6', label: 'claude-sonnet-4-6' },
    { group: 'Claude 4', value: 'claude-sonnet-4-5', label: 'claude-sonnet-4-5' },
    { group: 'Claude 4', value: 'claude-sonnet-4-20250514', label: 'claude-sonnet-4' },
    { group: 'Claude 4', value: 'claude-opus-4-8', label: 'claude-opus-4-8' },
    { group: 'Claude 4', value: 'claude-opus-4-7', label: 'claude-opus-4-7' },
    { group: 'Claude 4', value: 'claude-opus-4-6', label: 'claude-opus-4-6' },
    { group: 'Claude 4', value: 'claude-opus-4-5', label: 'claude-opus-4-5' },
    { group: 'Claude 4', value: 'claude-fable-5', label: 'claude-fable-5' },
    { group: 'Legacy', value: 'claude-3-5-haiku-latest', label: 'claude-3-5-haiku-latest' },
    { group: 'Legacy', value: 'claude-3-5-sonnet-latest', label: 'claude-3-5-sonnet-latest' },
  ],
};

export function groupedModelOptions(provider: AIProviderId) {
  const groups: { name: string; options: ModelOption[] }[] = [];
  for (const option of MODEL_OPTIONS[provider]) {
    const last = groups[groups.length - 1];
    if (!last || last.name !== option.group) groups.push({ name: option.group, options: [option] });
    else last.options.push(option);
  }
  return groups;
}

export function catalogModelIds(provider: AIProviderId) {
  return MODEL_OPTIONS[provider].map((option) => option.value);
}
