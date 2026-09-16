import { generateWhatsAppReply, summarizeConversation } from './ai';
import { getAISettings } from './knowledge';
import {
  applyExtractedData,
  applyHandoff,
  contactHasEarlierChat,
  findOrCreateContact,
  findOrCreateOpenConversation,
  getRecentMessages,
  isMessageProcessed,
  saveInboundMessage,
  saveOutboundMessage,
  updateConversationAfterAI,
  upsertLeadFromConversation,
} from './conversation';
import { markWhatsAppReadAndTyping, sendWhatsAppButtons, sendWhatsAppList, sendWhatsAppSessionText } from './meta';
import type { AIReplyStructured, InboundWhatsAppMessage, WhatsAppContact, WhatsAppConversation } from './types';
import {
  applyGreetingPrefix,
  buildGreetingOpening,
  buildGreetingReply,
  classifySession,
  isAcknowledgement,
  isCasualChat,
  casualChatReply,
  isGreetingOnly,
  isGreetingTurn,
  stripCustomerEcho,
  stripServiceQuestion,
  stripUnconfirmedFallback,
} from './greeting';
import {
  SERVICE_BUTTONS,
  SERVICE_QUESTION,
  advanceQualification,
  briefPrompt,
  briefThankYou,
  CALL_BUTTONS,
  EXPERT_CALL_QUESTION,
  captureBrief,
  captureCallSlot,
  ackAfterDoneReply,
  extractedFromQualification,
  composeConversationSummary,
  humanContinueReply,
  isGuidedChoice,
  isIdleCloser,
  isRepeatReply,
  looksLikeQuestion,
  nextQuestion,
  normalizeQualification,
  scoreProspect,
  stripBrokenGeneric,
  wantsAppointmentBooking,
  acceptsOfferedCall,
  lastAiOfferedCall,
  withSoftPitch,
  type InteractiveButton,
  type QualificationState,
} from './qualification';
import {
  confirmAppointmentReply,
  hasTodaySlots,
  interpretBookingRequest,
  isImmediateSlotText,
  isScheduledSlotPast,
  isSlotBookable,
  isVagueSlotText,
  looksLikeReschedule,
  looksLikeSlotAttempt,
  matchAvailableSlot,
  parseAppointmentSlot,
  parseTimeSlotId,
  resolveSlotDayChoice,
  resolveSlotWindowChoice,
  slotPickerForState,
  toIstYmd,
  withRescheduleIntro,
  type WhatsAppList,
} from './appointment-slot';
import { notifyAdminOfAppointment, upsertChatAppointment } from './appointments';
import { busyIntervals, calendarConfigured, slotIsFree } from './google-calendar';

export { parseInboundMessages, parseStatusUpdates } from './webhook-utils';

function structuredFromQualification(
  q: QualificationState,
  leadStage: string,
  text: string,
  intent: string
): AIReplyStructured {
  const extracted = extractedFromQualification(q);
  return {
    reply_text: text,
    intent,
    is_techantum_related: true,
    knowledge_sufficient: true,
    lead_stage: leadStage,
    handoff_required: false,
    handoff_reason: null,
    extracted_data: {
      name: null,
      company: null,
      email: null,
      location: null,
      service: extracted.service,
      project_type: extracted.project_type,
      requirement: extracted.requirement,
      budget: extracted.budget,
      timeline: extracted.timeline,
    },
  };
}

function lastAiText(messages: { sender_type?: string; text_content?: string | null }[]): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].sender_type === 'AI' || messages[i].sender_type === 'STAFF') {
      return messages[i].text_content || '';
    }
  }
  return '';
}

async function bookCallSlot(input: {
  contact: WhatsAppContact;
  conversation: WhatsAppConversation;
  qualification: QualificationState;
  text: string;
  slot?: ReturnType<typeof parseAppointmentSlot>;
}): Promise<QualificationState> {
  const slot = input.slot || matchAvailableSlot(input.text) ||
    (input.qualification.preferred_slot ? matchAvailableSlot(input.qualification.preferred_slot) : null);
  if (!slot || !isSlotBookable(slot)) {
    return {
      ...input.qualification,
      step: 'slot',
      call_requested: true,
    };
  }
  const next = captureCallSlot(input.qualification, slot.label, slot);
  try {
    const appointment = await upsertChatAppointment({
      contact: input.contact,
      conversation: input.conversation,
      qualification: next,
      slot,
    });
    next.appointment_id = appointment.id;
    await notifyAdminOfAppointment(appointment);
  } catch (err) {
    console.error('[whatsapp appointment] save failed', err instanceof Error ? err.message : err);
  }
  return next;
}

