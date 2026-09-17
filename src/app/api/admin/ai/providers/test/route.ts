import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { getGatewayConfig } from '@/lib/ai/config';
import { generateWithClaude } from '@/lib/ai/providers/claude';
import { generateWithGemini } from '@/lib/ai/providers/gemini';
import { generateWithOpenAI } from '@/lib/ai/providers/openai';
import { DEFAULT_MODELS, type AIProviderId } from '@/lib/ai/types';
import { describeError } from '@/lib/ai/errors';

const adapters = {
  openai: generateWithOpenAI,
  gemini: generateWithGemini,
  claude: generateWithClaude,
};

function isProviderId(value: unknown): value is AIProviderId {
  return value === 'openai' || value === 'gemini' || value === 'claude';
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;

  const body = (await request.json()) as { provider?: unknown; apiKey?: unknown; model?: unknown };
  if (!isProviderId(body.provider)) {
    return NextResponse.json({ error: 'Unknown provider.' }, { status: 400 });
  }

  const config = await getGatewayConfig(true);
  const stored = config.resolved[body.provider];
  const apiKey = typeof body.apiKey === 'string' && body.apiKey.trim() ? body.apiKey.trim() : stored?.apiKey || '';
  const model =
    typeof body.model === 'string' && body.model.trim()
      ? body.model.trim()
      : stored?.model || DEFAULT_MODELS[body.provider];

  if (!apiKey) {
    return NextResponse.json({ ok: false, error: `No ${body.provider} API key is configured.` }, { status: 400 });
  }

  try {
    const result = await adapters[body.provider]({
      apiKey,
      model,
      timeoutMs: 25000,
      maxTokens: 256,
      temperature: 0,
      messages: [
        { role: 'system', content: 'Reply with the single word OK.' },
        { role: 'user', content: 'Ping' },
      ],
    });
    return NextResponse.json({
      ok: true,
      provider: body.provider,
      model: result.model,
      preview: result.text.slice(0, 80),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, provider: body.provider, error: describeError(error) },
      { status: 400 }
    );
  }
}
