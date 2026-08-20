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

export function classifySession(messages: WhatsAppMessage[], now = new Date()): SessionKind {
  const outbound = messages.filter((m) => m.sender_type === 'AI' || m.sender_type === 'STAFF');
  if (outbound.length === 0) return 'fresh';
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
    return `${hello}${named}!\n\nThank you for contacting Techantum Solutions. We are happy to help you.`;
  }

  return `${hello}${named}, welcome back.`;
}

export function applyGreetingPrefix(replyText: string, greeting: string): string {
  const body = replyText.trim();
  if (!greeting) return body;
  const lower = body.toLowerCase();
  if (lower.startsWith('good morning') || lower.startsWith('good afternoon') || lower.startsWith('good evening')) {
    return body;
  }
  if (lower.includes('thank you for contacting techantum')) return body;
  return `${greeting}\n\n${body}`.trim();
}
