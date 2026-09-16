import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildTimeSlotsForDate,
  confirmAppointmentReply,
  dayChoicePicker,
  isSlotBookable,
  looksLikeSlotAttempt,
  matchAvailableSlot,
  otherDatePicker,
  upcomingSlotPicker,
  parseAppointmentSlot,
  parseTimeSlotId,
  timeChoicePicker,
  timeSlotId,
  toIstYmd,
} from './appointment-slot.ts';
import { formatAppointmentNoteMessage, formatAppointmentStatusMessage } from './appointment-copy.ts';
import { advanceQualification, ackAfterDoneReply, captureBrief, captureCallSlot, emptyQualification } from './qualification.ts';

describe('WhatsApp appointment slots', () => {
  const evening = new Date('2026-08-21T11:46:00.000Z');

  it('offers remaining times today from now plus 1 hour until 7:00 pm', () => {
    const ymd = toIstYmd(evening, 0);
    const slots = buildTimeSlotsForDate(ymd, evening);
    assert.ok(slots.length > 0);
    assert.ok(slots.length <= 10);
    const last = slots[slots.length - 1];
    assert.match(last.label, /7:00 PM/i);
    assert.equal(slots.some((slot) => /3:00 PM|4:00 PM|5:00 PM/i.test(slot.label)), false);
    assert.ok(slots.every((slot) => isSlotBookable(slot, evening)));
    const ids = slots.map((slot) => timeSlotId(slot));
    assert.ok(ids.every((id) => id.startsWith('time_')));
    assert.ok(parseTimeSlotId(ids[0])?.scheduledAt);
  });

  it('never books a time that has already passed', () => {
    const now = new Date('2026-08-21T12:03:00.000Z');
    assert.equal(matchAvailableSlot('today at 3:00 PM', now), null);
    assert.equal(matchAvailableSlot('today at 4:00 PM', now), null);
    const parsed = parseAppointmentSlot('today at 3:00 PM', now);
    assert.equal(isSlotBookable(parsed, now), false);
  });

  it('does not treat how are you today as a booking', () => {
    assert.equal(looksLikeSlotAttempt('How are you doing today?'), false);
  });

  it('has no today slots after 7:00 pm and points to tomorrow or select date', () => {
    const late = new Date('2026-08-21T14:10:00.000Z');
    const today = buildTimeSlotsForDate(toIstYmd(late, 0), late);
    assert.equal(today.length, 0);
    const picker = dayChoicePicker(late);
    assert.doesNotMatch(picker.buttons?.map((b) => b.id).join(',') || '', /day_today/);
    assert.ok(picker.buttons?.some((b) => b.id === 'day_tomorrow'));
    assert.ok(picker.buttons?.some((b) => b.id === 'day_other'));
    assert.match(picker.buttons?.find((b) => b.id === 'day_other')?.title || '', /select date/i);
  });

  it('shows timeslots in one step, not date then window then time', () => {
    const picker = upcomingSlotPicker(evening);
    const rows = picker.list?.sections.flatMap((section) => section.rows) || [];
    assert.ok(rows.some((row) => row.id.startsWith('time_')));
    assert.ok(rows.some((row) => row.id === 'day_other'));
    assert.match(picker.body, /pick a time/i);
    assert.doesNotMatch(picker.body, /time window/i);

    const tomorrow = timeChoicePicker(toIstYmd(evening, 1), evening);
    assert.equal(Boolean(tomorrow.buttons?.some((b) => b.id === 'win_morning')), false);
    assert.ok((tomorrow.list?.sections[0]?.rows.length || 0) > 0 || (tomorrow.buttons?.length || 0) > 0);
    assert.match(tomorrow.body, /pick a time/i);
    const morning = buildTimeSlotsForDate(toIstYmd(evening, 1), evening, 'morning');
    const afternoon = buildTimeSlotsForDate(toIstYmd(evening, 1), evening, 'afternoon');
    assert.match(morning[0].label, /10:00 AM/i);
    assert.match(morning[morning.length - 1].label, /1:00 PM/i);
    assert.equal(morning.some((slot) => /1:30 PM/i.test(slot.label)), false);
    assert.match(afternoon[0].label, /2:00 PM/i);
    assert.match(afternoon[afternoon.length - 1].label, /7:00 PM/i);
  });

  it('shows a calendar starting from tomorrow', () => {
    const calendar = otherDatePicker(evening);
    const first = calendar.list?.sections[0]?.rows[0];
    assert.equal(first?.id, `date_${toIstYmd(evening, 1)}`);
    assert.match(calendar.body, /pick a date/i);
  });

  it('asks for today, tomorrow or select date after Please call me', () => {
    let state = emptyQualification();
    state = advanceQualification(state, { id: 'svc_website' }).state;
    state = advanceQualification(state, { id: 'purpose_new' }).state;
    state = captureBrief(state, 'Website so clients know my services');
    const asked = advanceQualification(state, { id: 'call_yes', text: 'Please call me' });
    assert.equal(asked.state.step, 'slot');
    assert.match(asked.messages[0].body, /pick a time/i);
    assert.ok(asked.messages[0].list?.sections?.some((section) => section.rows.some((row) => row.id.startsWith('time_'))));

    const booked = captureCallSlot(asked.state, 'tomorrow 11 am');
    assert.equal(booked.step, 'done');
    assert.match(booked.preferred_slot || '', /tomorrow/i);

    const labelled = matchAvailableSlot(
      'schedule an appointment on 25/08/2026 first in the morning',
      evening
    );
    assert.ok(labelled);
    const kept = captureCallSlot(asked.state, labelled.label, labelled);
    assert.match(kept.preferred_slot || '', /25 Aug|Aug 25/i);
    assert.doesNotMatch(kept.preferred_slot || '', /today/i);
    assert.doesNotMatch(confirmAppointmentReply(parseAppointmentSlot('tomorrow 11 am', evening)!), /pric/i);
  });

  it('writes professional client updates from status and notes', () => {
    const status = formatAppointmentStatusMessage({
      status: 'COMPLETED',
      name: 'Rahul',
      requestedSlot: 'tomorrow 11 am',
    });
    assert.match(status, /Hello Rahul/);
    assert.match(status, /thank you for the discussion/i);
    const note = formatAppointmentNoteMessage({
      name: 'Rahul',
      notes: 'We will share a proposed website approach by Friday.',
    });
    assert.match(note, /proposed website approach by Friday/i);
    const wrapped = formatAppointmentNoteMessage({
      name: 'Sandhya',
      notes: 'Hi Sandhya your appointment has been scheduled at 11:30 am tomorrow.',
    });
    assert.equal((wrapped.match(/Sandhya/g) || []).length, 1);
    assert.match(wrapped, /Hi Sandhya/);
    assert.doesNotMatch(wrapped, /Hello Sandhya/i);
  });

  it('books the requested date instead of tomorrow when the client is unavailable', () => {
    const now = new Date('2026-08-21T12:30:00.000Z');
    const text = 'I may not be available tomorrow schedule an appointment on 25/08/2026 first in the morning';
    const slot = matchAvailableSlot(text, now);
    assert.ok(slot?.scheduledAt);
    assert.match(slot?.label || '', /25 Aug|Aug 25/i);
    assert.match(slot?.label || '', /10:00 AM/i);
    assert.doesNotMatch(slot?.label || '', /tomorrow/i);
    const kept = captureCallSlot(emptyQualification(), slot!.label, slot);
    assert.match(kept.preferred_slot || '', /25 Aug|Aug 25/i);
    assert.doesNotMatch(kept.preferred_slot || '', /\btoday\b/i);
    const afterOk = ackAfterDoneReply(kept, `Thank you. I have scheduled a call ${slot!.label}. Our team will call you then.`);
    assert.match(afterOk || '', /look forward to speaking/i);
    assert.doesNotMatch(afterOk || '', /today/i);
  });
});

describe('calendar busy overlap', () => {
  it('treats overlapping times as busy', async () => {
    const { slotIsFree } = await import('./google-calendar.ts');
    const start = new Date('2026-08-25T05:30:00.000Z');
    const busy = [{ start, end: new Date(start.getTime() + 30 * 60 * 1000) }];
    assert.equal(slotIsFree(start, busy), false);
    assert.equal(slotIsFree(new Date(start.getTime() + 60 * 60 * 1000), busy), true);
  });
});
