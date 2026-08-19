import { TICKET_TYPE_LABELS, type OpsTicketType } from './config';

export type WelcomeVars = {
  client_name: string;
  project_type: string;
  package_name: string;
  start_date: string;
  end_date: string;
};

export type ProjectUpdateVars = {
  client_name: string;
  project_name: string;
  status: string;
  status_or_update: string;
  current_delivery_date: string;
};

export type TicketUpdateVars = {
  client_name: string;
  project_name: string;
  ticket_title: string;
  ticket_code: string;
  ticket_type: string;
  ticket_status: string;
  ticket_end_date: string;
};

const INTERNAL_LEAK = /(estimated hours|cost per hour|internal cost|\bdevelopers?\b)/i;

function interpolate(template: string, vars: Record<string, string>) {
  return template.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_, key: string) => vars[key] ?? '');
}

export const WELCOME_TEMPLATE = `Hello {{client_name}},

Welcome to *Techantum Solutions*!

It's our pleasure to have you onboard with us for your *{{project_type}} – {{package_name}}* project.

Project Details:
Start Date: {{start_date}}
Estimated Delivery Date: {{end_date}}

Our team will keep you updated as the project progresses.

Thank you for choosing *Techantum Solutions*.

Regards,
Team Techantum`;

export const PROJECT_UPDATE_TEMPLATE = `Hello {{client_name}},

Here is an update regarding your *{{project_name}}* project.

Update: {{status_or_update}}
Current Status: {{status}}
Estimated Delivery Date: {{current_delivery_date}}

Thank you.

Regards,
Team Techantum`;

export const TICKET_UPDATE_TEMPLATE = `Hello {{client_name}},

Here is an update regarding *{{ticket_title}}* for your *{{project_name}}* project.

Ticket: {{ticket_code}}
Type: {{ticket_type}}
Status: {{ticket_status}}
Estimated Delivery Date: {{ticket_end_date}}

Thank you.

Regards,
Team Techantum`;

export function renderWelcomeMessage(vars: WelcomeVars) {
  return interpolate(WELCOME_TEMPLATE, vars).trim();
}

export function renderProjectUpdateMessage(vars: ProjectUpdateVars) {
  return interpolate(PROJECT_UPDATE_TEMPLATE, vars).trim();
}

export function renderTicketUpdateMessage(vars: TicketUpdateVars) {
  return interpolate(TICKET_UPDATE_TEMPLATE, vars).trim();
}

export function ticketTypeLabel(type: string) {
  return TICKET_TYPE_LABELS[type as OpsTicketType] || type;
}

export function assertClientSafeMessage(body: string) {
  if (!body.trim()) throw new Error('Message cannot be empty.');
  if (INTERNAL_LEAK.test(body)) {
    throw new Error('Client messages cannot include internal commercial information.');
  }
}