async function deliverOutbound(input: {
  phone: string;
  conversationId: string;
  contactId: string;
  body: string;
  buttons?: InteractiveButton[];
  list?: WhatsAppList;
  recentMessages?: { sender_type?: string; text_content?: string | null }[];
  force?: boolean;
  sentRef?: { value: boolean };
}) {
  const savedText = input.list?.sections?.length
    ? `${input.body}\n${input.list.sections.flatMap((section) => section.rows.map((row) => `[${row.title}]`)).join(' ')}`
    : input.buttons?.length
      ? `${input.body}\n${input.buttons.map((button) => `[${button.title}]`).join(' ')}`
      : input.body;
  if (!input.body.trim() || (!input.force && isRepeatReply(lastAiText(input.recentMessages || []), savedText))) {
    return { ok: true, provider_message_id: null, error_message: null, skipped: true };
  }
  const sendResult = input.list?.sections?.length
    ? await sendWhatsAppList(input.phone, input.body, input.list)
    : input.buttons?.length
      ? await sendWhatsAppButtons(input.phone, input.body, input.buttons)
      : await sendWhatsAppSessionText(input.phone, input.body);
  if (!sendResult.ok) {
    console.error('[whatsapp webhook] send failed', sendResult.error_message);
  } else if (input.sentRef) {
    input.sentRef.value = true;
  }
  await saveOutboundMessage({
    conversationId: input.conversationId,
    contactId: input.contactId,
    text: savedText,
    senderType: 'AI',
    providerMessageId: sendResult.provider_message_id,
    aiGenerated: true,
  });
  return sendResult;
}

async function persistProgress(input: {
  contact: WhatsAppContact;
  conversation: WhatsAppConversation;
  reply: AIReplyStructured;
  qualification: QualificationState;
  settings: Awaited<ReturnType<typeof getAISettings>>;
  recentMessages: Awaited<ReturnType<typeof getRecentMessages>>;
  sessionKind: ReturnType<typeof classifySession>;
  responseId?: string | null;
}) {
  const summary = composeConversationSummary({
    qualification: input.qualification,
    messages: input.recentMessages,
  });
  await applyExtractedData(input.contact.id, input.conversation.id, input.reply.extracted_data);
  await updateConversationAfterAI(
    input.conversation.id,
    input.reply,
    input.responseId || null,
    summary,
    input.qualification
  );
  if (input.settings.auto_lead_creation) {
    await upsertLeadFromConversation({
      contact: input.contact,
      conversation: input.conversation,
      reply: input.reply,
      summary,
    });
  }
  if (input.reply.handoff_required && input.settings.auto_handoff) {
    await applyHandoff(input.conversation.id, input.reply.handoff_reason, input.settings.handoff_mode);
  }
  if (input.settings.auto_conversation_summary && (input.qualification.step === 'call' || input.qualification.step === 'slot' || input.qualification.step === 'done')) {
    void summarizeConversation(
      input.recentMessages,
      input.contact,
      input.reply,
      input.sessionKind,
      input.qualification
    )
      .then((aiSummary) =>
        updateConversationAfterAI(
          input.conversation.id,
          input.reply,
          input.responseId || null,
          composeConversationSummary({
            qualification: input.qualification,
            messages: input.recentMessages,
            narrative: aiSummary,
          }),
          input.qualification
        )
      )
      .catch(() => undefined);
  }
}

function lastAskedForTime(messages: { sender_type?: string; text_content?: string | null }[]) {
  return /convenient time|what time|when should our team call|pick a time|last slot is 7:00|today slots start|select a date|available time|solution expert will call you then/i.test(
    lastAiText(messages)
  );
}

type SendCtx = {
  phone: string;
  conversationId: string;
  contactId: string;
  recentMessages: { sender_type?: string; text_content?: string | null }[];
  sentRef?: { value: boolean };
};

async function sendSlotPicker(
  sendCtx: SendCtx,
  qualification: QualificationState,
  slotDate?: string | null,
  extra?: { reschedule?: boolean }
) {
  let picker = slotPickerForState({
    slotDate: slotDate ?? qualification.slot_date,
    slotWindow: qualification.slot_window,
  });
  if (extra?.reschedule) picker = withRescheduleIntro(picker);
  picker = await applyCalendarAvailability(picker, slotDate ?? qualification.slot_date);
  await deliverOutbound({
    ...sendCtx,
    body: picker.body,
    buttons: picker.buttons,
    list: picker.list,
  });
  return picker;
}

