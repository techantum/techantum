import { AIProviderError } from '../errors';
import type { ChatMessage, ProviderGenerateInput, ProviderGenerateResult } from '../types';

function splitMessages(messages: ChatMessage[]) {
  const system = messages
    .filter((m) => m.role === 'system')
    .map((m) => m.content)
    .join('\n\n');
  const rest = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }));
  return { system, rest };
}

export async function generateWithClaude(input: ProviderGenerateInput): Promise<ProviderGenerateResult> {
  const { system, rest } = splitMessages(input.messages);
  const payload: Record<string, unknown> = {
    model: input.model,
    max_tokens: input.maxTokens ?? 800,
    temperature: input.temperature ?? 0.3,
    messages: rest.length ? rest : [{ role: 'user', content: 'Respond.' }],
  };
  if (system) payload.system = system;

  let res: Response;
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': input.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(input.timeoutMs ?? 20000),
    });
  } catch (error) {
    throw new AIProviderError({
      provider: 'claude',
      message: error instanceof Error ? error.message : 'Claude request failed',
      code: error instanceof Error ? error.name : 'network_error',
    });
  }

  const data = (await res.json().catch(() => ({}))) as {
    id?: string;
    model?: string;
    content?: { type?: string; text?: string }[];
    error?: { type?: string; message?: string };
    type?: string;
  };

  if (!res.ok) {
    throw new AIProviderError({
      provider: 'claude',
      status: res.status,
      message: data.error?.message || `Claude error ${res.status}`,
      code: data.error?.type || data.type || String(res.status),
      type: data.error?.type,
    });
  }

  const text =
    data.content
      ?.filter((block) => block.type === 'text')
      .map((block) => block.text || '')
      .join('')
      .trim() || '';

  if (!text) {
    throw new AIProviderError({
      provider: 'claude',
      message: 'Claude returned an empty response',
      code: 'empty_response',
    });
  }

  return { text, id: data.id || null, model: data.model || input.model };
}
