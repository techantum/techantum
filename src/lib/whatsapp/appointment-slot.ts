import { isCasualChat } from './greeting.ts';

export const SLOT_QUESTION =
  'When should our team call you? Please pick today, tomorrow, or select a date.';

export const DAY_QUESTION = SLOT_QUESTION;
export const TIME_LIST_BUTTON = 'Pick a time';
export const DATE_LIST_BUTTON = 'Pick a date';
export const PAST_TIME_REPLY =
  'That time has already passed, so I have not kept it. Let me help you pick a new slot.';

export function pastSlotRescheduleMessage(now = new Date()) {
  return hasTodaySlots(now)
    ? 'That time has already passed, so I have not kept it. Please pick a new slot — today still has times from 1 hour from now until 7:00 pm.'
    : "That time has already passed, so I have not kept it. Today's calling hours have ended (last slot 7:00 pm). Please pick tomorrow or another date.";
}

export const CALL_MORNING_START = 10 * 60;
export const CALL_MORNING_END = 13 * 60;
export const CALL_AFTERNOON_START = 14 * 60;
export const CALL_AFTERNOON_END = 19 * 60;
export const SLOT_LEAD_MINUTES = 60;
export const MAX_LIST_ROWS = 10;
export const SLOT_STEP_MINUTES = 30;

export interface ParsedSlot {
  label: string;
  scheduledAt: Date | null;
  anytime: boolean;
}

export type SlotWindow = 'morning' | 'afternoon';
export type InteractiveButton = { id: string; title: string };
export type ListRow = { id: string; title: string; description?: string };
export type WhatsAppList = { button: string; sections: { title: string; rows: ListRow[] }[] };

export type SlotPicker = {
  body: string;
  buttons?: InteractiveButton[];
  list?: WhatsAppList;
};

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function istParts(now: Date) {
  const shifted = new Date(now.getTime() + IST_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    date: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    weekday: shifted.getUTCDay(),
  };
}

function fromIst(year: number, month: number, date: number, hour: number, minute: number) {
  return new Date(Date.UTC(year, month, date, hour, minute, 0) - IST_OFFSET_MS);
}

export function formatClock(hour: number, minute: number) {
  const mer = hour >= 12 ? 'PM' : 'AM';
  const h = hour % 12 || 12;
  return `${h}:${String(minute).padStart(2, '0')} ${mer}`;
}

export function toIstYmd(now: Date, dayOffset = 0) {
  const noon = fromIst(istParts(now).year, istParts(now).month, istParts(now).date + dayOffset, 12, 0);
  const p = istParts(noon);
  return `${p.year}-${String(p.month + 1).padStart(2, '0')}-${String(p.date).padStart(2, '0')}`;
}

export function parseYmd(ymd: string) {
  const match = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]) - 1, date: Number(match[3]) };
}

export function formatDayLabel(ymd: string) {
  const parts = parseYmd(ymd);
  if (!parts) return ymd;
  const date = fromIst(parts.year, parts.month, parts.date, 12, 0);
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(date);
}

function ceilToStep(minutes: number) {
  return Math.ceil(minutes / SLOT_STEP_MINUTES) * SLOT_STEP_MINUTES;
}

export function isOpenMinutes(mins: number) {
  return (
    (mins >= CALL_MORNING_START && mins <= CALL_MORNING_END) ||
    (mins >= CALL_AFTERNOON_START && mins <= CALL_AFTERNOON_END)
  );
}

export function openMinutesList() {
  const mins: number[] = [];
  for (let m = CALL_MORNING_START; m <= CALL_MORNING_END; m += SLOT_STEP_MINUTES) mins.push(m);
  for (let m = CALL_AFTERNOON_START; m <= CALL_AFTERNOON_END; m += SLOT_STEP_MINUTES) mins.push(m);
  return mins;
}

function earliestTodayMinutes(now: Date) {
  const clock = istParts(now);
  return ceilToStep(clock.hour * 60 + clock.minute + SLOT_LEAD_MINUTES);
}

