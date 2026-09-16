import type { LeadStage } from './types';
import { isAcknowledgement } from './greeting.ts';
import {
  confirmAppointmentReply,
  upcomingSlotPicker,
  isScheduledSlotPast,
  isSlotBookable,
  matchAvailableSlot,
  parseAppointmentSlot,
  type ParsedSlot,
} from './appointment-slot.ts';

export type ServiceKey = 'WEBSITE' | 'WEB_APPLICATION' | 'MOBILE_APPLICATION';
export type QualificationStep = 'service' | 'purpose' | 'brief' | 'call' | 'slot' | 'done';
export type ProspectStatus = 'UNKNOWN' | 'PROSPECT' | 'NURTURE' | 'NOT_PROSPECT';

export type InteractiveButton = { id: string; title: string };

export interface QualificationState {
  step: QualificationStep;
  service?: ServiceKey;
  purpose?: string;
  audience?: string;
  timeline?: string;
  budget?: string;
  brief?: string;
  call_requested?: boolean;
  preferred_slot?: string;
  preferred_slot_at?: string;
  slot_date?: string;
  slot_window?: 'morning' | 'afternoon';
  appointment_id?: string;
  prospect: ProspectStatus;
  prospect_reason: string;
}

export const SERVICE_QUESTION =
  'Are you looking for a website, web application or mobile application?';

export const SERVICE_BUTTONS: InteractiveButton[] = [
  { id: 'svc_website', title: 'Website' },
  { id: 'svc_webapp', title: 'Web application' },
  { id: 'svc_mobile', title: 'Mobile application' },
];

const PURPOSE_BUTTONS: InteractiveButton[] = [
  { id: 'purpose_new', title: 'New project' },
  { id: 'purpose_existing', title: 'Update existing' },
  { id: 'purpose_explore', title: 'Just exploring' },
];

export const CALL_BUTTONS: InteractiveButton[] = [
  { id: 'call_yes', title: 'Book a call' },
  { id: 'call_later', title: 'Not now' },
];

export const CALL_QUESTION =
  'If it helps, I can book a short appointment with our solution expert to understand your requirement in detail. Shall I?';
export const EXPERT_CALL_QUESTION = CALL_QUESTION;

const SERVICE_LABEL: Record<ServiceKey, string> = {
  WEBSITE: 'Website',
  WEB_APPLICATION: 'Web application',
  MOBILE_APPLICATION: 'Mobile application',
};

const PURPOSE_LABEL: Record<string, string> = {
  new: 'Has a requirement',
  existing: 'Update existing system',
  explore: 'Just checking',
};

export const PROSPECT_LABEL: Record<ProspectStatus, string> = {
  UNKNOWN: 'Not yet assessed',
  PROSPECT: 'Yes — qualified prospect',
  NURTURE: 'Nurture — keep in touch',
  NOT_PROSPECT: 'No — not a current prospect',
};

const BROKEN_GENERIC =
  /how can we help you today\??\s*we build websites, web applications and mobile applications\.?/gi;

export function emptyQualification(): QualificationState {
  return { step: 'service', prospect: 'UNKNOWN', prospect_reason: 'Qualification not started' };
}

function mapLegacyStep(raw: string): QualificationStep {
  if (raw === 'audience' || raw === 'timeline' || raw === 'budget' || raw === 'details') return 'brief';
  if (['service', 'purpose', 'brief', 'call', 'slot', 'done'].includes(raw)) return raw as QualificationStep;
  return 'service';
}

export function normalizeQualification(raw: unknown): QualificationState {
  const value = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const step = mapLegacyStep(String(value.step || 'service'));
  const prospect = ['UNKNOWN', 'PROSPECT', 'NURTURE', 'NOT_PROSPECT'].includes(String(value.prospect))
    ? (value.prospect as ProspectStatus)
    : 'UNKNOWN';
  const service = ['WEBSITE', 'WEB_APPLICATION', 'MOBILE_APPLICATION'].includes(String(value.service))
    ? (value.service as ServiceKey)
    : undefined;
  return {
    step: service && step === 'service' ? 'purpose' : step,
    service,
    purpose: typeof value.purpose === 'string' ? value.purpose : undefined,
    audience: typeof value.audience === 'string' ? value.audience : undefined,
    timeline: typeof value.timeline === 'string' ? value.timeline : undefined,
    budget: undefined,
    brief: typeof value.brief === 'string' ? value.brief : undefined,
    call_requested: value.call_requested === true ? true : value.call_requested === false ? false : undefined,
    preferred_slot: typeof value.preferred_slot === 'string' ? value.preferred_slot : undefined,
    preferred_slot_at: typeof value.preferred_slot_at === 'string' ? value.preferred_slot_at : undefined,
    slot_date: typeof value.slot_date === 'string' ? value.slot_date : undefined,
    slot_window: value.slot_window === 'morning' || value.slot_window === 'afternoon' ? value.slot_window : undefined,
    appointment_id: typeof value.appointment_id === 'string' ? value.appointment_id : undefined,
    prospect,
    prospect_reason: typeof value.prospect_reason === 'string' ? value.prospect_reason : '',
  };
}