async function applyCalendarAvailability(picker: ReturnType<typeof slotPickerForState>, slotDate?: string | null) {
  if (!calendarConfigured()) return picker;
  const ids = [
    ...(picker.buttons || []).map((button) => button.id),
    ...(picker.list?.sections || []).flatMap((section) => section.rows.map((row) => row.id)),
  ];
  const timed = ids.map((id) => parseTimeSlotId(id)).filter((slot): slot is NonNullable<typeof slot> => Boolean(slot?.scheduledAt));
  let rangeStart: Date | null = null;
  let rangeEnd: Date | null = null;
  if (timed.length) {
    const starts = timed.map((slot) => slot.scheduledAt!.getTime());
    rangeStart = new Date(Math.min(...starts));
    rangeEnd = new Date(Math.max(...starts) + 30 * 60 * 1000);
  } else if (slotDate && /^\d{4}-\d{2}-\d{2}$/.test(slotDate)) {
    rangeStart = new Date(`${slotDate}T00:00:00+05:30`);
    rangeEnd = new Date(`${slotDate}T23:59:59+05:30`);
  }
  if (!rangeStart || !rangeEnd) return picker;
  const busy = await busyIntervals(rangeStart, rangeEnd);
  if (!busy.length) return picker;
  const free = (id?: string) => {
    if (!id || !id.startsWith('time_')) return true;
    const slot = parseTimeSlotId(id);
    return !slot?.scheduledAt || slotIsFree(slot.scheduledAt, busy);
  };
  if (picker.list?.sections?.length) {
    const sections = picker.list.sections.map((section) => ({
      ...section,
      rows: section.rows.filter((row) => free(row.id)),
    })).filter((section) => section.rows.length);
    if (!sections.length) {
      return {
        body: 'Those times are already booked on our calendar. Please pick another date.',
        buttons: picker.buttons,
      };
    }
    return { ...picker, list: { ...picker.list, sections } };
  }
  if (picker.buttons?.length) {
    const buttons = picker.buttons.filter((button) => !button.id.startsWith('time_') || free(button.id));
    if (buttons.length) return { ...picker, buttons };
  }
  return picker;
}

const KEEP_GOING_REPLY = 'I am here and I received your message. How can I help?';

function isBookingTurn(
  text: string,
  qualification: QualificationState,
  recentMessages: { sender_type?: string; text_content?: string | null }[],
  interactiveId: string
) {
  if (/^(time_|day_|date_|win_)/.test(interactiveId)) return true;
  if (wantsAppointmentBooking(text) || looksLikeReschedule(text) || acceptsOfferedCall(text, lastAiText(recentMessages))) {
    return true;
  }
  if (isGreetingOnly(text) || isCasualChat(text)) return false;
  const request = interpretBookingRequest(text);
  const concrete =
    Boolean(matchAvailableSlot(text)) ||
    Boolean(request.ymd) ||
    request.unavailableTomorrow ||
    isImmediateSlotText(text) ||
    looksLikeSlotAttempt(text);
  if (!concrete) return false;
  const timeInText = Boolean(matchAvailableSlot(text)) || /\b\d{1,2}(?::\d{2})?\s*(am|pm)\b/i.test(text);
  if (looksLikeQuestion(text) && !wantsAppointmentBooking(text) && !timeInText) return false;
  return lastAskedForTime(recentMessages) || qualification.step === 'slot';
}

