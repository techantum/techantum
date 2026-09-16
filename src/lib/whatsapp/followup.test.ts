import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildFollowupMessage, FOLLOWUP_SESSION_HOURS, isFollowupDue, isFollowupWindow } from './followup-schedule.ts';
import { emptyQualification } from './qualification.ts';

describe('WhatsApp follow-up scheduling', () => {
  it('sends only between 9am and 8pm India time', () => {
    assert.equal(isFollowupWindow(new Date('2026-08-21T03:30:00.000Z'), 9, 20), true);
    assert.equal(isFollowupWindow(new Date('2026-08-21T03:00:00.000Z'), 9, 20), false);
    assert.equal(isFollowupWindow(new Date('2026-08-21T14:00:00.000Z'), 9, 20), true);
    assert.equal(isFollowupWindow(new Date('2026-08-21T14:30:00.000Z'), 9, 20), false);
  });

  it('waits 12 hours of silence, then can send a later nudge', () => {
    const inbound = '2026-08-20T08:00:00.000Z';
    const outbound = '2026-08-20T08:05:00.000Z';
    const tooSoon = isFollowupDue({
      now: new Date('2026-08-20T14:00:00.000Z'),
      lastInboundAt: inbound,
      lastOutboundAt: outbound,
      followupCount: 0,
      firstHours: 12,
      secondHours: 20,
      maxFollowups: 2,
    });
    assert.equal(tooSoon.due, false);
    assert.equal(tooSoon.reason, 'too_soon');

    const first = isFollowupDue({
      now: new Date('2026-08-21T04:00:00.000Z'),
      lastInboundAt: inbound,
      lastOutboundAt: outbound,
      followupCount: 0,
      firstHours: 12,
      secondHours: 20,
      maxFollowups: 2,
    });
    assert.equal(first.due, true);

    const second = isFollowupDue({
      now: new Date('2026-08-21T04:30:00.000Z'),
      lastInboundAt: inbound,
      lastOutboundAt: '2026-08-21T04:05:00.000Z',
      followupCount: 1,
      firstHours: 12,
      secondHours: 20,
      maxFollowups: 2,
    });
    assert.equal(second.due, true);
  });

  it('does not follow up if the customer already replied or staff owns the chat', () => {
    const now = new Date('2026-08-21T04:00:00.000Z');
    const replied = isFollowupDue({
      now,
      lastInboundAt: '2026-08-21T03:50:00.000Z',
      lastOutboundAt: '2026-08-20T08:00:00.000Z',
      followupCount: 0,
      firstHours: 12,
      secondHours: 20,
      maxFollowups: 2,
    });
    assert.equal(replied.reason, 'awaiting_our_reply');

    const staff = isFollowupDue({
      now,
      lastInboundAt: '2026-08-20T08:00:00.000Z',
      lastOutboundAt: '2026-08-20T08:05:00.000Z',
      followupCount: 0,
      firstHours: 12,
      secondHours: 20,
      maxFollowups: 2,
      lastOutboundSender: 'STAFF',
    });
    assert.equal(staff.reason, 'staff_owns_chat');
  });

  it('skips after the WhatsApp 24-hour session has closed', () => {
    const check = isFollowupDue({
      now: new Date('2026-08-21T05:00:00.000Z'),
      lastInboundAt: '2026-08-20T04:00:00.000Z',
      lastOutboundAt: '2026-08-20T04:05:00.000Z',
      followupCount: 0,
      firstHours: 12,
      secondHours: 20,
      maxFollowups: 2,
    });
    assert.equal(check.due, false);
    assert.equal(check.reason, 'session_closed');
    assert.equal(FOLLOWUP_SESSION_HOURS, 23);
  });

  it('writes a greeting plus a question from the previous chat, without repeating their brief', () => {
    const now = new Date('2026-08-21T04:00:00.000Z');
    const none = buildFollowupMessage({
      qualification: emptyQualification(),
      contact: { first_name: 'Bhaskar', profile_name: 'Bhaskar' },
      now,
    });
    assert.match(none, /Good morning Bhaskar/);
    assert.match(none, /website, web application or mobile application/i);

    const withBrief = buildFollowupMessage({
      qualification: {
        ...emptyQualification(),
        service: 'WEB_APPLICATION',
        purpose: 'existing',
        brief: 'Add new features to our Next.js finance app',
        call_requested: true,
        step: 'done',
        prospect: 'PROSPECT',
        prospect_reason: 'live requirement',
      },
      contact: { first_name: 'Bhaskar', profile_name: 'Bhaskar' },
      now,
    });
    assert.match(withBrief, /Good morning Bhaskar/);
    assert.match(withBrief, /web application/i);
    assert.match(withBrief, /convenient time|extra detail/i);
    assert.doesNotMatch(withBrief, /Add new features to our Next.js finance app/);
    assert.doesNotMatch(withBrief, /shall i ask someone to call/i);
  });
});
