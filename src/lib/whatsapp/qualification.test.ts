import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  SERVICE_QUESTION,
  advanceQualification,
  ackAfterDoneReply,
  captureBrief,
  composeConversationSummary,
  detectServiceFromText,
  emptyQualification,
  formatConversationStory,
  confirmCallArrangement,
  extractCallWhen,
  formatQualificationSummary,
  humanContinueReply,
  inboxHeadline,
  isConversationClosed,
  isGuidedChoice,
  isRepeatReply,
  looksLikeCallRequest,
  wantsAppointmentBooking,
  acceptsOfferedCall,
  briefThankYou,
  qualificationFacts,
  sanitizeNarrative,
  scoreProspect,
  briefAcknowledgement,
} from './qualification.ts';

describe('WhatsApp qualification flow', () => {
  it('detects service from free text', () => {
    assert.equal(detectServiceFromText('I need a website for my school'), 'WEBSITE');
    assert.equal(detectServiceFromText('We want a web application dashboard'), 'WEB_APPLICATION');
    assert.equal(detectServiceFromText('Can you build an Android mobile app?'), 'MOBILE_APPLICATION');
  });

  it('treats button taps and short replies as guided choices, not long questions', () => {
    assert.equal(isGuidedChoice('service', { id: 'svc_website', text: 'Website' }), true);
    assert.equal(isGuidedChoice('service', { text: 'Website' }), true);
    assert.equal(isGuidedChoice('service', { text: 'What does a Launch website include for a school?' }), false);
    assert.equal(isGuidedChoice('brief', { text: 'know more about my services' }), false);
  });

  it('moves from welcome service buttons into a short requirement brief', () => {
    const first = advanceQualification(emptyQualification(), { id: 'svc_website', text: 'Website' });
    assert.equal(first.state.service, 'WEBSITE');
    assert.equal(first.state.step, 'purpose');
    assert.match(first.messages[0].body, /website/i);
    assert.ok(first.messages.some((m) => m.buttons?.some((b) => b.id === 'purpose_new')));

    const second = advanceQualification(first.state, { id: 'purpose_new', text: 'I have a requirement' });
    assert.equal(second.state.purpose, 'new');
    assert.equal(second.state.step, 'brief');
    assert.match(second.messages.map((m) => m.body).join(' '), /1–2 lines|1-2 lines/i);
  });

  it('marks a short requirement brief as a prospect without asking budget', () => {
    let state = emptyQualification();
    state = advanceQualification(state, { id: 'svc_webapp' }).state;
    state = advanceQualification(state, { id: 'purpose_new' }).state;
    const next = captureBrief(state, 'I want clients to know more about my services');
    assert.equal(next.step, 'call');
    assert.equal(next.prospect, 'PROSPECT');
    const summary = formatQualificationSummary({ name: 'Rahul', phone: '919999999999', qualification: next });
    assert.match(summary, /Prospect: Yes/);
    assert.match(summary, /know more about my services/);
    assert.doesNotMatch(summary, /Budget/);
    const ack = briefAcknowledgement('I want clients to know more about my services');
    assert.doesNotMatch(ack, /I want clients to know more about my services/i);
    assert.doesNotMatch(ack, /pric/i);
    assert.match(ack, /thank you for sharing/i);
    assert.match(briefThankYou('WEBSITE'), /solution-focused|template/i);
  });

  it('marks just-checking chats as nurture, not a hard no', () => {
    const scored = scoreProspect({
      step: 'done',
      service: 'WEBSITE',
      purpose: 'explore',
      prospect: 'UNKNOWN',
      prospect_reason: '',
    });
    assert.equal(scored.prospect, 'NURTURE');
    assert.equal(SERVICE_QUESTION.includes('website'), true);
  });

  it('treats Ok as accepting the call, then never asks the call question again', () => {
    assert.equal(isGuidedChoice('call', { text: 'Ok' }), true);
    assert.equal(isGuidedChoice('call', { text: 'okay' }), true);

    let state = emptyQualification();
    state = advanceQualification(state, { id: 'svc_website' }).state;
    state = advanceQualification(state, { id: 'purpose_new' }).state;
    state = captureBrief(state, 'Website so clients know my services');
    const accepted = advanceQualification(state, { id: 'call_yes', text: 'Please call me' });
    assert.equal(accepted.state.step, 'slot');
    assert.equal(accepted.state.call_requested, true);
    assert.match(accepted.messages[0].body, /pick a time/i);
    assert.ok(accepted.messages[0].list?.sections?.some((section) => section.rows.some((row) => row.id.startsWith('time_'))));
    assert.doesNotMatch(accepted.messages[0].body, /pric/i);

    const followUp = humanContinueReply(accepted.state, 'Ok');
    assert.match(followUp, /pick a time/i);

    const questionWhileSlot = humanContinueReply(accepted.state, 'How long does a website take?');
    assert.doesNotMatch(questionWhileSlot, /today|tomorrow|another date/i);
    assert.match(questionWhileSlot, /ask me anything|short call/i);

    const lastAi =
      'Thank you. I have scheduled a call tomorrow at 11:00 am. Our team will call you then to understand your requirement fully.';
    const repeated =
      'Thank you for sharing this. Our team will review it and speak with you. Would you like our team to call you?';
    assert.equal(isRepeatReply(lastAi, repeated), true);
    assert.equal(isRepeatReply(lastAi, lastAi), true);

    const afterOk = ackAfterDoneReply(accepted.state, lastAi);
    assert.equal(afterOk, null);
    assert.equal(ackAfterDoneReply(accepted.state, 'Sure.'), null);
  });

  it('confirms a requested call time and does not loop the later-message closer', () => {
    assert.equal(looksLikeCallRequest('Ok please call me'), true);
    assert.equal(looksLikeCallRequest('When can I expect the call'), true);
    assert.equal(looksLikeCallRequest('When can I expect'), false);
    assert.equal(wantsAppointmentBooking('Please book an appointment'), true);
    assert.equal(wantsAppointmentBooking('Book a call'), true);
    assert.equal(wantsAppointmentBooking('Book an appointment'), true);
    assert.equal(
      acceptsOfferedCall(
        'Yes',
        'If it helps, I can book a short appointment with our solution expert to understand your requirement in detail. Shall I?'
      ),
      true
    );
    assert.equal(
      acceptsOfferedCall('Yes', 'No problem. You can message here anytime.'),
      false
    );
    assert.match(briefThankYou('WEBSITE'), /solution-focused|template/i);
    assert.doesNotMatch(briefThankYou('WEBSITE'), /Would you like our team to call you/i);
    assert.equal(looksLikeCallRequest('Can you arrange call after 10mins'), true);
    assert.equal(extractCallWhen('Can you arrange call after 10mins'), 'in 10 minutes');
    assert.match(confirmCallArrangement('Can you arrange call after 10mins'), /pick a time/i);
    assert.match(confirmCallArrangement('tomorrow 11 am'), /booked|solution expert/i);

    const later = {
      ...emptyQualification(),
      service: 'WEBSITE' as const,
      step: 'done' as const,
      call_requested: false,
      prospect: 'PROSPECT' as const,
      prospect_reason: 'live requirement',
    };
    assert.equal(isConversationClosed(later), false);
    const reengage = humanContinueReply(later, 'Hi');
    assert.doesNotMatch(reengage, /message us here anytime/i);
    assert.match(reengage, /shared|expert|requirement/i);
    assert.equal(
      isRepeatReply('Sure. You can message us here anytime.', 'Sure. You can message us here anytime.'),
      true
    );
    assert.equal(isRepeatReply('Sure. You can message us here anytime.', 'Sure.'), true);
  });

  it('builds a conversation recap without repeating contact, session or intent', () => {
    let state = emptyQualification();
    state = advanceQualification(state, { id: 'svc_website' }).state;
    state = advanceQualification(state, { id: 'purpose_new' }).state;
    state = captureBrief(state, 'Showcase my products');
    state = advanceQualification(state, { id: 'call_yes' }).state;

    const messages = [
      { sender_type: 'CUSTOMER', text_content: 'Hello! I would like to inquire about Techantum Solutions IT services.' },
      { sender_type: 'CUSTOMER', text_content: 'Website' },
      { sender_type: 'CUSTOMER', text_content: 'I have a requirement' },
      { sender_type: 'CUSTOMER', text_content: 'Showcase my products' },
      { sender_type: 'CUSTOMER', text_content: 'Please call me' },
      { sender_type: 'CUSTOMER', text_content: 'Ok' },
    ];

    const facts = qualificationFacts(state);
    assert.ok(facts.some((row) => row.label === 'What they want' && /showcase my products/i.test(row.value)));
    assert.ok(!facts.some((row) => row.label === 'Contact'));
    assert.equal(inboxHeadline(state), 'Showcase my products · Need call time');

    const story = formatConversationStory(state, messages);
    assert.doesNotMatch(story, /inquire about Techantum/i);
    assert.match(story, /Website/);
    assert.match(story, /Showcase my products/);
    assert.match(story, /call/i);
    assert.doesNotMatch(story, /Session:/);
    assert.doesNotMatch(story, /Intent:/);
    assert.doesNotMatch(story, /Stage:/);

    const dumped =
      'Contact: Raj (+917997140064)\nSession: ongoing\nLatest customer message: Hello!\nIntent: OTHER\nService: Website\nStage: QUALIFIED\nContact: Raj (+917997140064)\nSession: ongoing';
    const cleaned = sanitizeNarrative(dumped);
    assert.doesNotMatch(cleaned, /Contact:/);
    assert.doesNotMatch(cleaned, /Session:/);
    assert.doesNotMatch(cleaned, /Intent:/);

    const composed = composeConversationSummary({ qualification: state, messages, narrative: dumped });
    assert.match(composed, /What happened/);
    assert.equal(composed.split('Contact:').length, 1);
  });
});
