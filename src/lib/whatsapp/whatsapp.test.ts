import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import crypto from 'node:crypto';
import { parseInboundMessages, verifyWebhookSignature } from './webhook-utils.ts';
import { applyGreetingPrefix, buildGreetingOpening, classifySession, getTimeOfDayGreeting } from './greeting.ts';
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
