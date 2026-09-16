import crypto from 'node:crypto';

export type BusyInterval = { start: Date; end: Date };

function env(key: string) {
  return process.env[key]?.trim() || '';
}

function privateKey() {
  return env('GOOGLE_CALENDAR_PRIVATE_KEY')
    .replace(/^["']|["']$/g, '')
    .replace(/\\n/g, '\n');
}

export function calendarConfigured() {
  return Boolean(env('GOOGLE_CALENDAR_CLIENT_EMAIL') && privateKey() && env('GOOGLE_CALENDAR_ID'));
}

export function slotIsFree(at: Date, busy: BusyInterval[], durationMinutes = 30) {
  const start = at.getTime();
  const end = start + durationMinutes * 60 * 1000;
  return !busy.some((block) => start < block.end.getTime() && end > block.start.getTime());
}

let lastError = '';

export function lastCalendarError() {
  return lastError;
}

function rememberError(err: unknown) {
  lastError = err instanceof Error ? err.message : String(err);
  console.error('[google calendar]', lastError);
}

function projectIdFromEmail(email: string) {
  const match = email.match(/@([^.]+)\.iam\.gserviceaccount\.com$/);
  return match?.[1] || '';
}

async function googleAccessToken(scope = 'https://www.googleapis.com/auth/calendar') {
  const email = env('GOOGLE_CALENDAR_CLIENT_EMAIL');
  const impersonate = env('GOOGLE_CALENDAR_IMPERSONATE');
  const key = privateKey();
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const claim = Buffer.from(
    JSON.stringify({
      iss: email,
      ...(impersonate ? { sub: impersonate } : {}),
      scope,
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    })
  ).toString('base64url');
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(`${header}.${claim}`);
  const jwt = `${header}.${claim}.${signer.sign(key, 'base64url')}`;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  const json = (await res.json()) as { access_token?: string; error?: string };
  if (!json.access_token) throw new Error(json.error || 'Google Calendar auth failed');
  return json.access_token;
}

export async function busyIntervals(from: Date, to: Date): Promise<BusyInterval[]> {
  if (!calendarConfigured()) return [];
  try {
    const token = await googleAccessToken();
    const calendarId = env('GOOGLE_CALENDAR_ID');
    const res = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        timeMin: from.toISOString(),
        timeMax: to.toISOString(),
        timeZone: env('GOOGLE_CALENDAR_TIMEZONE') || 'Asia/Kolkata',
        items: [{ id: calendarId }],
      }),
    });
    const json = (await res.json()) as {
      error?: { message?: string };
      calendars?: Record<
        string,
        { busy?: { start: string; end: string }[]; errors?: { domain?: string; reason?: string }[] }
      >;
    };
    if (!res.ok) throw new Error(json.error?.message || `freeBusy HTTP ${res.status}`);
    const calendar = json.calendars?.[calendarId];
    if (calendar?.errors?.length) {
      throw new Error(calendar.errors.map((row) => row.reason || row.domain).join(', '));
    }
    return (calendar?.busy || []).map((row) => ({
      start: new Date(row.start),
      end: new Date(row.end),
    }));
  } catch (err) {
    rememberError(err);
    return [];
  }
}

export async function createCalendarEvent(input: {
  summary: string;
  description?: string;
  start: Date;
  durationMinutes?: number;
  attendeePhone?: string;
}) {
  if (!calendarConfigured()) return null;
  try {
    const token = await googleAccessToken();
    const calendarId = encodeURIComponent(env('GOOGLE_CALENDAR_ID'));
    const duration = input.durationMinutes || 30;
    const end = new Date(input.start.getTime() + duration * 60 * 1000);
    const tz = env('GOOGLE_CALENDAR_TIMEZONE') || 'Asia/Kolkata';
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: input.summary,
        description: input.description || '',
        start: { dateTime: input.start.toISOString(), timeZone: tz },
        end: { dateTime: end.toISOString(), timeZone: tz },
        reminders: { useDefault: true },
      }),
    });
    const json = (await res.json()) as { id?: string; error?: { message?: string } };
    if (!json.id) throw new Error(json.error?.message || 'Failed to create calendar event');
    lastError = '';
    return json.id;
  } catch (err) {
    rememberError(err);
    if (/has not been used|disabled|accessNotConfigured/i.test(lastError)) {
      const enabled = await tryEnableCalendarApi();
      if (enabled.ok) {
        try {
          const token = await googleAccessToken();
          const calendarId = encodeURIComponent(env('GOOGLE_CALENDAR_ID'));
          const duration = input.durationMinutes || 30;
          const end = new Date(input.start.getTime() + duration * 60 * 1000);
          const tz = env('GOOGLE_CALENDAR_TIMEZONE') || 'Asia/Kolkata';
          const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              summary: input.summary,
              description: input.description || '',
              start: { dateTime: input.start.toISOString(), timeZone: tz },
              end: { dateTime: end.toISOString(), timeZone: tz },
              reminders: { useDefault: true },
            }),
          });
          const json = (await res.json()) as { id?: string; error?: { message?: string } };
          if (!json.id) throw new Error(json.error?.message || 'Failed to create calendar event');
          lastError = '';
          return json.id;
        } catch (retryErr) {
          rememberError(retryErr);
        }
      }
    }
    return null;
  }
}

export async function diagnoseCalendar() {
  if (!calendarConfigured()) {
    return { ok: false, error: 'Google Calendar env is incomplete' };
  }
  try {
    const from = new Date();
    const to = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const busy = await busyIntervals(from, to);
    if (lastError && /has not been used|disabled|accessNotConfigured/i.test(lastError)) {
      return { ok: false, error: lastError, busyCount: busy.length };
    }
    if (lastError) return { ok: false, error: lastError, busyCount: busy.length };
    return { ok: true, error: '', busyCount: busy.length };
  } catch (err) {
    rememberError(err);
    return { ok: false, error: lastError };
  }
}

export async function tryEnableCalendarApi() {
  const email = env('GOOGLE_CALENDAR_CLIENT_EMAIL');
  const project = projectIdFromEmail(email);
  if (!project) return { ok: false, error: 'Could not read Google Cloud project from service account email' };
  try {
    const token = await googleAccessToken('https://www.googleapis.com/auth/cloud-platform');
    const res = await fetch(
      `https://serviceusage.googleapis.com/v1/projects/${project}/services/calendar-json.googleapis.com:enable`,
      { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: '{}' }
    );
    const json = (await res.json()) as { name?: string; error?: { message?: string } };
    if (!res.ok) throw new Error(json.error?.message || `Enable API HTTP ${res.status}`);
    return { ok: true, error: '' };
  } catch (err) {
    rememberError(err);
    return { ok: false, error: lastError };
  }
}
