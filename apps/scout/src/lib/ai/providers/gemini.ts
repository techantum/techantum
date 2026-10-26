import { AIProviderError } from '../errors';
import { parseModelJson } from '../json';
import { geminiModelRetryChain } from '../types';
import type { ChatMessage, ProviderGenerateInput, ProviderGenerateResult } from '../types';

type InteractionStep = {
  type?: string;
  content?: unknown;
};

type InteractionResponse = {
  id?: string;
  model?: string;
  status?: string;
  output_text?: string;
  steps?: InteractionStep[];
  outputs?: InteractionStep[];
  error?: { message?: string; status?: string; code?: number | string };
};

function toTurns(messages: ChatMessage[]) {
  const system = messages
    .filter((m) => m.role === 'system')
    .map((m) => m.content)
    .join('\n\n');
  const rest = messages.filter((m) => m.role !== 'system');
  return { system, rest };
}

function contentToText(content: unknown): string {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .map((block) => {
      if (typeof block === 'string') return block;
      if (block && typeof block === 'object' && 'text' in block) {
        return typeof (block as { text?: unknown }).text === 'string' ? (block as { text: string }).text : '';
      }
      return '';
    })
    .join('');
}

export function extractGeminiOutputText(data: InteractionResponse) {
  if (data.output_text?.trim()) return data.output_text.trim();

  const steps = [...(data.steps || []), ...(data.outputs || [])];
  const texts: string[] = [];
  for (const step of steps) {
    if (step.type && !['model_output', 'text', 'output_text'].includes(step.type)) continue;
    const text = contentToText(step.content);
    if (text) texts.push(text);
  }
  return texts.join('\n').trim();
}

export function isGeminiUnavailableModelError(status: number, message: string, code?: string) {
  const haystack = `${code || ''} ${message}`.toLowerCase();
  return /no longer available|please update your code to use models\//i.test(haystack) || (status === 404 && /not_found|not found/i.test(haystack));
}

export function isGeminiCapacityError(status: number, message: string, code?: string) {
  const haystack = `${code || ''} ${message}`.toLowerCase();
  return (
    isGeminiUnavailableModelError(status, message, code) ||
    status === 429 ||
    status === 503 ||
    /high demand|try again later|overloaded|spikes in demand|unavailable|capacity|incomplete|timeout|aborted|abort|timed out|timeouterror|etimedout|empty_response|too_many_requests|resource_exhausted|quota|max_tokens/i.test(
      haystack
    )
  );
}

/** 3.8/3.7 Flash reject `minimal`; `low` is the cheapest level all current Flash models accept. */
function thinkingLevelFor(model: string) {
  return model.includes('gemini-3') ? 'low' : null;
}

function asProviderError(error: unknown, fallbackMessage: string) {
  if (error instanceof AIProviderError) return error;
  const name = error instanceof Error ? error.name : 'network_error';
  const message = error instanceof Error ? error.message : fallbackMessage;
  const timedOut = /timeout|abort/i.test(`${name} ${message}`);
  return new AIProviderError({
    provider: 'gemini',
    message,
    code: timedOut ? 'etimedout' : name,
    status: timedOut ? 504 : 0,
  });
}

async function generateContent(
  input: ProviderGenerateInput,
  model: string,
  timeoutMs: number
): Promise<ProviderGenerateResult> {
  const { system, rest } = toTurns(input.messages);
  const contents = (rest.length ? rest : [{ role: 'user' as const, content: 'Respond.' }]).map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const thinkingLevel = thinkingLevelFor(model);
  const requested = input.maxTokens ?? 800;
  const generationConfig: Record<string, unknown> = {
    temperature: input.temperature ?? 0.3,
    // Thinking tokens share this budget. Leave extra room so JSON answers are not truncated.
    maxOutputTokens: thinkingLevel ? Math.max(requested + 4096, 6144) : requested,
  };
  if (thinkingLevel) generationConfig.thinkingConfig = { thinkingLevel };
  if (input.json) generationConfig.responseMimeType = 'application/json';

  const body: Record<string, unknown> = { contents, generationConfig };
  if (system) body.systemInstruction = { parts: [{ text: system }] };

  let res: Response;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': input.apiKey,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      }
    );
  } catch (error) {
    throw asProviderError(error, 'Gemini generateContent request failed');
  }

  const data = (await res.json().catch(() => ({}))) as {
    responseId?: string;
    candidates?: {
      finishReason?: string;
      content?: { parts?: { text?: string }[] };
    }[];
    error?: { message?: string; status?: string; code?: number };
  };

  if (!res.ok) {
    throw new AIProviderError({
      provider: 'gemini',
      status: res.status,
      message: data.error?.message || `Gemini error ${res.status}`,
      code: data.error?.status || String(data.error?.code || res.status),
      type: data.error?.status,
    });
  }

  const finishReason = data.candidates?.[0]?.finishReason || '';
  const text =
    data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || '')
      .join('')
      .trim() || '';
  if (!text) {
    throw new AIProviderError({
      provider: 'gemini',
      message: 'Gemini returned an empty response',
      code: 'empty_response',
    });
  }
  if (/MAX_TOKENS|max_tokens/i.test(finishReason) && input.json) {
    try {
      parseModelJson(text);
    } catch {
      throw new AIProviderError({
        provider: 'gemini',
        message: 'Gemini truncated JSON output (MAX_TOKENS)',
        code: 'max_tokens',
        status: 503,
      });
    }
  }

  return { text, id: data.responseId || null, model };
}

export async function generateWithGemini(input: ProviderGenerateInput): Promise<ProviderGenerateResult> {
  const budget = input.timeoutMs ?? 20000;
  const started = Date.now();
  const maxModels = budget < 12000 ? 2 : 3;
  const models = geminiModelRetryChain(input.model).slice(0, maxModels);
  // WhatsApp needs short slices. Recruitment JSON assessments need the remaining budget.
  const slice = input.json || budget >= 30000
    ? Math.max(14000, Math.min(budget - 1500, Math.floor((budget - 500) / Math.min(2, maxModels))))
    : Math.max(3500, Math.min(budget >= 18000 ? 7000 : 5500, Math.floor((budget - 500) / maxModels)));
  let lastError: unknown;

  for (let index = 0; index < models.length; index += 1) {
    const remaining = budget - (Date.now() - started);
    if (remaining < 2000) break;
    const model = models[index];
    const attemptTimeout = Math.min(slice, remaining);
    try {
      // generateContent only: Interactions hangs until Abort even with thinking_level=low.
      const result = await generateContent(input, model, attemptTimeout);
      if (index > 0) {
        console.warn('[ai gateway] Gemini recovered on', result.model);
      }
      return result;
    } catch (error) {
      lastError = error;
      const mapped = asProviderError(error, 'Gemini request failed');
      const capacity = isGeminiCapacityError(mapped.status, mapped.message, mapped.code);
      if (!capacity || index === models.length - 1) throw mapped;
      console.warn('[ai gateway] Gemini', model, 'busy, trying', models[index + 1]);
    }
  }

  throw asProviderError(lastError, 'Gemini request failed');
}
