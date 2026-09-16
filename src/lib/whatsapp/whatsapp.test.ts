import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import crypto from 'node:crypto';
import { parseInboundMessages, verifyWebhookSignature } from './webhook-utils.ts';
import { applyGreetingPrefix, buildGreetingOpening, buildGreetingReply, casualChatReply, classifySession, getTimeOfDayGreeting, isAcknowledgement, isCasualChat, isGreetingOnly, isGreetingTurn, isWebsiteWidgetOpener, stripCustomerEcho, stripServiceQuestion, stripUnconfirmedFallback } from './greeting.ts';
import { serviceDivisions } from '../service-packages-data.ts';
import type { WhatsAppMessage } from './types.ts';

describe('verifyWebhookSignature', () => {
  it('allows when app secret is not configured', () => {
    assert.equal(verifyWebhookSignature('{}', null, undefined), true);
  });

  it('validates sha256 signature when secret is configured', () => {
    const body = '{"hello":"world"}';
    const digest = crypto.createHmac('sha256', 'test-secret').update(body, 'utf8').digest('hex');
    assert.equal(verifyWebhookSignature(body, `sha256=${digest}`, 'test-secret'), true);
    assert.equal(verifyWebhookSignature(body, 'sha256=deadbeef', 'test-secret'), false);
  });
});