export function serviceLabel(service?: ServiceKey | null): string {
  return service ? SERVICE_LABEL[service] : 'Not chosen';
}

export function detectServiceFromText(text: string): ServiceKey | null {
  const t = text.toLowerCase();
  if (/web\s*app|web application|saas|crm|dashboard|customer portal|internal tool/.test(t)) return 'WEB_APPLICATION';
  if (/mobile\s*app|android|ios|iphone|play store|app store/.test(t)) return 'MOBILE_APPLICATION';
  if (/\bmobile\b/.test(t) && /\bapp/.test(t)) return 'MOBILE_APPLICATION';
  if (/website|web site|landing page|wordpress|company site/.test(t)) return 'WEBSITE';
  return null;
}

function aliases(id: string, extra: string[]): string[] {
  return [id, ...extra].map((item) => item.toLowerCase());
}

const CHOICE_ALIASES: Record<string, string[]> = {
  svc_website: aliases('svc_website', ['website', '1', 'a website', 'web site']),
  svc_webapp: aliases('svc_webapp', ['web application', 'web app', 'webapp', '2']),
  svc_mobile: aliases('svc_mobile', ['mobile application', 'mobile app', 'mobile', '3']),
  purpose_new: aliases('purpose_new', ['i have a requirement', 'new project', 'new', 'yes', 'requirement', '1']),
  purpose_existing: aliases('purpose_existing', ['update existing', 'existing', 'upgrade', 'redesign', '2']),
  purpose_explore: aliases('purpose_explore', ['just checking', 'just exploring', 'exploring', '3']),
  call_yes: aliases('call_yes', [
    'please call me',
    'call me',
    'book a call',
    'yes',
    'please call',
    'ok',
    'okay',
    'sure',
    'haan',
    'han',
    'ji',
    '1',
  ]),
  call_later: aliases('call_later', ["i'll message later", 'later', 'not now', '2']),
};

