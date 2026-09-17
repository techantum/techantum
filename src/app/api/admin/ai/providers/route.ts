import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { encryptSecret, isEncryptionReady, looksLikeMaskedSecret, secretHint } from '@/lib/ai/crypto';
import { getGatewayConfig, invalidateGatewayConfig } from '@/lib/ai/config';
import { listProviderEvents } from '@/lib/ai/log';
import { catalogModelIds, DEFAULT_MODELS, normalizeGeminiModel, type AIProviderId } from '@/lib/ai/types';

const PROVIDERS: AIProviderId[] = ['openai', 'gemini', 'claude'];

function isProviderId(value: unknown): value is AIProviderId {
  return value === 'openai' || value === 'gemini' || value === 'claude';
}

export async function GET() {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;

  try {
    const [config, events] = await Promise.all([getGatewayConfig(true), listProviderEvents(25)]);
    return NextResponse.json({
      settings: config.public,
      events,
      models: {
        openai: catalogModelIds('openai'),
        gemini: catalogModelIds('gemini'),
        claude: catalogModelIds('claude'),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to load AI providers' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;

  const body = (await request.json()) as {
    primaryProvider?: unknown;
    fallbackProvider?: unknown;
    secondFallbackProvider?: unknown;
    providers?: Partial<
      Record<
        AIProviderId,
        {
          apiKey?: string;
          model?: string;
          enabled?: boolean;
          clearKey?: boolean;
        }
      >
    >;
  };

  if (!isEncryptionReady()) {
    return NextResponse.json(
      { error: 'Server encryption key is missing. Set AI_SECRETS_ENCRYPTION_KEY and restart the app.' },
      { status: 500 }
    );
  }

  const primaryProvider = isProviderId(body.primaryProvider) ? body.primaryProvider : 'openai';
  const fallbackProvider = isProviderId(body.fallbackProvider) ? body.fallbackProvider : 'gemini';
  const secondFallbackProvider = isProviderId(body.secondFallbackProvider) ? body.secondFallbackProvider : null;

  if (primaryProvider === fallbackProvider) {
    return NextResponse.json({ error: 'Primary and fallback providers must be different.' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error: settingsError } = await supabase.from('ai_gateway_settings').upsert({
    id: 1,
    primary_provider: primaryProvider,
    fallback_provider: fallbackProvider,
    second_fallback_provider: secondFallbackProvider,
    updated_by: auth.user.id,
  });
  if (settingsError) return NextResponse.json({ error: settingsError.message }, { status: 500 });

  for (const provider of PROVIDERS) {
    const update = body.providers?.[provider];
    if (!update) continue;

    const row: Record<string, unknown> = {
      provider,
      model:
        provider === 'gemini'
          ? normalizeGeminiModel((update.model || '').trim() || DEFAULT_MODELS.gemini)
          : (update.model || '').trim() || DEFAULT_MODELS[provider],
      enabled: update.enabled !== false,
      updated_by: auth.user.id,
    };

    const incomingKey = typeof update.apiKey === 'string' ? update.apiKey.trim() : '';
    if (update.clearKey) {
      row.encrypted_api_key = null;
      row.key_hint = null;
    } else if (incomingKey && !looksLikeMaskedSecret(incomingKey)) {
      row.encrypted_api_key = encryptSecret(incomingKey);
      row.key_hint = secretHint(incomingKey);
    }

    const { error } = await supabase.from('ai_provider_credentials').upsert(row, { onConflict: 'provider' });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from('whatsapp_audit_log').insert({
    user_id: auth.user.id,
    action: 'ai_providers_updated',
    entity_type: 'ai_gateway_settings',
    entity_id: '1',
    metadata: {
      primaryProvider,
      fallbackProvider,
      secondFallbackProvider,
      updated: PROVIDERS.filter((provider) => Boolean(body.providers?.[provider])),
    },
  });

  invalidateGatewayConfig();
  const config = await getGatewayConfig(true);
  const events = await listProviderEvents(25);
  return NextResponse.json({ settings: config.public, events });
}