describe('parseInboundMessages', () => {
  it('extracts text messages from Meta webhook payload', () => {
    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                contacts: [{ wa_id: '919999999999', profile: { name: 'Rahul' } }],
                messages: [
                  {
                    from: '919999999999',
                    id: 'wamid.TEST123',
                    timestamp: '1710000000',
                    type: 'text',
                    text: { body: 'Hi, I need a website.' },
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    const rows = parseInboundMessages(payload);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].whatsapp_message_id, 'wamid.TEST123');
    assert.equal(rows[0].text, 'Hi, I need a website.');
    assert.equal(rows[0].profile_name, 'Rahul');
  });

  it('extracts WhatsApp button replies', () => {
    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                contacts: [{ wa_id: '919999999999', profile: { name: 'Rahul' } }],
                messages: [
                  {
                    from: '919999999999',
                    id: 'wamid.BTN1',
                    timestamp: '1710000000',
                    type: 'interactive',
                    interactive: {
                      type: 'button_reply',
                      button_reply: { id: 'svc_website', title: 'Website' },
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    const rows = parseInboundMessages(payload);
    assert.equal(rows[0].text, 'Website');
    assert.equal(rows[0].interactive_id, 'svc_website');
  });
});

describe('time-based greeting and session detection', () => {
  it('uses India time of day', () => {
    assert.equal(getTimeOfDayGreeting(new Date('2026-08-20T03:30:00.000Z')), 'Good morning');
    assert.equal(getTimeOfDayGreeting(new Date('2026-08-20T07:30:00.000Z')), 'Good afternoon');
    assert.equal(getTimeOfDayGreeting(new Date('2026-08-20T12:30:00.000Z')), 'Good evening');
  });

  it('treats no outbound messages as a fresh conversation', () => {
    const inbound = [{ sender_type: 'CUSTOMER', created_at: '2026-08-20T10:00:00.000Z' }] as WhatsAppMessage[];
    assert.equal(classifySession(inbound, new Date('2026-08-20T10:01:00.000Z')), 'fresh');
  });

  it('welcomes returning chats after a gap and continues ongoing chats', () => {
    const returning = [
      { sender_type: 'AI', created_at: '2026-08-19T10:00:00.000Z' },
      { sender_type: 'CUSTOMER', created_at: '2026-08-20T10:00:00.000Z' },
    ] as WhatsAppMessage[];
    assert.equal(classifySession(returning, new Date('2026-08-20T10:01:00.000Z')), 'returning');

    const ongoing = [
      { sender_type: 'AI', created_at: '2026-08-20T09:40:00.000Z' },
      { sender_type: 'CUSTOMER', created_at: '2026-08-20T10:00:00.000Z' },
    ] as WhatsAppMessage[];
    assert.equal(classifySession(ongoing, new Date('2026-08-20T10:01:00.000Z')), 'ongoing');
  });

  it('builds a human welcome for first-time chats', () => {
    const opening = buildGreetingOpening({
      kind: 'fresh',
      contact: { first_name: 'Rahul', profile_name: 'Rahul' },
      now: new Date('2026-08-20T03:30:00.000Z'),
    });
    assert.match(opening, /Good morning Rahul/);
    assert.match(opening, /Thank you for contacting Techantum Solutions/);
    const prefixed = applyGreetingPrefix('We build professional websites.', opening);
    assert.match(prefixed, /Good morning Rahul/);
    assert.match(prefixed, /We build professional websites/);
    assert.doesNotMatch(prefixed, /don.t have that information confirmed/i);
  });

  it('does not put the unconfirmed fallback into the welcome', () => {
    const opening = buildGreetingOpening({
      kind: 'fresh',
      contact: { first_name: 'Rahul', profile_name: 'Rahul' },
      now: new Date('2026-08-20T03:30:00.000Z'),
    });
    const welcome = buildGreetingReply({
      kind: 'fresh',
      contact: { first_name: 'Rahul', profile_name: 'Rahul' },
      now: new Date('2026-08-20T03:30:00.000Z'),
    });
    assert.match(welcome, /Good morning Rahul/);
    assert.match(welcome, /Thank you for contacting Techantum Solutions/);
    assert.doesNotMatch(welcome, /How can we help you today/);
    assert.doesNotMatch(welcome, /don.t have that information confirmed/i);
    assert.doesNotMatch(welcome, /our team help you/i);

    const stripped = stripUnconfirmedFallback(
      `${opening}\n\nI don't have that information confirmed right now. I can have our team help you with it.`
    );
    assert.doesNotMatch(stripped, /don.t have that information confirmed/i);

    const prefixed = applyGreetingPrefix(
      "I don't have that information confirmed right now. I can have our team help you with it.",
      opening
    );
    assert.match(prefixed, /Good morning Rahul/);
    assert.doesNotMatch(prefixed, /How can we help you today\? We build websites/i);
    assert.doesNotMatch(prefixed, /don.t have that information confirmed/i);
    assert.equal(
      stripUnconfirmedFallback('How can we help you today? We build websites, web applications and mobile applications.'),
      ''
    );
    assert.doesNotMatch(opening, /Are you looking for a website/i);
    assert.doesNotMatch(welcome, /Are you looking for a website/i);
    const greetingWithQuestion = applyGreetingPrefix(
      'Are you looking for a website, web application or mobile application?',
      opening
    );
    assert.match(greetingWithQuestion, /Good morning Rahul/);
    assert.doesNotMatch(greetingWithQuestion, /Are you looking for a website/i);
    assert.equal(
      stripServiceQuestion(`${opening}\n\nAre you looking for a website, web application or mobile application?`),
      opening
    );
    assert.doesNotMatch(
      stripCustomerEcho('Got it — Showcase my products. I have noted this.', 'Showcase my products'),
      /Showcase my products/i
    );
  });

  it('treats the website starter as a greeting, not a new requirement', () => {
    assert.equal(isWebsiteWidgetOpener('Hello! I would like to inquire about Techantum Solutions IT services.'), true);
    assert.equal(isWebsiteWidgetOpener('Hello! I would like to inquire about your services.'), true);
    assert.equal(isWebsiteWidgetOpener('Hi, welcome back. I wanted to continue our conversation.'), true);
    assert.equal(isWebsiteWidgetOpener('I need a website for my shop'), false);
    assert.equal(isGreetingTurn('Hello! I would like to inquire about Techantum Solutions IT services.'), true);
  });

  it('treats a known contact with no messages in a new thread as returning', () => {
    const inbound = [{ sender_type: 'CUSTOMER', created_at: '2026-08-24T10:00:00.000Z' }] as WhatsAppMessage[];
    assert.equal(classifySession(inbound, new Date('2026-08-24T10:01:00.000Z'), { hadPriorChat: true }), 'returning');
  });

  it('does not treat a how-are-you as a time slot', () => {
    assert.equal(isCasualChat('How are you doing today?'), true);
    assert.match(casualChatReply('How are you doing today?'), /doing great/i);
  });

  it('treats simple hellos as greetings and real questions as questions', () => {
    assert.equal(isGreetingOnly('Hi'), true);
    assert.equal(isGreetingOnly('Hello!'), true);
    assert.equal(isGreetingOnly('Good morning'), true);
    assert.equal(isGreetingOnly('Hi, I need a website.'), false);
    assert.equal(isGreetingOnly('What does a Launch website include?'), false);
    assert.equal(isGreetingOnly('Ok'), false);
    assert.equal(isGreetingOnly('okay'), false);
    assert.equal(isGreetingOnly('What up'), true);
    assert.equal(isGreetingOnly('whats up'), true);
    assert.equal(isAcknowledgement('Ok'), true);
    assert.equal(isAcknowledgement('okay'), true);
    assert.equal(isAcknowledgement('Thanks'), true);
    assert.equal(isAcknowledgement('Hi, I need a website.'), false);
  });

  it('does not greet again in an ongoing session', () => {
    assert.equal(
      buildGreetingOpening({
        kind: 'ongoing',
        contact: { first_name: 'Rahul', profile_name: 'Rahul' },
      }),
      ''
    );
  });
});

describe('website service catalog', () => {
  it('includes Techantum website, web app and mobile offerings', () => {
    const names = serviceDivisions.map((d) => d.name).join(' | ');
    assert.match(names, /Website Development/);
    assert.match(names, /Web Application Development/);
    assert.match(names, /Mobile Application Development/);
    assert.ok(serviceDivisions.some((d) => d.plans.some((p) => p.name === 'Launch Website')));
  });
});