export function buildTimeSlotsForDate(
  ymd: string,
  now = new Date(),
  window?: SlotWindow | null
): ParsedSlot[] {
  const parts = parseYmd(ymd);
  if (!parts) return [];
  const todayYmd = toIstYmd(now, 0);
  const minMinutes = ymd === todayYmd ? earliestTodayMinutes(now) : CALL_MORNING_START;
  const when = ymd === todayYmd ? 'today' : ymd === toIstYmd(now, 1) ? 'tomorrow' : formatDayLabel(ymd);
  const raw: ParsedSlot[] = [];

  for (const mins of openMinutesList()) {
    if (mins < minMinutes) continue;
    if (window === 'morning' && mins > CALL_MORNING_END) continue;
    if (window === 'afternoon' && mins < CALL_AFTERNOON_START) continue;
    const hour = Math.floor(mins / 60);
    const minute = mins % 60;
    const scheduledAt = fromIst(parts.year, parts.month, parts.date, hour, minute);
    if (scheduledAt.getTime() < now.getTime() + SLOT_LEAD_MINUTES * 60 * 1000 - 1000 && ymd === todayYmd) {
      continue;
    }
    raw.push({
      label: `${when} at ${formatClock(hour, minute)}`,
      scheduledAt,
      anytime: false,
    });
  }

  if (raw.length <= MAX_LIST_ROWS) return raw;
  const last = raw[raw.length - 1];
  const rest = raw.slice(0, -1);
  const step = Math.ceil(rest.length / (MAX_LIST_ROWS - 1));
  const picked: ParsedSlot[] = [];
  for (let i = 0; i < rest.length && picked.length < MAX_LIST_ROWS - 1; i += step) {
    picked.push(rest[i]);
  }
  picked.push(last);
  return picked;
}

export function timeSlotId(slot: ParsedSlot) {
  if (!slot.scheduledAt) return `time_${slot.label}`;
  const p = istParts(slot.scheduledAt);
  const ymd = `${p.year}-${String(p.month + 1).padStart(2, '0')}-${String(p.date).padStart(2, '0')}`;
  const hm = `${String(p.hour).padStart(2, '0')}${String(p.minute).padStart(2, '0')}`;
  return `time_${ymd}_${hm}`;
}

export function parseTimeSlotId(id: string): ParsedSlot | null {
  const match = id.match(/^time_(\d{4}-\d{2}-\d{2})_(\d{2})(\d{2})$/);
  if (!match) return null;
  const parts = parseYmd(match[1]);
  if (!parts) return null;
  const hour = Number(match[2]);
  const minute = Number(match[3]);
  if (!isOpenMinutes(hour * 60 + minute)) return null;
  const scheduledAt = fromIst(parts.year, parts.month, parts.date, hour, minute);
  return {
    label: `${formatDayLabel(match[1])} at ${formatClock(hour, minute)}`,
    scheduledAt,
    anytime: false,
  };
}

export function withRescheduleIntro(picker: SlotPicker, now = new Date()): SlotPicker {
  return { ...picker, body: pastSlotRescheduleMessage(now) };
}

export function isScheduledSlotPast(
  q: { preferred_slot_at?: string; preferred_slot?: string | null },
  now = new Date()
) {
  if (q.preferred_slot_at) {
    const at = new Date(q.preferred_slot_at).getTime();
    return Number.isFinite(at) && at < now.getTime() - 30_000;
  }
  if (!q.preferred_slot) return false;
  const parsed = parseAppointmentSlot(q.preferred_slot, now);
  return Boolean(parsed?.scheduledAt && parsed.scheduledAt.getTime() < now.getTime() - 30_000);
}

export function isSlotBookable(slot: ParsedSlot | null | undefined, now = new Date()) {
  if (!slot?.scheduledAt) return false;
  const leadMs = SLOT_LEAD_MINUTES * 60 * 1000;
  if (slot.scheduledAt.getTime() < now.getTime() + leadMs - 1000) return false;
  const p = istParts(slot.scheduledAt);
  return isOpenMinutes(p.hour * 60 + p.minute);
}

export function hasTodaySlots(now = new Date()) {
  return buildTimeSlotsForDate(toIstYmd(now, 0), now).length > 0;
}

export function dayChoiceButtons(now = new Date()): InteractiveButton[] {
  const buttons: InteractiveButton[] = [];
  if (hasTodaySlots(now)) buttons.push({ id: 'day_today', title: 'Today' });
  buttons.push({ id: 'day_tomorrow', title: 'Tomorrow' });
  buttons.push({ id: 'day_other', title: 'Select date' });
  return buttons.slice(0, 3);
}