const STEP_IDS: Record<Exclude<QualificationStep, 'brief' | 'slot' | 'done'>, string[]> = {
  service: ['svc_website', 'svc_webapp', 'svc_mobile'],
  purpose: ['purpose_new', 'purpose_existing', 'purpose_explore'],
  call: ['call_yes', 'call_later'],
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function textMatchesAlias(text: string, alias: string): boolean {
  if (text === alias) return true;
  if (alias.length <= 3) {
    return new RegExp(`(?:^|\\b)${escapeRegExp(alias)}(?:\\b|$)`, 'i').test(text);
  }
  return text.includes(alias);
}

export function resolveChoiceId(step: QualificationStep, input: { id?: string | null; text?: string | null }): string | null {
  if (step === 'brief' || step === 'slot' || step === 'done') return null;
  const ids = STEP_IDS[step];
  if (!ids) return null;
  const rawId = (input.id || '').trim();
  if (rawId && ids.includes(rawId)) return rawId;

  const text = (input.text || '').trim().toLowerCase();
  if (!text) return null;
  for (const id of ids) {
    if (CHOICE_ALIASES[id].some((alias) => textMatchesAlias(text, alias))) return id;
  }
  return null;
}

export function looksLikeQuestion(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (/\?/.test(t)) return true;
  return /^(what|how|why|when|where|who|which|do you|can you|could you|tell me|please|price|cost|package|include)/i.test(
    t
  );
}

export function isGuidedChoice(
  step: QualificationStep,
  input: { id?: string | null; text?: string | null }
): boolean {
  if (step === 'brief' || step === 'slot' || step === 'done') return false;
  if (input.id && resolveChoiceId(step, { id: input.id })) return true;
  const text = (input.text || '').trim();
  if (!text) return false;
  const words = text.split(/\s+/).filter(Boolean).length;
  if (looksLikeQuestion(text) && words > 5) return false;
  if (resolveChoiceId(step, { text })) return true;
  return step === 'service' && Boolean(detectServiceFromText(text)) && !looksLikeQuestion(text);
}

export function scoreProspect(q: QualificationState): {
  prospect: ProspectStatus;
  prospect_reason: string;
  lead_stage: LeadStage;
} {
  if (!q.service) {
    return { prospect: 'UNKNOWN', prospect_reason: 'Service not chosen yet', lead_stage: 'NEW' };
  }

  const hasRequirement = q.purpose === 'new' || q.purpose === 'existing';
  const hasBrief = Boolean(q.brief && q.brief.trim().length > 3);

  if (q.purpose === 'explore') {
    return {
      prospect: 'NURTURE',
      prospect_reason: 'Just checking for now, no active requirement',
      lead_stage: 'ENGAGED',
    };
  }

  if (hasRequirement && hasBrief) {
    return {
      prospect: 'PROSPECT',
      prospect_reason: 'Has a live requirement. Team should call and discuss personally.',
      lead_stage: 'QUALIFIED',
    };
  }

  if (hasRequirement) {
    return {
      prospect: 'UNKNOWN',
      prospect_reason: 'Has a requirement; waiting for a short brief',
      lead_stage: 'REQUIREMENT_IDENTIFIED',
    };
  }

  return {
    prospect: 'UNKNOWN',
    prospect_reason: 'Qualification in progress',
    lead_stage: 'ENGAGED',
  };
}

export function serviceIntro(service: ServiceKey): string {
  if (service === 'WEBSITE') {
    return 'A website is often the first place clients judge your business. We help you present your work clearly so people understand what you do and can reach you.';
  }
  if (service === 'WEB_APPLICATION') {
    return 'A web application is for daily work — logins, dashboards, portals, and internal tools. We design it around how your team actually operates, not a generic screen.';
  }
  return 'A mobile app is for people on the go — customers or your own team. We start from the one job the app must do well, then build Android and iPhone around that.';
}

function applyChoice(state: QualificationState, choiceId: string): QualificationState {
  const next = { ...state };
  if (choiceId === 'svc_website') next.service = 'WEBSITE';
  if (choiceId === 'svc_webapp') next.service = 'WEB_APPLICATION';
  if (choiceId === 'svc_mobile') next.service = 'MOBILE_APPLICATION';
  if (choiceId === 'purpose_new') next.purpose = 'new';
  if (choiceId === 'purpose_existing') next.purpose = 'existing';
  if (choiceId === 'purpose_explore') next.purpose = 'explore';
  if (choiceId === 'call_yes') next.call_requested = true;
  if (choiceId === 'call_later') next.call_requested = false;
  return next;
}

export function nextQuestion(state: QualificationState): { body: string; buttons: InteractiveButton[] | null } {
  if (state.step === 'service' || !state.service) {
    return { body: SERVICE_QUESTION, buttons: SERVICE_BUTTONS };
  }
  if (state.step === 'purpose') {
    return {
      body: 'To understand this properly — is this a new project, an update to something you already have, or are you exploring for now?',
      buttons: PURPOSE_BUTTONS,
    };
  }
  if (state.step === 'call') {
    return {
      body: CALL_QUESTION,
      buttons: CALL_BUTTONS,
    };
  }
  if (state.step === 'slot') {
    const picker = upcomingSlotPicker();
    return { body: picker.body, buttons: picker.buttons || null };
  }
  return { body: '', buttons: null };
}

export function briefPrompt(service: ServiceKey): string {
  if (service === 'WEBSITE') {
    return 'To suggest the right website, tell me in 1–2 lines: what should it do for your business? For example, show your services, collect enquiries, or help clients understand your work.';
  }
  if (service === 'WEB_APPLICATION') {
    return 'To suggest the right web application, tell me in 1–2 lines: what work should it handle, and who will use it?';
  }
  return 'To suggest the right mobile app, tell me in 1–2 lines: who will use it, and what is the one main job it should do?';
}

export function techantumValuePitch(service?: ServiceKey): string {
  if (service === 'WEB_APPLICATION') {
    return 'Here is why teams pick Techantum. We are solution-focused. We do not drop a generic dashboard on you. We first understand how your team actually works, then build the application around that.';
  }
  if (service === 'MOBILE_APPLICATION') {
    return 'Here is why teams pick Techantum. We are solution-focused. We do not push a template app. We first understand who will use it and what job it must do, then we build for that.';
  }
  return 'Here is why teams pick Techantum. We are solution-focused. We do not rush you into a ready-made template. We first understand your business, then build something that helps clients find you and take the next step.';
}

export function captureBrief(state: QualificationState, text: string): QualificationState {
  const brief = text.replace(BROKEN_GENERIC, '').trim().slice(0, 400);
  const next: QualificationState = { ...state, brief, step: 'call' };
  const scored = scoreProspect(next);
  next.prospect = scored.prospect;
  next.prospect_reason = scored.prospect_reason;
  return next;
}

export function briefAcknowledgement(_text = ''): string {
  return 'Thank you for sharing this. That gives us a clear starting point.';
}

export const SOFT_PITCH =
  'If you’d like, we can hop on a short call whenever you’re ready — just say the word.';

export function callOfferBody(ack = briefAcknowledgement()): string {
  return `${ack}\n\n${CALL_QUESTION}`;
}

export function briefThankYou(service?: ServiceKey): string {
  return `${briefAcknowledgement()}\n\n${techantumValuePitch(service)}`;
}

export function withSoftPitch(reply: string): string {
  const text = (reply || '').trim();
  if (!text) return SOFT_PITCH;
  if (/hop on a short call|would you like our team to call|pick a convenient|scheduled a call|just say the word/i.test(text)) {
    return text;
  }
  return `${text}\n\n${SOFT_PITCH}`;
}

export function deferCommercialReply(): string {
  return 'Thank you for asking. Our team first understands the complete requirement, then suggests the right solution for your business. Could you share in 1–2 lines what you need?';
}

export interface QualificationTurn {
  handled: boolean;
  state: QualificationState;
  messages: { body: string; buttons?: InteractiveButton[]; list?: import('./appointment-slot').WhatsAppList }[];
  lead_stage: LeadStage;
  intent: string;
}

export function advanceQualification(
  current: QualificationState,
  input: { id?: string | null; text?: string | null }
): QualificationTurn {
  let state = { ...current };
  const text = (input.text || '').trim();
  let choiceId = resolveChoiceId(state.step, input);

  if (!choiceId && state.step === 'service' && !state.service) {
    const detected = detectServiceFromText(text);
    if (detected) {
      choiceId =
        detected === 'WEBSITE' ? 'svc_website' : detected === 'WEB_APPLICATION' ? 'svc_webapp' : 'svc_mobile';
    }
  }

  if (!choiceId) {
    const prompt = nextQuestion(state);
    return {
      handled: true,
      state,
      messages: [
        {
          body: prompt.body || 'Please tap one option below.',
          buttons: prompt.buttons || undefined,
        },
      ],
      lead_stage: scoreProspect(state).lead_stage,
      intent: state.service || 'GREETING',
    };
  }

  state = applyChoice(state, choiceId);
  if (choiceId.startsWith('svc_')) state.step = 'purpose';
  else if (choiceId.startsWith('purpose_')) state.step = state.purpose === 'explore' ? 'done' : 'brief';
  else if (choiceId === 'call_later') state.step = 'done';
  else if (choiceId === 'call_yes') {
    const slot = parseAppointmentSlot(text);
    if (slot) {
      state.preferred_slot = slot.label;
      state.step = 'done';
    } else {
      state.step = 'slot';
    }
  }

  const scored = scoreProspect(state);
  state.prospect = scored.prospect;
  state.prospect_reason = scored.prospect_reason;

  const messages: QualificationTurn['messages'] = [];
  if (choiceId.startsWith('svc_') && state.service) {
    messages.push({ body: serviceIntro(state.service) });
  }

  if (state.step === 'brief' && state.service) {
    messages.push({ body: briefPrompt(state.service) });
  } else if (choiceId === 'purpose_explore') {
    messages.push({
      body: `${techantumValuePitch(state.service)}\n\nNo rush. Ask me anything about how we work. When you have a live requirement, we can go deeper.`,
    });
  } else if (choiceId === 'call_yes') {
    const slot = parseAppointmentSlot(text);
    if (slot) {
      messages.push({ body: confirmAppointmentReply(slot) });
    } else {
      const picker = upcomingSlotPicker();
      messages.push({ body: picker.body, buttons: picker.buttons, list: picker.list });
    }
  } else if (choiceId === 'call_later') {
    messages.push({
      body: 'No problem. You can message here anytime. When you are ready, our team will be happy to understand your requirement and help with the right solution.',
    });
  } else {
    const prompt = nextQuestion(state);
    if (prompt.body) messages.push({ body: prompt.body, buttons: prompt.buttons || undefined });
  }

  return {
    handled: true,
    state,
    messages,
    lead_stage: scored.lead_stage,
    intent: state.service || 'GENERAL_ENQUIRY',
  };
}

export function qualificationFacts(q: QualificationState): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  if (q.prospect && q.prospect !== 'UNKNOWN') rows.push({ label: 'Prospect', value: PROSPECT_LABEL[q.prospect] });
  if (q.prospect_reason) rows.push({ label: 'Why', value: q.prospect_reason });
  if (q.service) rows.push({ label: 'Service', value: serviceLabel(q.service) });
  if (q.purpose) rows.push({ label: 'Requirement', value: PURPOSE_LABEL[q.purpose] || q.purpose });
  if (q.brief) rows.push({ label: 'What they want', value: q.brief });
  if (q.preferred_slot) rows.push({ label: 'Call', value: `Scheduled — ${q.preferred_slot}` });
  else if (q.step === 'slot') rows.push({ label: 'Call', value: 'Waiting for a convenient time' });
  else if (q.call_requested === true) rows.push({ label: 'Call', value: 'Requested — team should call' });
  if (q.call_requested === false) rows.push({ label: 'Call', value: 'They will message later' });
  return rows;
}

