import { formatSlotForPeople } from './appointment-slot.ts';
import type { AppointmentStatus } from './appointment-types.ts';

function displayName(name?: string | null) {
  return (name || '').replace(/^~/, '').trim();
}

function greetingLine(name: string) {
  return name ? `Hello ${name},` : 'Hello,';
}

function stripDuplicateGreetings(text: string, name: string) {
  let cleaned = text.replace(/\s+\n/g, '\n').trim();
  if (name) {
    const pattern = new RegExp(`(?:^|\\n)\\s*(?:hi|hello|dear)\\s+${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b[,!]?\\s*`, 'ig');
    let seen = 0;
    cleaned = cleaned.replace(pattern, (match) => {
      seen += 1;
      return seen === 1 ? match : '\n';
    });
  }
  return cleaned.replace(/\n{3,}/g, '\n\n').trim();
}

export function formatAppointmentStatusMessage(input: {
  status: AppointmentStatus;
  name?: string | null;
  when?: string | null;
  requestedSlot?: string | null;
}) {
  const name = displayName(input.name);
  const hello = greetingLine(name);
  const when = formatSlotForPeople(input.when, input.requestedSlot);
  switch (input.status) {
    case 'SCHEDULED':
      return `${hello}\n\nThank you. Your call with Techantum is scheduled for ${when}. Our team will speak with you to understand your requirement fully and suggest the right solution for your business.`;
    case 'CONFIRMED':
      return `${hello}\n\nThis is a confirmation from Techantum. Your call is confirmed for ${when}. We look forward to speaking with you.`;
    case 'IN_DISCUSSION':
      return `${hello}\n\nThank you for speaking with us. Our team is reviewing your requirement and will share the next update shortly.`;
    case 'COMPLETED':
      return `${hello}\n\nThank you for the discussion. We have noted your requirement and will get back to you with the next steps.`;
    case 'FOLLOW_UP':
      return `${hello}\n\nThank you. We will follow up with you as discussed. If anything else comes to mind, you can reply here.`;
    case 'NO_SHOW':
      return `${hello}\n\nWe tried reaching you for the scheduled call. Please share a convenient time and we will arrange it again.`;
    case 'CANCELLED':
      return `${hello}\n\nWe have cancelled the scheduled call. If you would like to speak later, message us here and we will arrange a new time.`;
    default:
      return `${hello}\n\nWe have an update on your Techantum call. Our team will keep you posted here.`;
  }
}

export function formatAppointmentNoteMessage(input: {
  name?: string | null;
  notes: string;
}) {
  const name = displayName(input.name);
  const notes = stripDuplicateGreetings(input.notes, name);
  const alreadyGreeted = /^(hi|hello|dear)\b/i.test(notes);
  if (alreadyGreeted) {
    return `${notes}\n\nIf you have any questions, you can reply here. We are happy to help.`;
  }
  return `${greetingLine(name)}\n\nThank you for speaking with Techantum. Here is an update from our team:\n\n${notes}\n\nIf you have any questions, you can reply here. We are happy to help.`;
}