export function dayChoicePicker(now = new Date()): SlotPicker {
  const buttons = dayChoiceButtons(now);
  const todayOpen = hasTodaySlots(now);
  return {
    body: todayOpen
      ? 'When should our team call you? Please pick today, tomorrow, or select a date. Today slots start 1 hour from now, until 7:00 pm.'
      : "Today's calling hours have ended (last slot 7:00 pm). Please pick tomorrow or select a date.",
    buttons,
  };
}

function timeRows(slots: ParsedSlot[]): ListRow[] {
  return slots.map((slot) => ({
    id: timeSlotId(slot),
    title: slot.scheduledAt
      ? formatClock(istParts(slot.scheduledAt).hour, istParts(slot.scheduledAt).minute)
      : slot.label,
    description: slot.label,
  }));
}

function timeButtons(slots: ParsedSlot[]): InteractiveButton[] {
  return slots.slice(0, 3).map((slot) => ({
    id: timeSlotId(slot),
    title: slot.scheduledAt
      ? formatClock(istParts(slot.scheduledAt).hour, istParts(slot.scheduledAt).minute)
      : slot.label.slice(0, 20),
  }));
}

export function timeChoicePicker(ymd: string, now = new Date(), window?: SlotWindow | null): SlotPicker {
  const todayYmd = toIstYmd(now, 0);
  const dayName =
    ymd === todayYmd ? 'today' : ymd === toIstYmd(now, 1) ? 'tomorrow' : formatDayLabel(ymd);
  const slots = buildTimeSlotsForDate(ymd, now, window);

  if (slots.length === 0) {
    return {
      body: `No slots are left ${dayName}. Please pick tomorrow or another date.`,
      buttons: dayChoiceButtons(now).filter((button) => button.id !== 'day_today'),
    };
  }

  const heading = `Please pick a time ${dayName}.`;
  if (slots.length <= 3) {
    return { body: heading, buttons: timeButtons(slots) };
  }

  return {
    body: heading,
    list: {
      button: TIME_LIST_BUTTON,
      sections: [{ title: dayName.slice(0, 24), rows: timeRows(slots) }],
    },
  };
}

function spreadSlots(slots: ParsedSlot[], count: number) {
  if (slots.length <= count) return slots;
  if (count <= 1) return [slots[0]];
  const picked: ParsedSlot[] = [];
  for (let i = 0; i < count; i += 1) {
    const idx = Math.round((i * (slots.length - 1)) / (count - 1));
    const slot = slots[idx];
    if (slot && !picked.includes(slot)) picked.push(slot);
  }
  return picked;
}

export function upcomingSlotPicker(now = new Date()): SlotPicker {
  const todaySlots = buildTimeSlotsForDate(toIstYmd(now, 0), now);
  const tomorrowSlots = buildTimeSlotsForDate(toIstYmd(now, 1), now);
  const other: ListRow = { id: 'day_other', title: 'Other date', description: 'Choose another day' };
  const sections: { title: string; rows: ListRow[] }[] = [];
  let remaining = MAX_LIST_ROWS - 1;

  if (todaySlots.length) {
    const n = tomorrowSlots.length ? Math.min(4, remaining) : remaining;
    const rows = timeRows(spreadSlots(todaySlots, n));
    remaining -= rows.length;
    if (rows.length) sections.push({ title: 'Today', rows });
  }
  if (tomorrowSlots.length && remaining > 0) {
    const rows = timeRows(spreadSlots(tomorrowSlots, remaining));
    remaining -= rows.length;
    if (rows.length) sections.push({ title: 'Tomorrow', rows });
  }
  if (!sections.length) return otherDatePicker(now);

  const last = sections[sections.length - 1];
  if (last.rows.length >= MAX_LIST_ROWS) last.rows[last.rows.length - 1] = other;
  else last.rows.push(other);

  return {
    body: 'Please pick a time below. Our solution expert will call you then. Need another day? Choose Other date.',
    list: { button: TIME_LIST_BUTTON, sections },
  };
}

export function otherDatePicker(now = new Date()): SlotPicker {
  const rows: ListRow[] = [];
  for (let i = 1; i <= 10 && rows.length < MAX_LIST_ROWS; i += 1) {
    const ymd = toIstYmd(now, i);
    rows.push({
      id: `date_${ymd}`,
      title: formatDayLabel(ymd),
      description: '10am–1pm and 2pm–7pm',
    });
  }
  return {
    body: 'Please pick a date. I will then show the available times for that day.',
    list: {
      button: DATE_LIST_BUTTON,
      sections: [{ title: 'Select a date', rows }],
    },
  };
}

