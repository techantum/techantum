import type { OpsProjectStatus, OpsTicketStatus, OpsTicketType } from './config';

export interface OpsClient {
  id: string;
  client_code: string;
  name: string;
  location: string | null;
  contact_number: string | null;
  whatsapp_number: string | null;
  email: string | null;
  website_domain: string | null;
  hosting_provider: string | null;
  created_at: string;
  updated_at: string;
}

export interface OpsProject {
  id: string;
  project_code: string;
  client_id: string;
  project_name: string;
  project_type: string;
  package_name: string;
  website_domain: string | null;
  hosting_provider: string | null;
  scope_document_url: string | null;
  scope_url: string | null;
  estimated_hours: number;
  cost_per_hour: number;
  developers_count: number;
  start_date: string;
  original_end_date: string;
  current_end_date: string;
  status: OpsProjectStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  ops_clients?: OpsClient;
}

export interface OpsTicket {
  id: string;
  ticket_code: string;
  client_id: string;
  project_id: string;
  ticket_type: OpsTicketType;
  title: string;
  description: string | null;
  scope_document_url: string | null;
  scope_url: string | null;
  estimated_hours: number;
  cost_per_hour: number;
  developers_count: number;
  start_date: string;
  original_end_date: string;
  current_end_date: string;
  status: OpsTicketStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  ops_clients?: Pick<OpsClient, 'id' | 'client_code' | 'name' | 'whatsapp_number' | 'email'>;
  ops_projects?: Pick<OpsProject, 'id' | 'project_code' | 'project_name' | 'project_type' | 'package_name' | 'status'>;
}

export interface OpsStatusHistory {
  id: string;
  previous_status: string | null;
  new_status: string;
  note: string | null;
  changed_by: string | null;
  created_at: string;
}

export interface OpsDateExtension {
  id: string;
  previous_end_date: string;
  new_end_date: string;
  reason: string;
  extended_by: string | null;
  created_at: string;
}

export interface OpsCommunication {
  id: string;
  client_id: string;
  project_id: string | null;
  ticket_id: string | null;
  channel: string;
  message_type: string;
  recipient: string;
  message_body: string;
  provider_message_id: string | null;
  status: string;
  error_message: string | null;
  sent_by: string | null;
  sent_at: string | null;
  created_at: string;
}

export function internalCost(hours: number, rate: number) {
  return Math.round(hours * rate * 100) / 100;
}

export function isOverdue(currentEndDate: string, status: string, today: string) {
  if (status === 'completed' || status === 'cancelled') return false;
  return today > currentEndDate;
}
