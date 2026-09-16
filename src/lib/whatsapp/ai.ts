import { getOpenAiConfig, TECHANTUM_AI_SYSTEM_INSTRUCTIONS } from './config';
import type { AIReplyStructured, ExtractedLeadData, WhatsAppContact, WhatsAppConversation, WhatsAppMessage } from './types';
import { formatKnowledgeContext, searchKnowledge } from './knowledge';
import type { AISettings } from './types';
import { classifySession, stripUnconfirmedFallback, type SessionKind } from './greeting';
import { getWebsiteServiceCatalog, TECHANTUM_CONTINUE_REPLY, TECHANTUM_OUT_OF_SCOPE_REPLY } from './website-knowledge';
import { formatQualificationSummary, humanContinueReply, normalizeQualification, formatConversationStory, stripBrokenGeneric } from './qualification';

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
  sessionKind: SessionKind;
  qualification?: unknown;
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

  const qualification = input.conversation.qualification
    ? formatQualificationSummary({
        name: input.contact.first_name || input.contact.profile_name,
        phone: input.contact.phone_number,
        qualification: normalizeQualification(input.conversation.qualification),
      })
    : 'Not started.';

  return `${getWebsiteServiceCatalog()}

ADDITIONAL KNOWLEDGE ENTRIES:
${input.knowledgeContext}

CUSTOMER RECORD:
${customerFacts || 'No confirmed customer details yet.'}

QUALIFICATION / PROSPECT ASSESSMENT:
${qualification}

SESSION: ${input.sessionKind.toUpperCase()}
CONVERSATION SUMMARY:
${input.conversation.conversation_summary || 'No summary yet.'}

RECENT MESSAGES:
${history || 'No prior messages.'}

NEW CUSTOMER MESSAGE:
${input.customerMessage}

Respond with JSON matching the schema. Speak simple Indian English. Continue this chat — do not restart. Do not mention price, budget or cost. Thank them professionally and build trust. reply_text must be WhatsApp-friendly plain text only (no markdown). Max ~${input.settings.max_response_length} characters.`;
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
  const sessionKind = classifySession(input.recentMessages);

  const qualification = normalizeQualification(input.conversation.qualification);
  const fallbackText = humanContinueReply(qualification, input.customerMessage) || TECHANTUM_CONTINUE_REPLY;

  if (!apiKey) {
    return {
      reply: {
        reply_text: fallbackText,
        intent: 'OTHER',
        is_techantum_related: true,
        knowledge_sufficient: false,
        lead_stage: input.conversation.lead_stage,
        handoff_required: false,
        handoff_reason: null,
        extracted_data: emptyExtracted(),
      },
      responseId: null,
    };
  }

  const userPrompt = buildUserPrompt({ ...input, knowledgeContext, sessionKind });

  try {
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
        temperature: 0.3,
        max_tokens: 500,
      }),
      signal: AbortSignal.timeout(12000),
    });

    const data = (await res.json().catch(() => ({}))) as {
      id?: string;
      choices?: { message?: { content?: string } }[];
      error?: { message?: string };
    };

    if (!res.ok) {
      throw new Error(data.error?.message || `OpenAI error ${res.status}`);
    }

    const rawText = data.choices?.[0]?.message?.content || '';
    const parsed = safeParseStructured(rawText);
    if (!parsed) throw new Error('Malformed AI structured output');

    if (!parsed.is_techantum_related) {
      parsed.reply_text = TECHANTUM_OUT_OF_SCOPE_REPLY;
      parsed.knowledge_sufficient = false;
      parsed.handoff_required = true;
      parsed.handoff_reason = parsed.handoff_reason || 'OUT_OF_SCOPE';
      parsed.lead_stage = 'HUMAN_FOLLOWUP';
    } else {
      parsed.reply_text = stripBrokenGeneric(stripUnconfirmedFallback(parsed.reply_text)) || fallbackText;
    }

    parsed.reply_text = parsed.reply_text.trim().slice(0, input.settings.max_response_length);
    return { reply: parsed, responseId: data.id || null };
  } catch (err) {
    console.error('[whatsapp ai] generate failed', err instanceof Error ? err.message : err);
    return {
      reply: {
        reply_text: fallbackText,
        intent: 'OTHER',
        is_techantum_related: true,
        knowledge_sufficient: Boolean(knowledge.length),
        lead_stage: input.conversation.lead_stage,
        handoff_required: false,
        handoff_reason: null,
        extracted_data: emptyExtracted(),
      },
      responseId: null,
    };
  }
}

export function buildLocalSummary(input: {
  contact: WhatsAppContact;
  messages: WhatsAppMessage[];
  reply?: AIReplyStructured;
  sessionKind?: SessionKind;
  qualification?: unknown;
}): string {
  return formatConversationStory(normalizeQualification(input.qualification), input.messages);
}

export async function summarizeConversation(
  messages: WhatsAppMessage[],
  contact: WhatsAppContact,
  reply?: AIReplyStructured,
  sessionKind?: SessionKind,
  qualification?: unknown
): Promise<string> {
  const fallback = formatConversationStory(normalizeQualification(qualification), messages);
  const { apiKey, model } = getOpenAiConfig();
  if (!apiKey || messages.length < 1) return fallback;

  const transcript = messages
    .slice(-30)
    .map((m) => `${m.sender_type}: ${m.text_content || ''}`)
    .join('\n');

  try {
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
              'You write a short internal recap of a Techantum WhatsApp chat for a business-development person. 4 to 8 short lines. Cover what the customer asked, what they chose, the requirement in their words, and the next step. Do not repeat Prospect/Contact/Session/Intent/Stage labels. Do not invent budget, price or timeline. Be factual.',
          },
          {
            role: 'user',
            content: `Customer: ${contact.first_name || contact.profile_name || ''} ${contact.phone_number}\n\n${transcript}`,
          },
        ],
        temperature: 0.2,
        max_tokens: 280,
      }),
      signal: AbortSignal.timeout(15000),
    });

    const data = (await res.json().catch(() => ({}))) as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content?.trim() || fallback;
  } catch {
    return fallback;
  }
}