export function slotPickerForState(
  input: { slotDate?: string | null; slotWindow?: SlotWindow | null },
  now = new Date()
): SlotPicker {
  const ymd = input.slotDate || '';
  if (ymd === 'OTHER') return otherDatePicker(now);
  if (/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return timeChoicePicker(ymd, now, input.slotWindow);
  return upcomingSlotPicker(now);
}

const MONTHS: Record<string, number> = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3, may: 4,
  jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7, sep: 8, sept: 8, september: 8,
  oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
};

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

function ymdFromParts(year: number, month: number, date: number, now: Date) {
  if (month < 0 || month > 11 || date < 1 || date > 31) return null;
  const check = fromIst(year, month, date, 12, 0);
  const p = istParts(check);
  if (p.year !== year || p.month !== month || p.date !== date) return null;
  const ymd = `${p.year}-${pad2(p.month + 1)}-${pad2(p.date)}`;
  if (ymd < toIstYmd(now, 0)) return null;
  return ymd;
}

export function parseExplicitDate(text: string, now = new Date()): string | null {
  const iso = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) return ymdFromParts(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), now);

  const dmy = text.match(/\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})\b/);
  if (dmy) {
    const first = Number(dmy[1]);
    const second = Number(dmy[2]);
    const year = Number(dmy[3]);
    const dayFirst = first > 12 || second <= 12;
    const day = dayFirst ? first : second;
    const month = (dayFirst ? second : first) - 1;
    return ymdFromParts(year, month, day, now);
  }

  const named = text.match(
    /\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?,?\s+(\d{4})\b/i
  );
  if (named) {
    const month = MONTHS[named[2].toLowerCase()];
    if (month === undefined) return null;
    return ymdFromParts(Number(named[3]), month, Number(named[1]), now);
  }

  const namedNoYear = text.match(
    /\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i
  );
  if (namedNoYear) {
    const month = MONTHS[namedNoYear[2].toLowerCase()];
    if (month === undefined) return null;
    const day = Number(namedNoYear[1]);
    const year = istParts(now).year;
    return ymdFromParts(year, month, day, now) || ymdFromParts(year + 1, month, day, now);
  }
  return null;
}

export function isDayUnavailable(text: string, day: 'today' | 'tomorrow') {
  const t = text.toLowerCase();
  const neg = "(?:not(?: be)? available|can(?:not|['’]?t)|won['’]?t be(?: available)?|unavailable|not free|busy)";
  return new RegExp(`${neg}[^\\n.]{0,60}\\b${day}\\b|\\b${day}\\b[^\\n.]{0,60}${neg}`, 'i').test(t);
}

export function looksLikeReschedule(text: string) {
  return /\b(reschedule|another day|other day|different (?:date|day)|change (?:the )?(?:date|appointment|slot|time)|not (?:be )?available|can(?:not|['’]?t) (?:do|make|come|talk))\b/i.test(
    text
  );
}

export function isFirstMorningText(text: string) {
  return /\b(first(?:\s+thing)?\s+(?:in\s+the\s+)?morning|early\s+morning)\b/i.test(text);
}

function stripDates(text: string) {
  return text
    .replace(/\b\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}\b/g, ' ')
    .replace(/\b20\d{2}-\d{2}-\d{2}\b/g, ' ')
    .replace(
      /\b(?:mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)[a-z]*,?\s+/gi,
      ' '
    )
    .replace(
      /\b\d{1,2}(?:st|nd|rd|th)?\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?,?\s*(?:\d{4})?\b/gi,
      ' '
    );
}

export function interpretBookingRequest(text: string, now = new Date()) {
  const ymd = parseExplicitDate(text, now);
  const unavailableTomorrow = isDayUnavailable(text, 'tomorrow');
  const unavailableToday = isDayUnavailable(text, 'today');
  const firstInWindow = isFirstMorningText(text);
  const window: SlotWindow | null = firstInWindow || /\bmorning\b/i.test(text)
    ? 'morning'
    : /\bafternoon\b/i.test(text)
      ? 'afternoon'
      : /\bevening\b/i.test(text)
        ? 'afternoon'
        : null;
  return { ymd, window, firstInWindow, unavailableTomorrow, unavailableToday };
}

function parseClock(text: string): { hour: number; minute: number } | null {
  const cleaned = stripDates(text);
  const named =
    /\b(morning)\b/i.test(cleaned) ? { hour: 10, minute: 0 }
    : /\b(afternoon)\b/i.test(cleaned) ? { hour: 15, minute: 0 }
    : /\b(evening)\b/i.test(cleaned) ? { hour: 18, minute: 0 }
    : null;
  const match = cleaned.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i) || cleaned.match(/\b(\d{1,2}):(\d{2})\b/);
  if (!match) return named;
  let hour = Number(match[1]);
  const minute = match[2] ? Number(match[2]) : 0;
  const mer = (match[3] || '').toLowerCase();
  if (mer === 'pm' && hour < 12) hour += 12;
  if (mer === 'am' && hour === 12) hour = 0;
  if (!mer && hour <= 7) hour += 12;
  if (hour > 23 || minute > 59) return named;
  return { hour, minute };
}

