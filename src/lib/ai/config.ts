import { createAdminClient } from '@/lib/supabase/admin';
import { decryptSecret, isEncryptionReady, secretHint } from './crypto';
import {
  DEFAULT_MODELS,
  PROVIDER_LABELS,
  normalizeGeminiModel,
  type AIProviderId,
  type GatewaySettingsPublic,
  type ProviderCredentialPublic,
  type ResolvedProvider,
} from './types';

type CredentialRow = {
  provider: AIProviderId;
  encrypted_api_key: string | null;
  key_hint: string | null;
  model: string | null;
  enabled: boolean | null;
};

type SettingsRow = {
  primary_provider: AIProviderId | null;
  fallback_provider: AIProviderId | null;
  second_fallback_provider: AIProviderId | null;
};

const PROVIDERS: AIProviderId[] = ['openai', 'gemini', 'claude'];
const CACHE_MS = 15_000;
let cache: { at: number; value: GatewayRuntimeConfig } | null = null;

export type GatewayRuntimeConfig = {
  primaryProvider: AIProviderId;
  fallbackProvider: AIProviderId;
  secondFallbackProvider: AIProviderId | null;
  encryptionReady: boolean;
  resolved: Partial<Record<AIProviderId, ResolvedProvider>>;
  public: GatewaySettingsPublic;
};

function envKey(provider: AIProviderId) {
  if (provider === 'openai') return process.env.OPENAI_API_KEY?.trim() || '';
  if (provider === 'gemini') {
    return process.env.GOOGLE_GEMINI_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim() || '';
  }
  return process.env.ANTHROPIC_API_KEY?.trim() || '';
}

function envModel(provider: AIProviderId) {
  if (provider === 'openai') return process.env.OPENAI_MODEL?.trim() || DEFAULT_MODELS.openai;
  if (provider === 'gemini') {
    return normalizeGeminiModel(
      process.env.GEMINI_MODEL?.trim() || process.env.GOOGLE_GEMINI_MODEL?.trim() || DEFAULT_MODELS.gemini
    );
  }
  return process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODELS.claude;
}

function isProviderId(value: unknown): value is AIProviderId {
  return value === 'openai' || value === 'gemini' || value === 'claude';
}

function decryptStoredKey(encrypted: string | null) {
  if (!encrypted) return '';
  try {
    return decryptSecret(encrypted).trim();
  } catch {
    return '';
  }
}

export function invalidateGatewayConfig() {
  cache = null;
}

export async function getGatewayConfig(force = false): Promise<GatewayRuntimeConfig> {
  if (!force && cache && Date.now() - cache.at < CACHE_MS) return cache.value;
  const value = await loadGatewayConfig();
  cache = { at: Date.now(), value };
  return value;
}

function isMissingTable(message?: string) {
  return Boolean(message && /does not exist|schema cache|could not find the table/i.test(message));
}

function envOnlyConfig(): GatewayRuntimeConfig {
  const resolved: Partial<Record<AIProviderId, ResolvedProvider>> = {};
  const providers: ProviderCredentialPublic[] = PROVIDERS.map((provider) => {
    const apiKey = envKey(provider);
    const model = envModel(provider);
    if (apiKey) resolved[provider] = { id: provider, apiKey, model, source: 'env' };
    return {
      provider,
      label: PROVIDER_LABELS[provider],
      configured: Boolean(apiKey),
      source: apiKey ? 'env' : 'none',
      keyHint: apiKey ? `${secretHint(apiKey)} (env)` : null,
      model,
      enabled: provider !== 'claude',
      defaultModel: DEFAULT_MODELS[provider],
      comingSoon: provider === 'claude' && !apiKey,
    };
  });
  return {
    primaryProvider: 'openai',
    fallbackProvider: 'gemini',
    secondFallbackProvider: null,
    encryptionReady: isEncryptionReady(),
    resolved,
    public: {
      primaryProvider: 'openai',
      fallbackProvider: 'gemini',
      secondFallbackProvider: null,
      encryptionReady: isEncryptionReady(),
      providers,
    },
  };
}

async function loadGatewayConfig(): Promise<GatewayRuntimeConfig> {
  const supabase = createAdminClient();
  const [{ data: settings, error: settingsError }, { data: credentials, error: credentialsError }] = await Promise.all([
    supabase.from('ai_gateway_settings').select('*').eq('id', 1).maybeSingle(),
    supabase.from('ai_provider_credentials').select('provider, encrypted_api_key, key_hint, model, enabled'),
  ]);

  if (settingsError || credentialsError) {
    const message = settingsError?.message || credentialsError?.message || '';
    if (!isMissingTable(message)) {
      console.warn('[ai gateway] using env credentials because settings could not be loaded', message);
    }
    return envOnlyConfig();
  }

  const settingsRow = (settings || {}) as SettingsRow;
  const primaryProvider = isProviderId(settingsRow.primary_provider) ? settingsRow.primary_provider : 'openai';
  const fallbackProvider = isProviderId(settingsRow.fallback_provider) ? settingsRow.fallback_provider : 'gemini';
  const secondFallbackProvider = isProviderId(settingsRow.second_fallback_provider)
    ? settingsRow.second_fallback_provider
    : null;

  const rows = new Map<AIProviderId, CredentialRow>();
  for (const row of (credentials || []) as CredentialRow[]) {
    if (isProviderId(row.provider)) rows.set(row.provider, row);
  }

  const resolved: Partial<Record<AIProviderId, ResolvedProvider>> = {};
  const providers: ProviderCredentialPublic[] = PROVIDERS.map((provider) => {
    const row = rows.get(provider);
    const storedKey = decryptStoredKey(row?.encrypted_api_key || null);
    const fallbackEnvKey = envKey(provider);
    const enabled = row?.enabled !== false;
    const model =
      provider === 'gemini'
        ? normalizeGeminiModel(row?.model?.trim() || envModel(provider))
        : row?.model?.trim() || envModel(provider);
    const apiKey = storedKey || fallbackEnvKey;
    const source: ProviderCredentialPublic['source'] = storedKey ? 'admin' : fallbackEnvKey ? 'env' : 'none';

    if (enabled && apiKey) {
      resolved[provider] = { id: provider, apiKey, model, source: storedKey ? 'admin' : 'env' };
    }

    return {
      provider,
      label: PROVIDER_LABELS[provider],
      configured: Boolean(apiKey),
      source,
      keyHint: storedKey ? row?.key_hint || secretHint(storedKey) : fallbackEnvKey ? `${secretHint(fallbackEnvKey)} (env)` : null,
      model,
      enabled,
      defaultModel: DEFAULT_MODELS[provider],
      comingSoon: provider === 'claude' && !apiKey,
    };
  });

  return {
    primaryProvider,
    fallbackProvider,
    secondFallbackProvider,
    encryptionReady: isEncryptionReady(),
    resolved,
    public: {
      primaryProvider,
      fallbackProvider,
      secondFallbackProvider,
      encryptionReady: isEncryptionReady(),
      providers,
    },
  };
}

export function buildProviderChain(config: GatewayRuntimeConfig): ResolvedProvider[] {
  const order = [config.primaryProvider, config.fallbackProvider, config.secondFallbackProvider].filter(
    (value, index, list): value is AIProviderId => Boolean(value) && list.indexOf(value) === index
  );
  return order.map((id) => config.resolved[id]).filter((item): item is ResolvedProvider => Boolean(item));
}
