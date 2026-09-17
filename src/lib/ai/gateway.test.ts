import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { decryptSecret, encryptSecret, looksLikeMaskedSecret, secretHint } from './crypto.ts';
import { AIProviderError, isFallbackEligible } from './errors.ts';
import { geminiModelRetryChain, MODEL_OPTIONS, normalizeGeminiModel } from './types.ts';
import { extractJsonText, parseModelJson } from './json.ts';

process.env.AI_SECRETS_ENCRYPTION_KEY = 'a'.repeat(64);

describe('AI secret encryption', () => {
  it('round-trips a provider key and never stores plaintext', () => {
    const plain = 'AIzaSyDummyGeminiKeyForTests123456';
    const encrypted = encryptSecret(plain);
    assert.equal(encrypted.startsWith('v1:'), true);
    assert.equal(encrypted.includes(plain), false);
    assert.equal(decryptSecret(encrypted), plain);
  });

  it('masks secrets to the last four characters', () => {
    assert.equal(secretHint('AIzaSyDummyGeminiKeyForTests1234'), '•••• 1234');
    assert.equal(looksLikeMaskedSecret('•••• 1234'), true);
    assert.equal(looksLikeMaskedSecret('AIzaSyDummyGeminiKeyForTests1234'), false);
  });
});

describe('fallback eligibility', () => {
  it('falls back on exhausted credits and quota, not ordinary rate limits', () => {
    assert.equal(
      isFallbackEligible(
        new AIProviderError({
          provider: 'openai',
          status: 429,
          code: 'credit_balance_exhausted',
          message: 'You exceeded your current quota',
        })
      ),
      true
    );
    assert.equal(
      isFallbackEligible(
        new AIProviderError({
          provider: 'openai',
          status: 429,
          code: 'insufficient_quota',
          type: 'insufficient_quota',
          message: 'insufficient_quota',
        })
      ),
      true
    );
    assert.equal(
      isFallbackEligible(
        new AIProviderError({
          provider: 'openai',
          status: 429,
          code: 'rate_limit_exceeded',
          message: 'Rate limit reached for gpt-4o-mini',
        })
      ),
      false
    );
  });

  it('falls back when the provider is unavailable', () => {
    assert.equal(
      isFallbackEligible(new AIProviderError({ provider: 'openai', status: 503, message: 'Service unavailable' })),
      true
    );
    assert.equal(isFallbackEligible(new Error('The operation was aborted due to timeout')), true);
    assert.equal(
      isFallbackEligible(
        new AIProviderError({
          provider: 'gemini',
          status: 429,
          message: 'gemini-3.6-flash is currently experiencing high demand, spikes in demand are usually temporary. Please try again later.',
        })
      ),
      true
    );
  });

  it('does not fall back on bad requests', () => {
    assert.equal(
      isFallbackEligible(
        new AIProviderError({
          provider: 'openai',
          status: 400,
          code: 'invalid_request_error',
          message: 'Invalid schema',
        })
      ),
      false
    );
  });
});

describe('Gemini model migration', () => {
  it('replaces retired and new-user-blocked models with gemini-3.6-flash', () => {
    assert.equal(normalizeGeminiModel('gemini-2.0-flash'), 'gemini-3.6-flash');
    assert.equal(normalizeGeminiModel('models/gemini-2.0-flash'), 'gemini-3.6-flash');
    assert.equal(normalizeGeminiModel('gemini-1.5-flash'), 'gemini-3.6-flash');
    assert.equal(normalizeGeminiModel('gemini-2.5-flash'), 'gemini-3.6-flash');
    assert.equal(normalizeGeminiModel('models/gemini-2.5-flash'), 'gemini-3.6-flash');
    assert.equal(normalizeGeminiModel('gemini-3.6-flash'), 'gemini-3.6-flash');
    assert.deepEqual(geminiModelRetryChain('gemini-2.5-flash').slice(0, 3), [
      'gemini-3.6-flash',
      'gemini-3.5-flash',
      'gemini-3.8-flash',
    ]);
  });

  it('exposes the full current model catalog for the admin dropdown', () => {
    assert.ok(MODEL_OPTIONS.openai.length >= 20);
    assert.ok(MODEL_OPTIONS.gemini.length >= 8);
    assert.ok(MODEL_OPTIONS.claude.length >= 10);
    assert.ok(MODEL_OPTIONS.openai.some((option) => option.value === 'gpt-6-astra'));
    assert.ok(MODEL_OPTIONS.openai.some((option) => option.value === 'gpt-5.6-luna'));
    assert.ok(MODEL_OPTIONS.gemini.some((option) => option.value === 'gemini-3.8-flash'));
    assert.ok(MODEL_OPTIONS.claude.some((option) => option.value === 'claude-sonnet-5'));
  });
});

describe('model JSON cleanup', () => {
  it('strips markdown fences so fenced Gemini output parses', () => {
    const raw = '```json {\n  "reply_text": "Hello",\n  "intent": "greeting"\n}\n```';
    assert.equal(extractJsonText(raw).startsWith('{'), true);
    assert.equal(parseModelJson<{ reply_text: string }>(raw).reply_text, 'Hello');
  });

  it('extracts JSON when the model adds prose around it', () => {
    const raw = 'Sure, here you go:\n```json\n{"ok":true}\n```\nThanks';
    assert.deepEqual(parseModelJson(raw), { ok: true });
  });

  it('repairs trailing commas and smart quotes', () => {
    const raw = '{ “ok”: true, “items”: [1, 2,], }';
    assert.deepEqual(parseModelJson(raw), { ok: true, items: [1, 2] });
  });

  it('extracts the first balanced object from mixed output', () => {
    const raw = 'prefix {"name":"Ada","skills":["ts"]} leftover';
    assert.deepEqual(parseModelJson(raw), { name: 'Ada', skills: ['ts'] });
  });
});
