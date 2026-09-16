import { displayName, getIndiaHour, getTimeOfDayGreeting } from './greeting.ts';
import { serviceLabel, type QualificationState } from './qualification.ts';
import type { WhatsAppContact } from './types.ts';

export const FOLLOWUP_SESSION_HOURS = 23;

export function isFollowupWindow(
  now = new Date(),
  startHour = 9,
  endHour = 20
): boolean {
  const hour = getIndiaHour(now);
  return hour >= startHour && hour < endHour;
}

export function followupDelayHours(count: number, firstHours: number, secondHours: number): number {
  return count <= 0 ? firstHours : secondHours;
}

export function isFollowupDue(input: {
  now?: Date;
  lastInboundAt?: string | null;
  lastOutboundAt?: string | null;
  followupCount?: number;
  firstHours: number;
  secondHours: number;
  maxFollowups: number;
  startHour?: number;
  endHour?: number;
  lastOutboundSender?: string | null;
}): { due: boolean; reason: string } {
  const now = input.now || new Date();
  const count = input.followupCount || 0;
  if (count >= input.maxFollowups) return { due: false, reason: 'max_reached' };
  if (count >= 1 && input.secondHours <= 0) return { due: false, reason: 'max_reached' };
  if (!isFollowupWindow(now, input.startHour ?? 9, input.endHour ?? 20)) {
    return { due: false, reason: 'outside_hours' };
  }
  if (!input.lastInboundAt || !input.lastOutboundAt) return { due: false, reason: 'missing_timestamps' };
  if (input.lastOutboundSender === 'STAFF') return { due: false, reason: 'staff_owns_chat' };

  const inbound = new Date(input.lastInboundAt).getTime();
  const outbound = new Date(input.lastOutboundAt).getTime();
  if (!inbound || !outbound) return { due: false, reason: 'missing_timestamps' };
  if (inbound > outbound) return { due: false, reason: 'awaiting_our_reply' };

  const inboundAgeHours = (now.getTime() - inbound) / 36e5;
  if (inboundAgeHours >= FOLLOWUP_SESSION_HOURS) return { due: false, reason: 'session_closed' };

  const delay = followupDelayHours(count, input.firstHours, input.secondHours);
  if (inboundAgeHours < delay) return { due: false, reason: 'too_soon' };
  return { due: true, reason: 'due' };
}

export function buildFollowupMessage(input: {
  qualification: QualificationState;
  contact: Pick<WhatsAppContact, 'first_name' | 'profile_name'>;
  now?: Date;
  attempt?: number;
}): string {
  const hello = getTimeOfDayGreeting(input.now);
  const name = displayName(input.contact).replace(/^~/, '').trim();
  const named = name ? ` ${name}` : '';
  const q = input.qualification;
  const service = serviceLabel(q.service);
  const later = (input.attempt || 0) > 0;

  if (!q.service) {
    return later
      ? `${hello}${named}.\n\nJust checking again — would you like a website, a web application or a mobile application?`
      : `${hello}${named}.\n\nJust following up. Are you looking for a website, web application or mobile application?`;
  }

  if (!q.brief && (q.step === 'brief' || q.step === 'purpose' || q.step === 'service')) {
    return `${hello}${named}.\n\nWe were talking about a ${service.toLowerCase()}. Could you share in 1–2 lines what you need?`;
  }

  if (q.step === 'slot') {
    return `${hello}${named}.\n\nPlease share a convenient time for the call. Tomorrow 11 am, today evening, or anytime today is fine.`;
  }

  if (q.step === 'call' && q.call_requested !== true && q.call_requested !== false) {
    return `${hello}${named}.\n\nThank you again for sharing your ${service.toLowerCase()} requirement. Our team would like to understand it fully so we can suggest the right solution. Would you like them to call you?`;
  }

  if (q.call_requested === true) {
    return `${hello}${named}.\n\nOur team will call you about the ${service.toLowerCase()}. Is there a convenient time today, or any extra detail we should know?`;
  }

  if (q.call_requested === false || q.purpose === 'explore') {
    return `${hello}${named}.\n\nYou were looking at our ${service.toLowerCase()} work. If you have a requirement now, I can note it and arrange a call.`;
  }

  if (q.brief) {
    return `${hello}${named}.\n\nJust following up on your ${service.toLowerCase()} requirement. Would you like our team to call you so we can understand it fully and suggest the right solution?`;
  }

  return `${hello}${named}.\n\nJust following up on your enquiry with Techantum. Are you still looking at this?`;
}
