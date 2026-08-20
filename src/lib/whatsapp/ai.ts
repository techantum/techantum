import { getOpenAiConfig, TECHANTUM_AI_SYSTEM_INSTRUCTIONS } from './config';
import type { AIReplyStructured, ExtractedLeadData, WhatsAppContact, WhatsAppConversation, WhatsAppMessage } from './types';
import { formatKnowledgeContext, searchKnowledge } from './knowledge';
import type { AISettings } from './types';

const STRUCTURED_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    reply_text: { type: 'string' },
    intent: { type: 'string' },
    is_techantum_related: { type: 'boolean' },
    knowledge_sufficient: { type: 'boolean' },
    lead_stage: { type: 'string' },
    handoff_required: { type: 'boolean' },
    handoff_reason: { type: ['string', 'null'] },
    extracted_data: {
      type: 'object',
      additionalProperties: false,
      properties: {
        name: { type: ['string', 'null'] },
        company: { type: ['string', 'null'] },
        email: { type: ['string', 'null'] },
        service: { type: ['string', 'null'] },
        project_type: { type: ['string', 'null'] },
        requirement: { type: ['string', 'null'] },
        budget: { type: ['string', 'null'] },
        timeline: { type: ['string', 'null'] },
        location: { type: ['string', 'null'] },
      },
      required: ['name', 'company', 'email', 'service', 'project_type', 'requirement', 'budget', 'timeline', 'location'],
    },
  },
  required: [
    'reply_text',
    'intent',
    'is_techantum_related',
    'knowledge_sufficient',
    'lead_stage',
    'handoff_required',
    'handoff_reason',
    'extracted_data',
  ],
};

function emptyExtracted(): ExtractedLeadData {
  return {
    name: null,
    company: null,
    email: null,
    service: null,
    project_type: null,
    requirement: null,
    budget: null,
    timeline: null,
    location: null,
  };
}

function safeParseStructured(raw: string): AIReplyStructured | null {
  try {
    const parsed = JSON.parse(raw) as AIReplyStructured;
    if (!parsed.reply_text || typeof parsed.reply_text !== 'string') return null;
    parsed.extracted_data = { ...emptyExtracted(), ...(parsed.extracted_data || {}) };
    return parsed;
  } catch {
    return null;
  }
}

