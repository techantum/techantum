import { AIProviderError } from '../errors';
import type { ChatMessage, ProviderGenerateInput, ProviderGenerateResult } from '../types';

function splitMessages(messages: ChatMessage[]) {
  const system = messages
    .filter((m) => m.role === 'system')
    .map((m) => m.content)
    .join('\n\n');
  const rest = messages.filter((m) => m.role !== 'system');
  return { system, rest };
}

export async function generateWithOpenAI(input: ProviderGenerateInput): Promise<ProviderGenerateResult> {
  const { system, rest } = splitMessages(input.messages);
  const payload: Record<string, unknown> = {
    model: input.model,
    temperature: input.temperature ?? 0.3,
    max_tokens: input.maxTokens ?? 800,
    messages: [
      ...(system ? [{ role: 'system', content: system }] : []),
      ...rest,
    ],
  };
  if (input.json) payload.response_format = { type: 'json_object' };

  let res: Response;
  try {
    res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(input.timeoutMs ?? 20000),
    });
  } catch (error) {
    throw new AIProviderError({
      provider: 'openai',
      message: error instanceof Error ? error.message : 'OpenAI request failed',
      code: error instanceof Error ? error.name : 'network_error',
    });
  }

  const data = (await res.json().catch(() => ({}))) as {
    id?: string;
    model?: string;
    choices?: { message?: { content?: string } }[];
    error?: { message?: string; type?: string; code?: string };
  };

  if (!res.ok) {
    throw new AIProviderError({
      provider: 'openai',
      status: res.status,
      message: data.error?.message || `OpenAI error ${res.status}`,
      code: data.error?.code || String(res.status),
      type: data.error?.type,
    });
  }

  const text = data.choices?.[0]?.message?.content?.trim() || '';
  if (!text) {
    throw new AIProviderError({
      provider: 'openai',
      message: 'OpenAI returned an empty response',
      code: 'empty_response',
    });
  }

  return { text, id: data.id || null, model: data.model || input.model };
}