export function inboxHeadline(q: QualificationState): string {
  return [
    q.brief,
    q.preferred_slot ? `Call ${q.preferred_slot}` : q.step === 'slot' ? 'Need call time' : q.call_requested === true ? 'Call requested' : q.call_requested === false ? 'Will message later' : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

export function formatQualificationSummary(input: {
  name?: string | null;
  phone?: string | null;
  qualification: QualificationState;
}): string {
  const q = input.qualification;
  const facts = qualificationFacts(q);
  if (facts.length) return facts.map((row) => `${row.label}: ${row.value}`).join('\n');
  return 'Chat started. Waiting for them to choose a service.';
}

const CHOICE_ONLY =
  /^(website|web application|mobile application|i have a requirement|new project|update existing|just checking|just exploring|please call me|book a call|not now|i['’]ll message later)$/i;
const SKIP_STORY_LINE =
  /^(?:hi+|hii+|he+y+|hello+|ok+|okay|sure|thanks|thank you|thankyou|noted|fine|alright|haan+|han|ji|yes|hmm+|cool|great)[\s.!?,🙏]*$/i;

function customerLines(messages: { sender_type?: string; text_content?: string | null }[]): string[] {
  return messages
    .filter((m) => m.sender_type === 'CUSTOMER' && m.text_content)
    .map((m) =>
      (m.text_content || '')
        .replace(/\n\[[^\]]+\]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    )
    .filter(Boolean);
}

export function formatConversationStory(
  q: QualificationState,
  messages: { sender_type?: string; text_content?: string | null }[] = []
): string {
  const texts = customerLines(messages);
  const extras = texts.filter(
    (t) =>
      !CHOICE_ONLY.test(t) &&
      !SKIP_STORY_LINE.test(t) &&
      !/hello! i would like to inquire about/i.test(t) &&
      !/welcome back\.?\s+i wanted to continue/i.test(t) &&
      t.toLowerCase() !== (q.brief || '').trim().toLowerCase()
  );

  const lines: string[] = [];
  if (extras[0]) lines.push(`Opened with: ${extras[0].slice(0, 240)}`);
  if (q.service) lines.push(`Chose ${serviceLabel(q.service)}.`);
  if (q.purpose === 'new') lines.push('Confirmed they have a requirement to take up.');
  if (q.purpose === 'existing') lines.push('Want to update an existing system.');
  if (q.purpose === 'explore') lines.push('Said they are just checking for now.');
  if (q.brief) lines.push(`Requirement in their words: ${q.brief}`);
  extras.slice(1).forEach((t) => {
    if (t.length > 12) lines.push(`Also said: ${t.slice(0, 240)}`);
  });
  if (q.call_requested === true && q.preferred_slot) lines.push(`Scheduled a call for ${q.preferred_slot}.`);
  else if (q.step === 'slot') lines.push('Asked for a convenient call time.');
  else if (q.call_requested === true) lines.push('Asked our team to call and discuss personally.');
  else if (q.call_requested === false) lines.push('Preferred to message later instead of a call.');
  else if (q.step === 'call') lines.push('Waiting for them to confirm a call.');
  else if (q.step === 'brief') lines.push('Waiting for a short requirement brief.');
  else if (q.step === 'purpose') lines.push('Waiting to know if they have a live requirement.');
  else if (!q.service) lines.push('Waiting for them to choose website, web application or mobile application.');

  return lines.join('\n') || 'Chat started. Details will appear as the conversation continues.';
}

export function sanitizeNarrative(text: string): string {
  const seen = new Set<string>();
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return false;
      if (/^(contact|session|intent|stage|handoff|prospect|why|service|requirement|brief|call|what they want)\s*:/i.test(line)) return false;
      if (/^latest customer message\s*:/i.test(line)) return false;
      const key = line.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join('\n');
}

export function composeConversationSummary(input: {
  qualification: QualificationState;
  messages?: { sender_type?: string; text_content?: string | null }[];
  narrative?: string | null;
}): string {
  const facts = formatQualificationSummary({ qualification: input.qualification });
  const cleaned = sanitizeNarrative(input.narrative || '');
  const looksLikeDump = /^(contact|session|intent|stage)\s*:/im.test(cleaned) || /latest customer message/i.test(cleaned);
  const story =
    cleaned && !looksLikeDump ? cleaned : formatConversationStory(input.qualification, input.messages || []);
  return `${facts}\n\nWhat happened\n${story}`;
}

export function extractedFromQualification(q: QualificationState) {
  return {
    service: q.service ? SERVICE_LABEL[q.service] : null,
    project_type: q.purpose ? PURPOSE_LABEL[q.purpose] || q.purpose : null,
    timeline: null,
    budget: null,
    requirement: q.brief || (q.service ? `${SERVICE_LABEL[q.service]} enquiry` : null),
  };
}

export function looksLikeCallRequest(text: string): boolean {
  return /\b(call me|please call|book (a )?call|arrange (a )?call|schedule (a )?(call|appointment|meeting)|can you call|give me a call|phone me|ring me|expect the call|convenient time)\b/i.test(
    text
  );
}

export function wantsAppointmentBooking(text: string): boolean {
  const t = text.replace(/\s+/g, ' ').trim();
  if (!t) return false;
  if (looksLikeCallRequest(t)) return true;
  return /\b(book (a |an )?(call|appointment|slot|meeting)|schedule (a |an )?(call|appointment|meeting)|fix (a |an )?(call|appointment)|set up (a )?(call|meeting)|make (an |a )?appointment)\b/i.test(
    t
  );
}

export function lastAiOfferedCall(lastAi: string): boolean {
  return /solution expert|hop on a short call|book a short appointment|shall i\?|would you like our team to call|book a call|pick a time below/i.test(
    lastAi || ''
  );
}

export function acceptsOfferedCall(text: string, lastAi: string): boolean {
  if (!lastAiOfferedCall(lastAi)) return false;
  const t = text.replace(/\s+/g, ' ').trim();
  if (!t) return false;
  if (wantsAppointmentBooking(t)) return true;
  return /^(yes|yeah|yep|yup|ok|okay|sure|please|book it|go ahead|haan|han|ji)[\s!.]*$/i.test(t);
}

export function extractCallWhen(text: string): string | null {
  return parseAppointmentSlot(text)?.label || null;
}

export function confirmCallArrangement(text: string): string {
  const slot = matchAvailableSlot(text);
  if (slot) return confirmAppointmentReply(slot);
  return upcomingSlotPicker().body;
}

export function captureCallSlot(state: QualificationState, text: string, parsed?: ParsedSlot | null): QualificationState {
  const fromParse = parsed?.label ? parsed : parseAppointmentSlot(text);
  if (fromParse?.scheduledAt && !isSlotBookable(fromParse)) {
    return {
      ...state,
      step: 'slot',
      call_requested: true,
      preferred_slot: undefined,
      preferred_slot_at: undefined,
    };
  }
  const label = (parsed?.label || fromParse?.label || text).replace(/\s+/g, ' ').trim().slice(0, 160);
  return {
    ...state,
    preferred_slot: label,
    preferred_slot_at: parsed?.scheduledAt
      ? parsed.scheduledAt.toISOString()
      : fromParse?.scheduledAt
        ? fromParse.scheduledAt.toISOString()
        : state.preferred_slot_at,
    call_requested: true,
    step: 'done',
    slot_date: undefined,
    slot_window: undefined,
  };
}

export function humanContinueReply(q: QualificationState, customerText = ''): string {
  const cleaned = customerText.replace(BROKEN_GENERIC, '').replace(/\s+/g, ' ').trim();
  if (wantsAppointmentBooking(cleaned)) return confirmCallArrangement(cleaned);
  if (q.step === 'slot') {
    if (isAcknowledgement(cleaned)) return upcomingSlotPicker().body;
    return `Sure, I am here. Ask me anything you like. ${SOFT_PITCH}`;
  }
  if (q.call_requested && q.preferred_slot) {
    if (isScheduledSlotPast(q)) {
      return 'The earlier call time has passed. I can help you pick a new time if you’d like, or we can continue here.';
    }
    return `Thank you. Your call is scheduled for ${q.preferred_slot}. Our team will speak with you then.`;
  }
  if (q.call_requested) {
    return `Happy to book a time whenever you’re ready. What would you like to know in the meantime?`;
  }
  if (q.step === 'done') {
    return 'I still have what you shared. Ask me anything about it, or say if you would like me to book a time with our solution expert.';
  }
  if (q.step === 'brief' && q.service) return briefPrompt(q.service);
  if (q.step === 'call' || (q.service && cleaned)) {
    return `I am still with you on this. ${SOFT_PITCH}`;
  }
  if (q.service) {
    return `Sure, I am here. ${briefPrompt(q.service)}`;
  }
  return SERVICE_QUESTION;
}

export function closingReply(q: QualificationState): string {
  if (q.preferred_slot) {
    return `Thank you. Your call is scheduled for ${q.preferred_slot}. Our team will speak with you then.`;
  }
  if (q.call_requested) {
    return 'Thank you. Our team will call you to understand this fully and take it forward.';
  }
  return 'Hi, I am here. How can I help you?';
}

/** After a call is booked, a simple Ok/thanks gets one short closer — never a different time. */
export function ackAfterDoneReply(q: QualificationState, lastAi: string): string | null {
  if (q.call_requested !== true || q.step !== 'done') return null;
  if (/scheduled a call|i have booked|scheduled for|look forward to speaking/i.test(lastAi || '')) {
    return 'Thank you. We look forward to speaking with you at the scheduled time.';
  }
  const closer = closingReply(q);
  if (isRepeatReply(lastAi, closer) || isIdleCloser(lastAi)) return null;
  return closer;
}

export function isConversationClosed(q: QualificationState): boolean {
  return q.call_requested === true && q.step === 'done';
}

export function isIdleCloser(text: string | null | undefined): boolean {
  const t = (text || '').replace(/\s+/g, ' ').trim().toLowerCase();
  if (!t) return false;
  return /you can message (us )?here anytime/.test(t) || /^sure\.?$/.test(t);
}

export function isRepeatReply(previous: string | null | undefined, next: string): boolean {
  const a = (previous || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const b = (next || '').replace(/\s+/g, ' ').trim().toLowerCase();
  if (!a || !b) return false;
  if (a === b) return true;
  const askedCall = (text: string) =>
    /shall i ask (our team |someone )?to call|would you like our team to call/i.test(text);
  const confirmedCall = (text: string) =>
    /someone will call you|team will call you|shared this with our team|scheduled a call/i.test(text);
  const askedSlot = (text: string) =>
    /what time works for a call|when should our team call you|pick a convenient time|last slot is 7:00|select a date|available time/i.test(
      text
    );
  if (askedCall(a) && askedCall(b)) return true;
  if (askedSlot(a) && askedSlot(b) && a.slice(0, 90) === b.slice(0, 90)) return true;
  if (confirmedCall(a) && askedCall(b)) return true;
  if (confirmedCall(a) && confirmedCall(b)) return a === b;
  if (isIdleCloser(a) && isIdleCloser(b)) return true;
  return false;
}

export function stripBrokenGeneric(text: string): string {
  return text.replace(BROKEN_GENERIC, '').replace(/\n{3,}/g, '\n\n').trim();
}