function buildUserPrompt(input: {
  customerMessage: string;
  contact: WhatsAppContact;
  conversation: WhatsAppConversation;
  recentMessages: WhatsAppMessage[];
  knowledgeContext: string;
  settings: AISettings;
}) {
  const history = input.recentMessages
    .slice(-12)
    .map((m) => {
      const who =
        m.sender_type === 'CUSTOMER' ? 'Customer' : m.sender_type === 'AI' ? 'Assistant' : m.sender_type;
      return `${who}: ${m.text_content || `[${m.message_type}]`}`;
    })
    .join('\n');

  const customerFacts = [
    input.contact.first_name || input.contact.profile_name ? `Name: ${input.contact.first_name || input.contact.profile_name}` : null,
    input.contact.company_name ? `Company: ${input.contact.company_name}` : null,
    input.contact.email ? `Email: ${input.contact.email}` : null,
    input.contact.location ? `Location: ${input.contact.location}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  return `TECHANTUM KNOWLEDGE BASE:
${input.knowledgeContext}

CUSTOMER RECORD:
${customerFacts || 'No confirmed customer details yet.'}

CONVERSATION SUMMARY:
${input.conversation.conversation_summary || 'No summary yet.'}

RECENT MESSAGES:
${history || 'No prior messages.'}

NEW CUSTOMER MESSAGE:
${input.customerMessage}

Respond with JSON matching the schema. reply_text must be WhatsApp-friendly plain text only (no markdown). Max ~${input.settings.max_response_length} characters.`;
}

export async function generateWhatsAppReply(input: {
  customerMessage: string;
  contact: WhatsAppContact;
  conversation: WhatsAppConversation;
  recentMessages: WhatsAppMessage[];
  settings: AISettings;
}): Promise<{ reply: AIReplyStructured; responseId: string | null }> {
  const { apiKey, model } = getOpenAiConfig();
  const knowledge = await searchKnowledge(input.customerMessage, input.settings.knowledge_retrieval_limit);
  const knowledgeContext = formatKnowledgeContext(knowledge);

  if (!apiKey) {
    return {
      reply: {
        reply_text: input.settings.fallback_message,
        intent: 'OTHER',
        is_techantum_related: true,
        knowledge_sufficient: false,
        lead_stage: input.conversation.lead_stage,
        handoff_required: true,
        handoff_reason: 'AI_NOT_CONFIGURED',
        extracted_data: emptyExtracted(),
      },
      responseId: null,
    };
  }

  const userPrompt = buildUserPrompt({ ...input, knowledgeContext });

  try {
    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        instructions: `${TECHANTUM_AI_SYSTEM_INSTRUCTIONS}\n\nReturn ONLY valid JSON with this schema:\n${JSON.stringify(STRUCTURED_SCHEMA)}`,
        input: userPrompt,
        previous_response_id: input.conversation.last_ai_response_id || undefined,
        text: { format: { type: 'json_object' } },
        temperature: 0.4,
        max_output_tokens: 700,
      }),
    });

    const data = (await res.json().catch(() => ({}))) as {
      id?: string;
      output_text?: string;
      output?: { content?: { type?: string; text?: string }[] }[];
      error?: { message?: string };
    };

    if (!res.ok) {
      throw new Error(data.error?.message || `OpenAI error ${res.status}`);
    }

    const rawText =
      data.output_text ||
      data.output?.flatMap((o) => o.content || []).find((c) => c.type === 'output_text')?.text ||
      data.output?.flatMap((o) => o.content || []).find((c) => c.text)?.text ||
      '';

    const parsed = safeParseStructured(rawText);
    if (!parsed) throw new Error('Malformed AI structured output');

    if (!parsed.is_techantum_related) {
      parsed.reply_text = input.settings.out_of_scope_message;
      parsed.knowledge_sufficient = false;
    } else if (!parsed.knowledge_sufficient && !parsed.handoff_required) {
      parsed.reply_text = input.settings.fallback_message;
    }

    parsed.reply_text = parsed.reply_text.trim().slice(0, input.settings.max_response_length);
    return { reply: parsed, responseId: data.id || null };
  } catch {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: `${TECHANTUM_AI_SYSTEM_INSTRUCTIONS}\nReturn JSON only.` },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: 700,
      }),
    });

    const data = (await res.json().catch(() => ({}))) as {
      choices?: { message?: { content?: string } }[];
    };
    const parsed = safeParseStructured(data.choices?.[0]?.message?.content || '');
    if (!parsed) {
      return {
        reply: {
          reply_text: input.settings.fallback_message,
          intent: 'OTHER',
          is_techantum_related: true,
          knowledge_sufficient: false,
          lead_stage: input.conversation.lead_stage,
          handoff_required: true,
          handoff_reason: 'AI_PARSE_ERROR',
          extracted_data: emptyExtracted(),
        },
        responseId: null,
      };
    }
    parsed.reply_text = parsed.reply_text.trim().slice(0, input.settings.max_response_length);
    return { reply: parsed, responseId: null };
  }
}

export async function summarizeConversation(messages: WhatsAppMessage[], contact: WhatsAppContact): Promise<string> {
  const { apiKey, model } = getOpenAiConfig();
  if (!apiKey || messages.length < 4) return '';

  const transcript = messages
    .slice(-30)
    .map((m) => `${m.sender_type}: ${m.text_content || ''}`)
    .join('\n');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content:
            'Summarize this Techantum WhatsApp sales conversation for internal CRM use. Include customer name/company if known, requirement, service interest, timeline, location, and next step. Be factual; mark uncertain details as unconfirmed.',
        },
        {
          role: 'user',
          content: `Customer phone: ${contact.phone_number}\n\n${transcript}`,
        },
      ],
      temperature: 0.2,
      max_tokens: 400,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content?.trim() || '';
}