function dayOffset(text: string, now: Date): number | null {
  if (/\btoday\b/i.test(text) && !isDayUnavailable(text, 'today')) return 0;
  if (/\btomorrow\b/i.test(text) && !isDayUnavailable(text, 'tomorrow')) return 1;
  const weekday = WEEKDAYS.findIndex((day) => new RegExp(`\\b${day}\\b`, 'i').test(text));
  if (weekday < 0) return null;
  const current = istParts(now).weekday;
  const diff = (weekday - current + 7) % 7;
  return diff === 0 ? 7 : diff;
}

export function nextAvailableSlot(now = new Date()): ParsedSlot | null {
  const today = buildTimeSlotsForDate(toIstYmd(now, 0), now)[0];
  if (today) return today;
  return buildTimeSlotsForDate(toIstYmd(now, 1), now)[0] || null;
}

export function isImmediateSlotText(text: string) {
  const raw = text.replace(/\s+/g, ' ').trim();
  return /^(anytime|any time|whenever|asap|now|immediately|now itself)$/i.test(raw) ||
    /\b(now itself|as soon as possible|call (me )?now)\b/i.test(raw);
}

export function isVagueSlotText(text: string) {
  return /\b(before|after)\b/i.test(text) && !/after\s+\d+\s*(minutes?|mins?|hours?|hrs?)\b/i.test(text);
}

export function looksLikeSlotAttempt(text: string) {
  const raw = text.replace(/\s+/g, ' ').trim();
  if (!raw) return false;
  if (isCasualChat(raw)) return false;
  if (parseExplicitDate(raw) || looksLikeReschedule(raw) || isFirstMorningText(raw)) return true;
  if (isImmediateSlotText(raw) || isVagueSlotText(raw)) return true;
  if (/\b(today|tomorrow|morning|afternoon|evening)\b/i.test(raw)) return true;
  if (/\b\d{1,2}(?::\d{2})?\s*(am|pm)\b/i.test(raw)) return true;
  if (/\b(after|in)\s+\d+\s*(minutes?|mins?|hours?|hrs?)\b/i.test(raw)) return true;
  if (/\b(select date|other date|pick a time|time slot|appointment)\b/i.test(raw)) return true;
  return false;
}

function slotFromYmd(ymd: string, hour: number, minute: number, now: Date): ParsedSlot | null {
  const parts = parseYmd(ymd);
  if (!parts) return null;
  const scheduledAt = fromIst(parts.year, parts.month, parts.date, hour, minute);
  const todayYmd = toIstYmd(now, 0);
  const when = ymd === todayYmd ? 'today' : ymd === toIstYmd(now, 1) ? 'tomorrow' : formatDayLabel(ymd);
  return {
    label: `${when} at ${formatClock(hour, minute)}`,
    scheduledAt,
    anytime: false,
  };
}

