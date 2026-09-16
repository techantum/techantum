import type { WhatsAppContact, WhatsAppMessage } from './types';

export type SessionKind = 'fresh' | 'returning' | 'ongoing';

const IST = 'Asia/Kolkata';
const RETURNING_AFTER_MS = 8 * 60 * 60 * 1000;

export function getIndiaHour(now = new Date()): number {
  const hour = new Intl.DateTimeFormat('en-GB', {
    timeZone: IST,
    hour: '2-digit',
    hourCycle: 'h23',
  }).format(now);
  return Number(hour);
}

export function getTimeOfDayGreeting(now = new Date()): string {
  const hour = getIndiaHour(now);
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function classifySession(
  messages: WhatsAppMessage[],
  now = new Date(),
  extras?: { hadPriorChat?: boolean }
): SessionKind {
  const outbound = messages.filter((m) => m.sender_type === 'AI' || m.sender_type === 'STAFF');
  if (outbound.length === 0) return extras?.hadPriorChat ? 'returning' : 'fresh';
  const last = outbound[outbound.length - 1];
  const lastAt = last.created_at ? new Date(last.created_at).getTime() : 0;
  if (!lastAt || now.getTime() - lastAt >= RETURNING_AFTER_MS) return 'returning';
  return 'ongoing';
}

export function displayName(contact: Pick<WhatsAppContact, 'first_name' | 'profile_name'>): string {
  return (contact.first_name || contact.profile_name || '').trim();
}

export function buildGreetingOpening(input: {
  kind: SessionKind;
  contact: Pick<WhatsAppContact, 'first_name' | 'profile_name'>;
  now?: Date;
}): string {
  if (input.kind === 'ongoing') return '';
  const hello = getTimeOfDayGreeting(input.now);
  const name = displayName(input.contact);
  const named = name ? ` ${name}` : '';

  if (input.kind === 'fresh') {
    return `${hello}${named}!\n\nThank you for contacting Techantum Solutions. Happy to help you.`;
  }

  return `${hello}${named}, welcome back.`;
}

const UNCONFIRMED_FALLBACK =
  /i don['’]?t have that information confirmed right now\.?\s*i can have our team help you with it\.?/gi;

const GREETING_ONLY =
  /^(?:(?:hi+|hii+|he+y+|hello+|hola+|namaste|namaskar|yo|sup|what(?:'\s*)?s?\s*up|wassup|whatsup|good\s+(?:morning|afternoon|evening))(?:\s+(?:there|techantum|team|all))?[\s.!?,🙏]*)+$/i;

const ACKNOWLEDGEMENT_ONLY =
  /^(?:ok+|okay|okk|sure|thanks|thank\s*you|thankyou|noted|fine|alright|right|done|haan+|han|ji|yes|hmm+|👍|🙏|cool|great)[\s.!?,🙏]*$/i;

export const TECHANTUM_HELP_PROMPT =
  'Are you looking for a website, web application or mobile application?';

export function stripServiceQuestion(text: string): string {
  return text
    .replace(/are you looking for a website, web application or mobile application\??/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function stripCustomerEcho(reply: string, customerText: string): string {
  const clipped = customerText.replace(/\s+/g, ' ').trim();
  if (!reply || clipped.length < 8) return reply;
  const escaped = clipped.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return reply
    .replace(new RegExp(`(?:got it|noted)[^\\n]{0,24}${escaped}\\.?`, 'ig'), 'Got it, thank you.')
    .replace(new RegExp(`^[“"']${escaped}[”"']\\s*[-—:]?\\s*`, 'i'), '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function isAcknowledgement(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  const normalized = trimmed.replace(/[\u{1F300}-\u{1FAFF}]/gu, '').trim() || trimmed;
  return ACKNOWLEDGEMENT_ONLY.test(normalized);
}

export function isGreetingOnly(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  if (isAcknowledgement(trimmed)) return false;
  const normalized = trimmed.replace(/[\u{1F300}-\u{1FAFF}]/gu, '').trim();
  if (!normalized) return true;
  return GREETING_ONLY.test(normalized);
}

const WEBSITE_OPENER =
  /^(?:hello[!.,]?\s+)?i would like to inquire about(?: techantum(?: solutions)?(?: it)? services| your services)\.?$/i;
const WEBSITE_RETURNING =
  /^hi[,.]?\s+welcome back\.?\s+i wanted to continue(?: our conversation)?\.?$/i;

export const WEBSITE_RETURNING_MESSAGE = 'Hi, welcome back. I wanted to continue our conversation.';

export function isWebsiteWidgetOpener(text: string): boolean {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  if (!trimmed || trimmed.length > 180) return false;
  return WEBSITE_OPENER.test(trimmed) || WEBSITE_RETURNING.test(trimmed);
}

export function isGreetingTurn(text: string): boolean {
  return isGreetingOnly(text) || isWebsiteWidgetOpener(text);
}

export function isCasualChat(text: string): boolean {
  const t = text.replace(/\s+/g, ' ').trim();
  if (!t || t.length > 80) return false;
  return /^(?:how are you(?: doing)?(?: today)?|how r u|how're you|how's it going|how is it going|how's your day|how was your day|what's up|whats up|sup|you good|you okay)\b[\s!?.🙏]*$/i.test(
    t
  );
}

export function casualChatReply(text: string): string {
  if (/how are you|how r u|how're you|how's it going|how is it going|how's your day|how was your day/i.test(text)) {
    return "I'm doing great, hope you're doing well too.";
  }
  if (/what's up|whats up|sup/i.test(text)) {
    return "All good here. Hope you're doing well.";
  }
  return "I'm doing well, thank you. Hope you're doing fine.";
}

export function stripUnconfirmedFallback(text: string): string {
  const cleaned = text
    .replace(UNCONFIRMED_FALLBACK, '')
    .replace(/how can we help you today\??\s*we build websites, web applications and mobile applications\.?/gi, '')
    .replace(/are you looking for a website, web application or mobile application\??/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return cleaned;
}

export function buildGreetingReply(input: {
  kind: SessionKind;
  contact: Pick<WhatsAppContact, 'first_name' | 'profile_name'>;
  now?: Date;
}): string {
  if (input.kind === 'ongoing') return 'Hi, sure. Please go ahead.';
  return buildGreetingOpening(input);
}

export function applyGreetingPrefix(replyText: string, greeting: string): string {
  const body = stripServiceQuestion(stripUnconfirmedFallback(replyText));
  if (!greeting) return body;
  if (!body) return greeting;
  const lower = body.toLowerCase();
  if (lower.startsWith('good morning') || lower.startsWith('good afternoon') || lower.startsWith('good evening')) {
    return stripServiceQuestion(body);
  }
  if (lower.includes('thank you for contacting techantum')) return stripServiceQuestion(body);
  return `${greeting}\n\n${body}`.trim();
}
