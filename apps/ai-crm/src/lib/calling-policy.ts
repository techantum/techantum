export function withinCallingWindow(policy: { allowedHours?: string; days?: string } | null | undefined, now = new Date()) {
  const days = String(policy?.days || 'Mon-Sat');
  const allowed = days.includes('Mon-Sat')
    ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    : days.split(/[^A-Za-z]+/).filter(Boolean);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(now)
      .map((part) => [part.type, part.value]),
  );
  if (!allowed.includes(parts.weekday)) return false;
  const [start, end] = String(policy?.allowedHours || '09:00-19:00').split('-');
  const current = `${parts.hour}:${parts.minute}`;
  return current >= start && current < end;
}

export function callBlockReason(lead: { calling_consent?: string; consent_status?: string }, policy: any) {
  if (lead.consent_status === 'opted_out') return 'Customer opted out';
  if (lead.calling_consent !== 'granted') return 'Calling consent is not granted';
  if (!withinCallingWindow(policy)) return 'Outside permitted calling window';
  return null;
}
