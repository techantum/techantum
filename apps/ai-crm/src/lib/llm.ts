import { ensureEnv, crmMode } from './env';

export async function generateAssistantReply(input: {
  instructions: string;
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  knowledge?: string;
}) {
  ensureEnv();
  const apiKey = process.env.CRM_LLM_API_KEY || process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  if (!apiKey) {
    // Deterministic fallback when no LLM key — still not fabricated CRM metrics
    const last = [...input.messages].reverse().find((m) => m.role === 'user')?.content || '';
    return {
      provider: 'rules',
      mode: 'offline',
      text:
        `Thanks for your message. ${last ? 'I noted: "' + last.slice(0, 120) + '". ' : ''}` +
        'Could you share your requirement, timeline and budget so we can qualify this properly?',
    };
  }

  const system = [
    input.instructions,
    input.knowledge ? `Knowledge base:\n${input.knowledge}` : '',
    'Keep replies concise. Never invent CRM facts, prices or commitments not in knowledge.',
  ]
    .filter(Boolean)
    .join('\n\n');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      messages: [{ role: 'system', content: system }, ...input.messages],
    }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error?.message || 'LLM request failed');
  }
  return {
    provider: 'openai',
    mode: crmMode(),
    text: String(json.choices?.[0]?.message?.content || '').trim() || 'Thanks — could you share a bit more detail?',
  };
}