export async function processInboundWhatsAppMessage(inbound: InboundWhatsAppMessage): Promise<void> {
  if (await isMessageProcessed(inbound.whatsapp_message_id)) return;

  void markWhatsAppReadAndTyping(inbound.whatsapp_message_id);

  const settings = await getAISettings();
  const contact = await findOrCreateContact({ phone: inbound.from, profileName: inbound.profile_name });
  const conversation = await findOrCreateOpenConversation(contact.id, settings.default_mode);

  await saveInboundMessage({
    conversationId: conversation.id,
    contactId: contact.id,
    inbound,
  });

  const customerText = inbound.text || '';
  const recentMessages = await getRecentMessages(conversation.id, 20);
  const hadPriorChat = await contactHasEarlierChat(contact.id, conversation.id);
  const sessionKind = classifySession(recentMessages, new Date(), { hadPriorChat });
  const qualification = normalizeQualification(conversation.qualification);
  void markWhatsAppReadAndTyping(inbound.whatsapp_message_id);

  const sentRef = { value: false };
  const sendCtx: SendCtx & { sentRef: { value: boolean } } = {
    phone: contact.phone_number,
    conversationId: conversation.id,
    contactId: contact.id,
    recentMessages,
    sentRef,
  };

  try {
  const persistBooked = async (next: QualificationState, body: string) => {
    const reply = structuredFromQualification(next, 'QUALIFIED', body, 'CALL_REQUEST');
    await persistProgress({ contact, conversation, reply, qualification: next, settings, recentMessages, sessionKind });
  };

  const persistWaiting = async (next: QualificationState, body: string) => {
    const reply = structuredFromQualification(next, 'QUALIFIED', body, 'CALL_REQUEST');
    await persistProgress({ contact, conversation, reply, qualification: next, settings, recentMessages, sessionKind });
  };

  const confirmSlot = async (slot: ReturnType<typeof parseAppointmentSlot>, fromText: string) => {
    if (!slot || !isSlotBookable(slot)) return false;
    const next = await bookCallSlot({ contact, conversation, qualification, text: fromText, slot });
    if (!next.preferred_slot) return false;
    const body = confirmAppointmentReply(slot);
    await deliverOutbound({ ...sendCtx, body });
    await persistBooked(next, body);
    return true;
  };

  const offerPicker = async (
    state: QualificationState,
    extra?: {
      slotDate?: string | null;
      slotWindow?: QualificationState['slot_window'];
      preface?: string;
      reschedule?: boolean;
    }
  ) => {
    const next = {
      ...state,
      step: 'slot' as const,
      call_requested: true as const,
      preferred_slot: extra?.reschedule ? undefined : state.preferred_slot,
      preferred_slot_at: extra?.reschedule ? undefined : state.preferred_slot_at,
      slot_date: extra && 'slotDate' in extra ? extra.slotDate || undefined : state.slot_date,
      slot_window: extra && 'slotWindow' in extra ? extra.slotWindow : state.slot_window,
    };
    if (extra?.preface && !extra.reschedule) await deliverOutbound({ ...sendCtx, body: extra.preface });
    const picker = await sendSlotPicker(sendCtx, next, next.slot_date, { reschedule: extra?.reschedule });
    await persistWaiting(next, picker.body);
  };

  const interactiveId = inbound.interactive_id || '';
  const timeFromId = parseTimeSlotId(interactiveId);
  if (timeFromId) {
    if (await confirmSlot(timeFromId, timeFromId.label)) return;
    await offerPicker(qualification, {
      slotDate: hasTodaySlots() ? toIstYmd(new Date(), 0) : undefined,
      slotWindow: undefined,
      reschedule: true,
    });
    return;
  }

  if (isCasualChat(customerText) && !inbound.interactive_id) {
    const body = `${casualChatReply(customerText)} How can I help you today?`;
    await deliverOutbound({ ...sendCtx, body });
    return;
  }

  const bookingTurn = isBookingTurn(customerText, qualification, recentMessages, interactiveId);
  const bookingRequest = interpretBookingRequest(customerText);

  const windowChoice = resolveSlotWindowChoice(
    /^(win_)/.test(interactiveId) ? interactiveId : '',
    bookingTurn ? customerText : ''
  );
  if (windowChoice) {
    const ymd =
      qualification.slot_date && /^\d{4}-\d{2}-\d{2}$/.test(qualification.slot_date)
        ? qualification.slot_date
        : toIstYmd(new Date(), hasTodaySlots() ? 0 : 1);
    await offerPicker(qualification, { slotDate: ymd, slotWindow: windowChoice });
    return;
  }

  const dayChoice = resolveSlotDayChoice(
    /^(day_|date_)/.test(interactiveId) ? interactiveId : '',
    bookingTurn ? customerText : ''
  );
  if (dayChoice) {
    if (dayChoice.kind === 'other') {
      await offerPicker(qualification, { slotDate: 'OTHER', slotWindow: undefined });
      return;
    }
    await offerPicker(qualification, { slotDate: dayChoice.ymd, slotWindow: undefined });
    return;
  }

  const matchedSlot = matchAvailableSlot(customerText);
  if (matchedSlot && bookingTurn && !isGreetingOnly(customerText) && !inbound.interactive_id) {
    if (await confirmSlot(matchedSlot, customerText)) return;
  }

  if (bookingTurn && bookingRequest.ymd && !inbound.interactive_id) {
    await offerPicker(qualification, {
      slotDate: bookingRequest.ymd,
      slotWindow: bookingRequest.window || undefined,
      preface: bookingRequest.unavailableTomorrow
        ? 'No problem. I will not keep tomorrow. Please pick a time on the date you shared.'
        : undefined,
    });
    return;
  }

  if (bookingTurn && bookingRequest.unavailableTomorrow && !inbound.interactive_id) {
    await offerPicker(qualification, {
      slotDate: 'OTHER',
      slotWindow: undefined,
      preface: 'No problem. I will not book tomorrow. Please pick another date.',
    });
    return;
  }

  if (
    bookingTurn &&
    !inbound.interactive_id &&
    (isImmediateSlotText(customerText) || isVagueSlotText(customerText) || looksLikeSlotAttempt(customerText))
  ) {
    const parsed = parseAppointmentSlot(customerText);
    const past = Boolean(parsed?.scheduledAt && parsed.scheduledAt.getTime() < Date.now() - 1000);
    await offerPicker(qualification, {
      slotDate: qualification.slot_date || (hasTodaySlots() ? toIstYmd(new Date(), 0) : undefined),
      slotWindow: bookingRequest.window || undefined,
      reschedule: past,
    });
    return;
  }

  if (
    (interactiveId === 'call_yes' ||
      wantsAppointmentBooking(customerText) ||
      acceptsOfferedCall(customerText, lastAiText(recentMessages))) &&
    interactiveId !== 'call_later'
  ) {
    const alreadyBooked =
      Boolean(qualification.preferred_slot) &&
      qualification.step === 'done' &&
      !looksLikeReschedule(customerText) &&
      !wantsAppointmentBooking(customerText) &&
      interactiveId !== 'call_yes';
    if (alreadyBooked) {
      if (isScheduledSlotPast(qualification)) {
        await offerPicker(qualification, { slotDate: undefined, slotWindow: undefined, reschedule: true });
        return;
      }
      await deliverOutbound({
        ...sendCtx,
        body: `Your call is still booked for ${qualification.preferred_slot}. Our team will speak with you then.`,
      });
      return;
    }
    await offerPicker(qualification, { slotDate: undefined, slotWindow: undefined });
    return;
  }

  if (qualification.step === 'slot' && isAcknowledgement(customerText) && lastAskedForTime(recentMessages)) {
    await offerPicker(qualification);
    return;
  }

  const shouldSkipAi =
    !settings.ai_enabled ||
    conversation.mode === 'HUMAN' ||
    !conversation.ai_enabled;

  if (shouldSkipAi) {
    console.warn('[whatsapp webhook] skipping AI reply', {
      ai_enabled: settings.ai_enabled,
      conversation_mode: conversation.mode,
      conversation_ai_enabled: conversation.ai_enabled,
    });
    if (conversation.mode === 'HUMAN' || conversation.handoff_required) {
      await applyHandoff(conversation.id, 'STAFF_MODE', settings.handoff_mode);
    }
    if (!isAcknowledgement(customerText) && customerText.trim()) {
      await deliverOutbound({
        ...sendCtx,
        body: 'Thank you. Our team has your message and will reply here shortly.',
        force: true,
      });
    }
    return;
  }

  if (
    qualification.call_requested === true &&
    qualification.step === 'done' &&
    isAcknowledgement(customerText) &&
    !inbound.interactive_id
  ) {
    const closer = ackAfterDoneReply(qualification, lastAiText(recentMessages));
    if (closer) await deliverOutbound({ ...sendCtx, body: closer });
    return;
  }

  const offerServiceButtons = async (welcome?: string) => {
    if (welcome) await deliverOutbound({ ...sendCtx, body: welcome });
    await deliverOutbound({ ...sendCtx, body: SERVICE_QUESTION, buttons: SERVICE_BUTTONS });
    const next = { ...qualification, step: 'service' as const };
    const reply = structuredFromQualification(next, 'NEW', SERVICE_QUESTION, 'GREETING');
    await persistProgress({
      contact,
      conversation,
      reply,
      qualification: next,
      settings,
      recentMessages,
      sessionKind,
    });
  };

  if (isGreetingTurn(customerText) && !inbound.interactive_id) {
    if (!qualification.service) {
      await offerServiceButtons(buildGreetingReply({ kind: sessionKind, contact }));
      return;
    }
    if (qualification.step === 'brief' && qualification.service) {
      await deliverOutbound({ ...sendCtx, body: briefPrompt(qualification.service) });
      return;
    }
    if (qualification.step === 'slot' || qualification.step === 'call') {
      const remembered = qualification.brief ? ` I still have your requirement: ${qualification.brief.slice(0, 120)}.` : '';
      await deliverOutbound({
        ...sendCtx,
        body: `Welcome back.${remembered} Ask me anything, or say if you would like me to show available call times.`,
      });
      return;
    }
    if (qualification.step === 'done') {
      const remembered = qualification.brief ? ` I still have your requirement: ${qualification.brief.slice(0, 120)}.` : '';
      const body =
        isScheduledSlotPast(qualification) && qualification.call_requested
          ? `Welcome back.${remembered} The earlier call time has passed. I can show new times if you like, or we can continue here.`
          : qualification.call_requested && qualification.preferred_slot
            ? `Welcome back. Your call is still on for ${qualification.preferred_slot}.${remembered} Anything else I can help with?`
            : `Welcome back.${remembered} Ask me anything, or say if you would like me to book a time with our solution expert.`;
      if (!isIdleCloser(body) || !isIdleCloser(lastAiText(recentMessages))) {
        await deliverOutbound({ ...sendCtx, body });
      }
      return;
    }
    if (qualification.step !== 'done') {
      const prompt = nextQuestion(qualification);
      await deliverOutbound({
        ...sendCtx,
        body: `Hi, I am here. ${prompt.body}`,
        buttons: prompt.buttons || undefined,
      });
    }
    return;
  }

  const hasChoice = isGuidedChoice(qualification.step, {
    id: inbound.interactive_id,
    text: customerText,
  });

  if (hasChoice) {
    const turn = advanceQualification(qualification, { id: inbound.interactive_id, text: customerText });
    let state = turn.state;
    if (state.preferred_slot) {
      state = await bookCallSlot({ contact, conversation, qualification: state, text: customerText });
    }
    for (const item of turn.messages) {
      await deliverOutbound({ ...sendCtx, body: item.body, buttons: item.buttons, list: item.list });
    }
    const reply = structuredFromQualification(
      state,
      turn.lead_stage,
      turn.messages.map((item) => item.body).join('\n\n'),
      turn.intent
    );
    await persistProgress({
      contact,
      conversation,
      reply,
      qualification: state,
      settings,
      recentMessages,
      sessionKind,
    });
    return;
  }

  if (
    qualification.service &&
    (qualification.step === 'brief' || qualification.step === 'purpose') &&
    customerText.trim() &&
    !isGreetingTurn(customerText) &&
    !isAcknowledgement(customerText)
  ) {
    if (looksLikeQuestion(customerText) && isCasualChat(customerText)) {
      await deliverOutbound({ ...sendCtx, body: `${casualChatReply(customerText)} How can I help you today?` });
      return;
    }
    if (looksLikeQuestion(customerText) || /price|budget|cost|quote|fee|charge/i.test(customerText)) {
      // Fall through to answer the question, then pitch a call softly.
    } else {
      const next = captureBrief(qualification, customerText);
      const scored = scoreProspect(next);
      next.prospect = scored.prospect;
      next.prospect_reason = scored.prospect_reason;
      const body = briefThankYou(next.service);
      await deliverOutbound({ ...sendCtx, body });
      await deliverOutbound({
        ...sendCtx,
        body: EXPERT_CALL_QUESTION,
        buttons: CALL_BUTTONS,
      });
      const reply = structuredFromQualification(
        next,
        scored.lead_stage,
        `${body}\n\n${EXPERT_CALL_QUESTION}`,
        next.service || 'GENERAL_ENQUIRY'
      );
      reply.extracted_data.requirement = customerText.trim().slice(0, 400);
      await persistProgress({
        contact,
        conversation,
        reply,
        qualification: next,
        settings,
        recentMessages,
        sessionKind,
      });
      return;
    }
  }

  if (qualification.step === 'brief' && qualification.service && isAcknowledgement(customerText)) {
    await deliverOutbound({ ...sendCtx, body: briefPrompt(qualification.service) });
    return;
  }

  const generated = await generateWhatsAppReply({
    customerMessage: customerText,
    contact,
    conversation: { ...conversation, qualification },
    recentMessages,
    settings,
  });
  let reply = generated.reply;
  const offeringMenu = !qualification.service && (sessionKind === 'fresh' || isGreetingTurn(customerText));
  const greeting = offeringMenu ? buildGreetingOpening({ kind: sessionKind, contact }) : '';
  reply.reply_text = applyGreetingPrefix(stripUnconfirmedFallback(stripBrokenGeneric(reply.reply_text)), greeting);
  reply.reply_text = stripServiceQuestion(stripBrokenGeneric(reply.reply_text));
  if (!offeringMenu) {
    reply.reply_text = reply.reply_text || humanContinueReply(qualification, customerText);
  }
  reply.reply_text = stripCustomerEcho(reply.reply_text, customerText);
  if (qualification.call_requested && isAcknowledgement(customerText)) {
    reply.reply_text = ackAfterDoneReply(qualification, lastAiText(recentMessages)) || reply.reply_text;
  }
  if (isIdleCloser(reply.reply_text) && (isIdleCloser(lastAiText(recentMessages)) || !isAcknowledgement(customerText))) {
    reply.reply_text = humanContinueReply(qualification, customerText);
    if (isIdleCloser(reply.reply_text) && isIdleCloser(lastAiText(recentMessages))) {
      reply.reply_text = '';
    }
  }
  if (
    looksLikeQuestion(customerText) &&
    !wantsAppointmentBooking(customerText) &&
    !qualification.preferred_slot &&
    (qualification.step === 'call' || qualification.step === 'done') &&
    reply.reply_text
  ) {
    reply.reply_text = withSoftPitch(reply.reply_text);
  }
  if (qualification.service) {
    reply.extracted_data = {
      ...reply.extracted_data,
      ...extractedFromQualification(qualification),
      requirement: reply.extracted_data.requirement || extractedFromQualification(qualification).requirement,
    };
    if (qualification.prospect === 'PROSPECT') reply.lead_stage = 'QUALIFIED';
  }

  if (offeringMenu) {
    const welcome = stripServiceQuestion(reply.reply_text) || greeting;
    if (welcome) await deliverOutbound({ ...sendCtx, body: welcome });
    await deliverOutbound({ ...sendCtx, body: SERVICE_QUESTION, buttons: SERVICE_BUTTONS });
  } else {
    if (!reply.reply_text.trim() || isRepeatReply(lastAiText(recentMessages), reply.reply_text)) {
      if (qualification.step === 'slot' || lastAiOfferedCall(lastAiText(recentMessages))) {
        await offerPicker(qualification, { slotDate: undefined, slotWindow: undefined });
        return;
      }
      const continued = humanContinueReply(qualification, customerText);
      await deliverOutbound({ ...sendCtx, body: continued || KEEP_GOING_REPLY, force: true });
      return;
    }
    await deliverOutbound({ ...sendCtx, body: reply.reply_text, force: true });
  }

  const summary = composeConversationSummary({
    qualification,
    messages: recentMessages,
  });

  await applyExtractedData(contact.id, conversation.id, reply.extracted_data);
  await updateConversationAfterAI(conversation.id, reply, generated.responseId, summary, qualification);

  if (settings.auto_lead_creation) {
    await upsertLeadFromConversation({ contact, conversation, reply, summary });
  }
  if (reply.handoff_required && settings.auto_handoff) {
    await applyHandoff(conversation.id, reply.handoff_reason, settings.handoff_mode);
  }
  if (settings.auto_conversation_summary) {
    void summarizeConversation(recentMessages, contact, reply, sessionKind, qualification)
      .then((aiSummary) =>
        updateConversationAfterAI(
          conversation.id,
          reply,
          generated.responseId,
          composeConversationSummary({
            qualification,
            messages: recentMessages,
            narrative: aiSummary,
          }),
          qualification
        )
      )
      .catch(() => undefined);
  }
  } catch (err) {
    console.error('[whatsapp webhook] inbound handler failed', err instanceof Error ? err.message : err);
  } finally {
    if (!sentRef.value && customerText.trim() && !isAcknowledgement(customerText)) {
      await deliverOutbound({ ...sendCtx, body: KEEP_GOING_REPLY, force: true }).catch(() => undefined);
    }
  }
}