export function parseAppointmentSlot(text: string, now = new Date()): ParsedSlot | null {
  const raw = text.replace(/\s+/g, ' ').trim();
  if (!raw) return null;

  const fromId = parseTimeSlotId(raw);
  if (fromId) return fromId;

  if (isImmediateSlotText(raw)) {
    const next = nextAvailableSlot(now);
    return next ? { ...next, anytime: true } : null;
  }

  const request = interpretBookingRequest(raw, now);
  const clockSource = stripDates(raw);
  const clock = parseClock(clockSource);
  const hour = request.firstInWindow ? 10 : clock?.hour;
  const minute = request.firstInWindow ? 0 : clock?.minute ?? 0;

  if (request.ymd && (request.firstInWindow || clock)) {
    return slotFromYmd(request.ymd, hour ?? 10, minute, now);
  }
  if (request.ymd && !clock && !request.window) {
    return null;
  }

  const relative = raw.match(/\b(?:after|in)\s+(\d+)\s*(minutes?|mins?|hours?|hrs?)\b/i);
  if (relative && !request.ymd) {
    const count = Number(relative[1]);
    const hours = /h/i.test(relative[2]);
    const ms = count * (hours ? 36e5 : 6e4);
    const unit = hours ? (count === 1 ? 'hour' : 'hours') : count === 1 ? 'minute' : 'minutes';
    return {
      label: `in ${count} ${unit}`,
      scheduledAt: new Date(now.getTime() + ms),
      anytime: false,
    };
  }

  if (request.unavailableTomorrow || request.unavailableToday) {
    if (!request.ymd) return null;
  }

  const offset = dayOffset(raw, now);
  const hasDayWord = offset !== null || /\b(today|tomorrow|morning|afternoon|evening)\b/i.test(clockSource);
  if (!clock && offset === null && !hasDayWord && !request.ymd) return null;

  const parts = istParts(now);
  const day = offset ?? 0;
  const useHour = hour ?? (/\bevening\b/i.test(raw) ? 18 : 11);
  const scheduled = fromIst(parts.year, parts.month, parts.date + day, useHour, minute);
  const timeLabel = formatClock(istParts(scheduled).hour, istParts(scheduled).minute);
  const dateLabel =
    day === 0 ? 'today' : day === 1 ? 'tomorrow' : new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'long',
    }).format(scheduled);

  return {
    label: `${dateLabel} at ${timeLabel}`,
    scheduledAt: scheduled,
    anytime: false,
  };
}

export function matchAvailableSlot(text: string, now = new Date()): ParsedSlot | null {
  if (isImmediateSlotText(text) || isVagueSlotText(text)) return null;
  const request = interpretBookingRequest(text, now);
  if (request.unavailableTomorrow && !request.ymd) return null;
  if (request.ymd && request.firstInWindow) {
    return buildTimeSlotsForDate(request.ymd, now, 'morning')[0] || null;
  }
  const parsed = parseAppointmentSlot(text, now);
  if (!parsed?.scheduledAt || !isSlotBookable(parsed, now)) return null;
  const p = istParts(parsed.scheduledAt);
  const ymd = `${p.year}-${pad2(p.month + 1)}-${pad2(p.date)}`;
  if (request.unavailableTomorrow && ymd === toIstYmd(now, 1)) return null;
  const slots = buildTimeSlotsForDate(ymd, now, request.window);
  return (
    slots.find((slot) => {
      if (!slot.scheduledAt) return false;
      return Math.abs(slot.scheduledAt.getTime() - parsed.scheduledAt!.getTime()) < 20 * 60 * 1000;
    }) || null
  );
}

export function confirmAppointmentReply(slot: ParsedSlot): string {
  return `Thank you. I have booked ${slot.label} with our solution expert. They will call you then to understand your requirement in detail.`;
}

export function formatSlotForPeople(scheduledAt?: string | null, fallback?: string | null) {
  if (scheduledAt) {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(scheduledAt));
  }
  return fallback || 'the time we discussed';
}

export function resolveSlotDayChoice(id?: string | null, text?: string | null, now = new Date()) {
  const rawId = (id || '').trim();
  const rawText = (text || '').trim().toLowerCase();
  if (rawId === 'day_today' || rawText === 'today') return { kind: 'ymd' as const, ymd: toIstYmd(now, 0) };
  if (rawId === 'day_tomorrow' || rawText === 'tomorrow') return { kind: 'ymd' as const, ymd: toIstYmd(now, 1) };
  if (
    rawId === 'day_other' ||
    rawText === 'other date' ||
    rawText === 'other' ||
    rawText === 'select date' ||
    rawText === 'select a date'
  ) {
    return { kind: 'other' as const };
  }
  const dateId = rawId.match(/^date_(\d{4}-\d{2}-\d{2})$/);
  if (dateId) return { kind: 'ymd' as const, ymd: dateId[1] };
  return null;
}

export function resolveSlotWindowChoice(id?: string | null, text?: string | null): SlotWindow | null {
  const rawId = (id || '').trim();
  const rawText = (text || '').trim().toLowerCase();
  if (rawId === 'win_morning' || rawText === '10am–1pm' || rawText === '10am-1pm') return 'morning';
  if (rawId === 'win_afternoon' || rawText === '2pm–7pm' || rawText === '2pm-7pm') return 'afternoon';
  return null;
}
