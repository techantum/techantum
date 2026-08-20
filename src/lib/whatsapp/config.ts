import type { AISettings } from './types';

function env(key: string, fallback = '') {
  return process.env[key]?.trim() || fallback;
}

function first(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return '';
}

export function getWhatsAppAiConfig() {
  const accessToken = first('META_WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_ACCESS_TOKEN');
  const phoneNumberId = first('META_WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_PHONE_NUMBER_ID');
  const businessAccountId = first('META_WHATSAPP_BUSINESS_ACCOUNT_ID', 'WHATSAPP_BUSINESS_ACCOUNT_ID');
  const verifyToken = first('META_WHATSAPP_VERIFY_TOKEN', 'WHATSAPP_VERIFY_TOKEN');
  const appSecret = first('META_WHATSAPP_APP_SECRET', 'WHATSAPP_APP_SECRET');
  const graphVersion = first('META_GRAPH_API_VERSION', 'WHATSAPP_API_VERSION') || 'v21.0';

  return {
    enabled: env('WHATSAPP_AI_ENABLED', 'false') === 'true' || env('META_WHATSAPP_ENABLED', 'false') === 'true',
    accessToken,
    phoneNumberId,
    businessAccountId,
    verifyToken,
    appSecret,
    graphVersion,
    configured: Boolean(accessToken && phoneNumberId),
  };
}

export function getOpenAiConfig() {
  return {
    apiKey: env('OPENAI_API_KEY'),
    model: env('OPENAI_MODEL', 'gpt-4o-mini'),
    vectorStoreId: env('OPENAI_VECTOR_STORE_ID'),
    configured: Boolean(env('OPENAI_API_KEY')),
  };
}

export const DEFAULT_AI_SETTINGS: Omit<AISettings, 'id' | 'updated_at'> = {
  ai_enabled: false,
  default_mode: 'AI',
  auto_handoff: true,
  auto_lead_creation: true,
  auto_conversation_summary: true,
  knowledge_retrieval_limit: 6,
  max_response_length: 800,
  fallback_message: "I don't have that information confirmed right now. I can have our team help you with it.",
  out_of_scope_message:
    "I can help specifically with Techantum's websites, web applications, mobile applications and custom software solutions. What are you looking to build?",
  business_hours: { timezone: 'Asia/Kolkata', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], open: '09:30', close: '18:30' },
  after_hours_message: "Sure. I've noted your request. Our team can follow up during business hours.",
  handoff_mode: 'HUMAN',
};

export const TECHANTUM_AI_SYSTEM_INSTRUCTIONS = `You are the official virtual sales and customer assistance representative for Techantum Solutions.

Your purpose is to understand what the customer needs and help them identify the right Techantum solution.

Communication style:
- Speak naturally, professionally and conversationally on WhatsApp.
- Keep messages reasonably short. Ask one or two questions at a time.
- Avoid long essays, excessive bullet points, and repetitive greetings.
- Use the customer's name naturally when known.
- Continue previous conversations instead of restarting qualification.

Scope:
- Answer business information ONLY from the supplied Techantum Knowledge Base.
- Never answer unrelated general-knowledge questions using your own knowledge.
- Never invent prices, timelines, features, discounts, portfolio projects, policies, or commitments.
- If information is insufficient, say so and offer human assistance.

Sales behavior:
- Understand the business problem before recommending a package.
- Do not aggressively sell.

Transparency:
- If asked whether you are AI, say you are Techantum's virtual assistant and can connect them with the team.
- Never claim to be a human employee.

Return structured JSON only as instructed.`;
