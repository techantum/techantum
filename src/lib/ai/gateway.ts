import { buildProviderChain, getGatewayConfig } from './config';
import { AIProviderError, describeError, isFallbackEligible } from './errors';
import { extractJsonText } from './json';
import { logProviderEvent } from './log';
import { generateWithClaude } from './providers/claude';
import { generateWithGemini } from './providers/gemini';
import { generateWithOpenAI } from './providers/openai';
import type {
  AIProviderId,
  GenerateAIRequest,
  GenerateAIResult,
  ProviderAttempt,
  ProviderGenerateInput,
  ProviderGenerateResult,
} from './types';

const adapters: Record<AIProviderId, (input: ProviderGenerateInput) => Promise<ProviderGenerateResult>> = {
  openai: generateWithOpenAI,
  gemini: generateWithGemini,
  claude: generateWithClaude,
};

export async function generateAIChat(request: GenerateAIRequest): Promise<GenerateAIResult> {
  const config = await getGatewayConfig();
  const chain = buildProviderChain(config);
  if (!chain.length) {
    throw new Error('No AI provider is configured. Add an API key in Admin → AI Gateway.');
  }

  const attempts: ProviderAttempt[] = [];
  let lastError: unknown;

  for (let index = 0; index < chain.length; index += 1) {
    const provider = chain[index];
    const isLast = index === chain.length - 1;
    try {
      const result = await adapters[provider.id]({
        apiKey: provider.apiKey,
        model: provider.model,
        messages: request.messages,
        temperature: request.temperature,
        maxTokens: request.maxTokens,
        json: request.json,
        timeoutMs: request.timeoutMs,
      });
      attempts.push({ provider: provider.id, model: provider.model, status: 'success' });
      const usedFallback = index > 0;
      await logProviderEvent({
        purpose: request.purpose,
        primaryProvider: config.primaryProvider,
        fallbackProvider: config.fallbackProvider,
        usedProvider: provider.id,
        usedModel: result.model,
        status: usedFallback ? 'fallback_success' : 'success',
        reason: usedFallback ? attempts.find((item) => item.status === 'failed')?.reason || 'Primary provider failed' : null,
        attempts,
      });
      return {
        text: request.json ? extractJsonText(result.text) : result.text,
        provider: provider.id,
        model: result.model,
        id: result.id,
        usedFallback,
        attempts,
      };
    } catch (error) {
      lastError = error;
      const reason = describeError(error);
      attempts.push({ provider: provider.id, model: provider.model, status: 'failed', reason });
      console.warn('[ai gateway]', provider.id, 'failed', reason);
      if (!isLast && isFallbackEligible(error)) continue;
      break;
    }
  }

  const allFailed = attempts.every((item) => item.status !== 'success');
  await logProviderEvent({
    purpose: request.purpose,
    primaryProvider: config.primaryProvider,
    fallbackProvider: config.fallbackProvider,
    usedProvider: null,
    usedModel: null,
    status: allFailed ? 'all_failed' : 'failed',
    reason: describeError(lastError),
    attempts,
  });

  if (lastError instanceof AIProviderError) throw lastError;
  throw lastError instanceof Error ? lastError : new Error(describeError(lastError));
}

export async function generateAIResponse(
  prompt: string,
  options?: Omit<GenerateAIRequest, 'messages'> & { system?: string }
): Promise<GenerateAIResult> {
  const messages = [
    ...(options?.system ? [{ role: 'system' as const, content: options.system }] : []),
    { role: 'user' as const, content: prompt },
  ];
  return generateAIChat({ ...options, messages });
}
