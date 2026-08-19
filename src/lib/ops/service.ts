import { createAdminClient } from '@/lib/supabase/admin';
import {
  OPS_PROJECT_STATUSES,
  OPS_TICKET_STATUSES,
  OPS_TICKET_TYPES,
  PROJECT_STATUS_LABELS,
  TICKET_STATUS_LABELS,
  isClosedStatus,
  packagesForProjectType,
  type OpsProjectStatus,
  type OpsTicketStatus,
  type OpsTicketType,
} from './config';
import {
  assertClientSafeMessage,
  renderProjectUpdateMessage,
  renderTicketUpdateMessage,
  renderWelcomeMessage,
  ticketTypeLabel,
} from './messages';
import { isValidEmail, isValidPhone, isValidWhatsAppNumber, normalizeWhatsAppNumber } from './phone';
import type { OpsClient, OpsCommunication, OpsDateExtension, OpsProject, OpsStatusHistory, OpsTicket } from './types';
import { getWhatsAppDeliveryInfo, sendWhatsAppText } from './whatsapp';
import { assertStartNotInPast, estimateEndDate, todayISO } from './working-days';

function db() {
  return createAdminClient();
}

async function nextCode(kind: 'client' | 'project' | 'ticket') {
  const { data, error } = await db().rpc('ops_next_code', { p_kind: kind });
  if (error || !data) throw new Error(error?.message || 'Failed to generate ID');
  return String(data);
}

function requireText(value: unknown, label: string) {
  const text = String(value ?? '').trim();
  if (!text) throw new Error(`${label} is required.`);
  return text;
}

function requireHours(value: unknown) {
  const hours = Number(value);
  if (!Number.isFinite(hours) || hours <= 0) throw new Error('Estimated hours must be greater than 0.');
  return hours;
}

function requireDevelopers(value: unknown) {
  const count = Number(value);
  if (!Number.isInteger(count) || count < 1) throw new Error('Number of developers must be at least 1.');
  return count;
}

function requireRate(value: unknown) {
  const rate = Number(value);
  if (!Number.isFinite(rate) || rate < 0) throw new Error('Cost per hour must be 0 or more.');
  return rate;
}

function validateSchedule(startDate: string, hours: number, developers: number) {
  assertStartNotInPast(startDate);
  return estimateEndDate(startDate, hours, developers);
}

export async function findDuplicateClients(input: {
  email?: string | null;
  contact_number?: string | null;
  whatsapp_number?: string | null;
  excludeId?: string;
}) {
  const supabase = db();
  let query = supabase.from('ops_clients').select('*');
  if (input.excludeId) query = query.neq('id', input.excludeId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const email = input.email?.trim().toLowerCase() || '';
  const contact = input.contact_number?.replace(/[^\d]/g, '') || '';
  const wa = input.whatsapp_number?.replace(/[^\d]/g, '') || '';
  return ((data ?? []) as OpsClient[]).filter((row) => {
    const rowEmail = row.email?.trim().toLowerCase() || '';
    const rowContact = row.contact_number?.replace(/[^\d]/g, '') || '';
    const rowWa = row.whatsapp_number?.replace(/[^\d]/g, '') || '';
    return (email && rowEmail && rowEmail === email) || (contact && rowContact && rowContact.endsWith(contact.slice(-10))) || (wa && rowWa && rowWa.endsWith(wa.slice(-10)));
  });
}

export async function listClients(search?: string) {
  let query = db().from('ops_clients').select('*').order('created_at', { ascending: false });
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as OpsClient[];
  const q = search?.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((row) =>
    [row.name, row.client_code, row.email, row.contact_number, row.whatsapp_number, row.location]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(q))
  );
}

export async function getClient(id: string) {
  const supabase = db();
  const { data: client, error } = await supabase.from('ops_clients').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!client) return null;
  const [{ data: projects }, { data: tickets }, { data: communications }] = await Promise.all([
    supabase.from('ops_projects').select('*').eq('client_id', id).order('created_at', { ascending: false }),
    supabase.from('ops_tickets').select('*, ops_projects(id, project_code, project_name, project_type, status)').eq('client_id', id).order('created_at', { ascending: false }),
    supabase.from('ops_client_communications').select('*').eq('client_id', id).order('created_at', { ascending: false }).limit(100),
  ]);
  return {
    client: client as OpsClient,
    projects: (projects ?? []) as OpsProject[],
    tickets: (tickets ?? []) as OpsTicket[],
    communications: (communications ?? []) as OpsCommunication[],
  };
}

function clientPayload(input: Record<string, unknown>, userId: string, isCreate: boolean) {
  const name = requireText(input.name, 'Client name');
  const email = String(input.email ?? '').trim() || null;
  const contact = String(input.contact_number ?? '').trim() || null;
  const whatsapp = normalizeWhatsAppNumber(String(input.whatsapp_number ?? '')) || (contact ? normalizeWhatsAppNumber(contact) : null);
  if (email && !isValidEmail(email)) throw new Error('Enter a valid email address.');
  if (contact && !isValidPhone(contact)) throw new Error('Enter a valid contact number.');
  if (input.whatsapp_number && !isValidWhatsAppNumber(String(input.whatsapp_number))) {
    throw new Error('Enter a valid WhatsApp number in international format.');
  }
  return {
    name,
    location: String(input.location ?? '').trim() || null,
    contact_number: contact,
    whatsapp_number: whatsapp,
    email,
    website_domain: String(input.website_domain ?? '').trim() || null,
    hosting_provider: String(input.hosting_provider ?? '').trim() || null,
    ...(isCreate ? { created_by: userId } : {}),
    updated_by: userId,
  };
}

export async function createClient(input: Record<string, unknown>, userId: string, confirmDuplicate = false) {
  const payload = clientPayload(input, userId, true);
  const duplicates = await findDuplicateClients(payload);
  if (duplicates.length && !confirmDuplicate) {
    return { duplicates, client: null as OpsClient | null };
  }
  const client_code = await nextCode('client');
  const { data, error } = await db().from('ops_clients').insert({ ...payload, client_code }).select('*').single();
  if (error) throw new Error(error.message);
  return { duplicates: [], client: data as OpsClient };
}

export async function updateClient(id: string, input: Record<string, unknown>, userId: string) {
  const payload = clientPayload(input, userId, false);
  const { data, error } = await db().from('ops_clients').update(payload).eq('id', id).select('*').single();
  if (error) throw new Error(error.message);
  return data as OpsClient;
}

function projectFields(input: Record<string, unknown>) {
  const project_type = requireText(input.project_type, 'Project type');
  const package_name = requireText(input.package_name, 'Package');
  const allowed = packagesForProjectType(project_type);
  if (allowed.length && !allowed.includes(package_name)) {
    throw new Error(`Package must match the selected project type (${project_type}).`);
  }
  const hours = requireHours(input.estimated_hours);
  const developers = requireDevelopers(input.developers_count);
  const cost = requireRate(input.cost_per_hour);
  const start_date = requireText(input.start_date, 'Start date');
  const end_date = validateSchedule(start_date, hours, developers);
  return {
    project_name: String(input.project_name ?? '').trim() || `${project_type} – ${package_name}`,
    project_type,
    package_name,
    website_domain: String(input.website_domain ?? '').trim() || null,
    hosting_provider: String(input.hosting_provider ?? '').trim() || null,
    scope_document_url: String(input.scope_document_url ?? '').trim() || null,
    scope_url: String(input.scope_url ?? '').trim() || null,
    estimated_hours: hours,
    cost_per_hour: cost,
    developers_count: developers,
    start_date,
    original_end_date: end_date,
    current_end_date: end_date,
  };
}

export async function createOnboarding(input: Record<string, unknown>, userId: string) {
  const confirmDuplicate = Boolean(input.confirmDuplicate);
  let clientId = String(input.client_id ?? '').trim();
  let client: OpsClient | null = null;

  if (clientId) {
    const existing = await getClient(clientId);
    if (!existing) throw new Error('Client not found.');
    client = existing.client;
  } else {
    const created = await createClient(
      {
        name: input.client_name,
        location: input.location,
        contact_number: input.contact_number,
        whatsapp_number: input.whatsapp_number,
        email: input.email,
        website_domain: input.website_domain,
        hosting_provider: input.hosting_provider,
      },
      userId,
      confirmDuplicate
    );
    if (created.duplicates.length && !created.client) {
      return { duplicates: created.duplicates, project: null, ticket: null, client: null };
    }
    client = created.client;
    clientId = client!.id;
  }

  const fields = projectFields(input);
  const project_code = await nextCode('project');
  const { data: project, error: projectError } = await db()
    .from('ops_projects')
    .insert({
      ...fields,
      project_code,
      client_id: clientId,
      status: 'onboarding',
      created_by: userId,
      updated_by: userId,
    })
    .select('*')
    .single();
  if (projectError || !project) throw new Error(projectError?.message || 'Failed to create project.');

  await db().from('ops_project_status_history').insert({
    project_id: project.id,
    previous_status: null,
    new_status: 'onboarding',
    note: 'Project onboarded',
    changed_by: userId,
  });

  const ticket_code = await nextCode('ticket');
  const { data: ticket, error: ticketError } = await db()
    .from('ops_tickets')
    .insert({
      ticket_code,
      client_id: clientId,
      project_id: project.id,
      ticket_type: 'FEATURE',
      title: 'Project onboarding',
      description: `Initial onboarding ticket for ${fields.project_name}`,
      scope_document_url: fields.scope_document_url,
      scope_url: fields.scope_url,
      estimated_hours: fields.estimated_hours,
      cost_per_hour: fields.cost_per_hour,
      developers_count: fields.developers_count,
      start_date: fields.start_date,
      original_end_date: fields.original_end_date,
      current_end_date: fields.current_end_date,
      status: 'open',
      created_by: userId,
      updated_by: userId,
    })
    .select('*')
    .single();

  if (ticketError || !ticket) {
    await db().from('ops_projects').delete().eq('id', project.id);
    throw new Error(ticketError?.message || 'Failed to create onboarding ticket.');
  }

  await db().from('ops_ticket_status_history').insert({
    ticket_id: ticket.id,
    previous_status: null,
    new_status: 'open',
    note: 'Onboarding ticket created',
    changed_by: userId,
  });

  return { duplicates: [], client, project: project as OpsProject, ticket: ticket as OpsTicket };
}

export async function listProjects(filters: { status?: string; search?: string; clientId?: string } = {}) {
  let query = db()
    .from('ops_projects')
    .select('*, ops_clients(id, client_code, name, whatsapp_number, email, location)')
    .order('created_at', { ascending: false });
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.clientId) query = query.eq('client_id', filters.clientId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  let rows = (data ?? []) as OpsProject[];
  const q = filters.search?.trim().toLowerCase();
  if (q) {
    rows = rows.filter((row) =>
      [row.project_code, row.project_name, row.project_type, row.package_name, row.ops_clients?.name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }
  return rows;
}

export async function getProject(id: string) {
  const supabase = db();
  const { data: project, error } = await supabase
    .from('ops_projects')
    .select('*, ops_clients(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!project) return null;
  const [{ data: tickets }, { data: statusHistory }, { data: extensions }, { data: communications }] = await Promise.all([
    supabase.from('ops_tickets').select('*').eq('project_id', id).order('created_at', { ascending: false }),
    supabase.from('ops_project_status_history').select('*').eq('project_id', id).order('created_at', { ascending: false }),
    supabase.from('ops_project_date_extensions').select('*').eq('project_id', id).order('created_at', { ascending: false }),
    supabase.from('ops_client_communications').select('*').eq('project_id', id).order('created_at', { ascending: false }),
  ]);
  return {
    project: project as OpsProject,
    tickets: (tickets ?? []) as OpsTicket[],
    statusHistory: (statusHistory ?? []) as OpsStatusHistory[],
    extensions: (extensions ?? []) as OpsDateExtension[],
    communications: (communications ?? []) as OpsCommunication[],
  };
}

export async function updateProjectStatus(id: string, status: string, userId: string, note?: string) {
  if (!OPS_PROJECT_STATUSES.includes(status as OpsProjectStatus)) throw new Error('Invalid project status.');
  const current = await getProject(id);
  if (!current) throw new Error('Project not found.');
  const previous = current.project.status;
  if (previous === status) return current.project;
  const { data, error } = await db()
    .from('ops_projects')
    .update({ status, updated_by: userId })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  await db().from('ops_project_status_history').insert({
    project_id: id,
    previous_status: previous,
    new_status: status,
    note: note?.trim() || null,
    changed_by: userId,
  });
  return data as OpsProject;
}

export async function extendProjectDate(id: string, newDate: string, reason: string, userId: string) {
  const current = await getProject(id);
  if (!current) throw new Error('Project not found.');
  const previous = current.project.current_end_date;
  if (!reason.trim()) throw new Error('Reason for extension is required.');
  if (newDate <= previous) throw new Error('New delivery date must be later than the current delivery date.');
  const { data, error } = await db()
    .from('ops_projects')
    .update({ current_end_date: newDate, updated_by: userId })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  await db().from('ops_project_date_extensions').insert({
    project_id: id,
    previous_end_date: previous,
    new_end_date: newDate,
    reason: reason.trim(),
    extended_by: userId,
  });
  return data as OpsProject;
}

export async function createTicket(input: Record<string, unknown>, userId: string) {
  const client_id = requireText(input.client_id, 'Client');
  const project_id = requireText(input.project_id, 'Project');
  const ticket_type = requireText(input.ticket_type, 'Ticket type') as OpsTicketType;
  if (!OPS_TICKET_TYPES.includes(ticket_type)) throw new Error('Ticket type must be Feature, Enhancement, or Bug.');
  const title = requireText(input.title, 'Ticket title');
  const hours = requireHours(input.estimated_hours);
  const developers = requireDevelopers(input.developers_count);
  const cost = requireRate(input.cost_per_hour ?? 0);
  const start_date = requireText(input.start_date, 'Start date');
  const end_date = validateSchedule(start_date, hours, developers);

  const project = await getProject(project_id);
  if (!project) throw new Error('Project not found.');
  if (project.project.client_id !== client_id) throw new Error('Selected project does not belong to this client.');

  const ticket_code = await nextCode('ticket');
  const { data, error } = await db()
    .from('ops_tickets')
    .insert({
      ticket_code,
      client_id,
      project_id,
      ticket_type,
      title,
      description: String(input.description ?? '').trim() || null,
      scope_document_url: String(input.scope_document_url ?? '').trim() || null,
      scope_url: String(input.scope_url ?? '').trim() || null,
      estimated_hours: hours,
      cost_per_hour: cost,
      developers_count: developers,
      start_date,
      original_end_date: end_date,
      current_end_date: end_date,
      status: 'open',
      created_by: userId,
      updated_by: userId,
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  await db().from('ops_ticket_status_history').insert({
    ticket_id: data.id,
    previous_status: null,
    new_status: 'open',
    note: 'Ticket created',
    changed_by: userId,
  });
  return data as OpsTicket;
}

export async function listTickets(filters: {
  status?: string;
  type?: string;
  clientId?: string;
  projectId?: string;
  projectType?: string;
  search?: string;
  from?: string;
  to?: string;
} = {}) {
  let query = db()
    .from('ops_tickets')
    .select('*, ops_clients(id, client_code, name, whatsapp_number, email), ops_projects(id, project_code, project_name, project_type, package_name, status)')
    .order('created_at', { ascending: false });
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.type) query = query.eq('ticket_type', filters.type);
  if (filters.clientId) query = query.eq('client_id', filters.clientId);
  if (filters.projectId) query = query.eq('project_id', filters.projectId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  let rows = (data ?? []) as OpsTicket[];
  if (filters.projectType) {
    rows = rows.filter((row) => row.ops_projects?.project_type === filters.projectType);
  }
  if (filters.from) rows = rows.filter((row) => row.start_date >= filters.from!);
  if (filters.to) rows = rows.filter((row) => row.start_date <= filters.to!);
  const q = filters.search?.trim().toLowerCase();
  if (q) {
    rows = rows.filter((row) =>
      [row.ticket_code, row.title, row.ops_clients?.name, row.ops_projects?.project_name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }
  return rows;
}

export async function getTicket(id: string) {
  const supabase = db();
  const { data: ticket, error } = await supabase
    .from('ops_tickets')
    .select('*, ops_clients(*), ops_projects(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!ticket) return null;
  const [{ data: statusHistory }, { data: extensions }, { data: communications }] = await Promise.all([
    supabase.from('ops_ticket_status_history').select('*').eq('ticket_id', id).order('created_at', { ascending: false }),
    supabase.from('ops_ticket_date_extensions').select('*').eq('ticket_id', id).order('created_at', { ascending: false }),
    supabase.from('ops_client_communications').select('*').eq('ticket_id', id).order('created_at', { ascending: false }),
  ]);
  return {
    ticket: ticket as OpsTicket,
    statusHistory: (statusHistory ?? []) as OpsStatusHistory[],
    extensions: (extensions ?? []) as OpsDateExtension[],
    communications: (communications ?? []) as OpsCommunication[],
  };
}

export async function updateTicketStatus(id: string, status: string, userId: string, note?: string) {
  if (!OPS_TICKET_STATUSES.includes(status as OpsTicketStatus)) throw new Error('Invalid ticket status.');
  const current = await getTicket(id);
  if (!current) throw new Error('Ticket not found.');
  const previous = current.ticket.status;
  if (previous === status) return current.ticket;
  const { data, error } = await db()
    .from('ops_tickets')
    .update({ status, updated_by: userId })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  await db().from('ops_ticket_status_history').insert({
    ticket_id: id,
    previous_status: previous,
    new_status: status,
    note: note?.trim() || null,
    changed_by: userId,
  });
  return data as OpsTicket;
}

export async function extendTicketDate(id: string, newDate: string, reason: string, userId: string) {
  const current = await getTicket(id);
  if (!current) throw new Error('Ticket not found.');
  const previous = current.ticket.current_end_date;
  if (!reason.trim()) throw new Error('Reason for extension is required.');
  if (newDate <= previous) throw new Error('New delivery date must be later than the current delivery date.');
  const { data, error } = await db()
    .from('ops_tickets')
    .update({ current_end_date: newDate, updated_by: userId })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  await db().from('ops_ticket_date_extensions').insert({
    ticket_id: id,
    previous_end_date: previous,
    new_end_date: newDate,
    reason: reason.trim(),
    extended_by: userId,
  });
  return data as OpsTicket;
}

async function assertNotDuplicateSend(recipient: string, body: string) {
  const since = new Date(Date.now() - 60_000).toISOString();
  const { data } = await db()
    .from('ops_client_communications')
    .select('id')
    .eq('recipient', recipient)
    .eq('message_body', body)
    .eq('status', 'sent')
    .gte('created_at', since)
    .limit(1);
  if (data?.length) throw new Error('This message was already sent in the last minute. Wait before sending again.');
}

async function withDelivery<T extends Record<string, unknown>>(preview: T) {
  return { ...preview, delivery: await getWhatsAppDeliveryInfo() };
}

async function recordCommunication(input: {
  client_id: string;
  project_id?: string | null;
  ticket_id?: string | null;
  message_type: string;
  recipient: string;
  message_body: string;
  userId: string;
  result: Awaited<ReturnType<typeof sendWhatsAppText>>;
}) {
  const { data, error } = await db()
    .from('ops_client_communications')
    .insert({
      client_id: input.client_id,
      project_id: input.project_id ?? null,
      ticket_id: input.ticket_id ?? null,
      channel: 'whatsapp',
      message_type: input.message_type,
      recipient: input.recipient,
      message_body: input.message_body,
      provider_message_id: input.result.provider_message_id,
      status: input.result.status,
      error_message: input.result.error_message,
      sent_by: input.userId,
      sent_at: input.result.ok ? new Date().toISOString() : null,
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as OpsCommunication;
}

export async function previewProjectWelcome(projectId: string) {
  const detail = await getProject(projectId);
  if (!detail) throw new Error('Project not found.');
  const client = detail.project.ops_clients;
  if (!client) throw new Error('Client not found.');
  const message = renderWelcomeMessage({
    client_name: client.name,
    project_type: detail.project.project_type,
    package_name: detail.project.package_name,
    start_date: detail.project.start_date,
    end_date: detail.project.current_end_date,
  });
  return withDelivery({
    client_name: client.name,
    whatsapp_number: client.whatsapp_number,
    message,
  });
}

export async function previewProjectUpdate(projectId: string, statusOrUpdate?: string) {
  const detail = await getProject(projectId);
  if (!detail) throw new Error('Project not found.');
  const client = detail.project.ops_clients;
  if (!client) throw new Error('Client not found.');
  const status = PROJECT_STATUS_LABELS[detail.project.status] || detail.project.status;
  const message = renderProjectUpdateMessage({
    client_name: client.name,
    project_name: detail.project.project_name,
    status,
    status_or_update: statusOrUpdate?.trim() || status,
    current_delivery_date: detail.project.current_end_date,
  });
  return withDelivery({ client_name: client.name, whatsapp_number: client.whatsapp_number, message });
}

export async function previewTicketUpdate(ticketId: string) {
  const detail = await getTicket(ticketId);
  if (!detail) throw new Error('Ticket not found.');
  const client = detail.ticket.ops_clients as OpsClient | undefined;
  const project = detail.ticket.ops_projects as OpsProject | undefined;
  if (!client || !project) throw new Error('Ticket is missing client or project.');
  const message = renderTicketUpdateMessage({
    client_name: client.name,
    project_name: project.project_name,
    ticket_title: detail.ticket.title,
    ticket_code: detail.ticket.ticket_code,
    ticket_type: ticketTypeLabel(detail.ticket.ticket_type),
    ticket_status: TICKET_STATUS_LABELS[detail.ticket.status] || detail.ticket.status,
    ticket_end_date: detail.ticket.current_end_date,
  });
  return withDelivery({ client_name: client.name, whatsapp_number: client.whatsapp_number, message });
}

export async function sendClientMessage(opts: {
  clientId: string;
  projectId?: string | null;
  ticketId?: string | null;
  messageType: string;
  message: string;
  userId: string;
}) {
  assertClientSafeMessage(opts.message);
  const detail = await getClient(opts.clientId);
  if (!detail) throw new Error('Client not found.');
  const recipient = detail.client.whatsapp_number;
  if (!recipient || !isValidWhatsAppNumber(recipient)) {
    throw new Error('This client does not have a valid WhatsApp number.');
  }
  await assertNotDuplicateSend(recipient, opts.message);
  const result = await sendWhatsAppText(recipient, opts.message);
  const communication = await recordCommunication({
    client_id: opts.clientId,
    project_id: opts.projectId,
    ticket_id: opts.ticketId,
    message_type: opts.messageType,
    recipient,
    message_body: opts.message,
    userId: opts.userId,
    result,
  });
  if (!result.ok) {
    throw new Error(result.error_message || 'Failed to send WhatsApp message.');
  }
  return communication;
}

export async function dashboardSummary() {
  const today = todayISO();
  const weekEnd = (() => {
    const d = new Date(`${today}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 7);
    return d.toISOString().slice(0, 10);
  })();
  const [projects, tickets] = await Promise.all([listProjects(), listTickets()]);
  const activeProjects = projects.filter((p) => !isClosedStatus(p.status)).length;
  const openTickets = tickets.filter((t) => !isClosedStatus(t.status)).length;
  const upcoming = [
    ...projects
      .filter((p) => !isClosedStatus(p.status) && p.current_end_date >= today && p.current_end_date <= weekEnd)
      .map((p) => ({
        kind: 'project' as const,
        id: p.id,
        client: p.ops_clients?.name ?? '',
        title: p.project_name,
        code: p.project_code,
        delivery: p.current_end_date,
        status: p.status,
        overdue: false,
      })),
    ...tickets
      .filter((t) => !isClosedStatus(t.status) && t.current_end_date >= today && t.current_end_date <= weekEnd)
      .map((t) => ({
        kind: 'ticket' as const,
        id: t.id,
        client: t.ops_clients?.name ?? '',
        title: t.title,
        code: t.ticket_code,
        delivery: t.current_end_date,
        status: t.status,
        overdue: false,
      })),
  ].sort((a, b) => a.delivery.localeCompare(b.delivery));

  return {
    activeProjects,
    openTickets,
    bugs: tickets.filter((t) => t.ticket_type === 'BUG' && !isClosedStatus(t.status)).length,
    features: tickets.filter((t) => t.ticket_type === 'FEATURE' && !isClosedStatus(t.status)).length,
    enhancements: tickets.filter((t) => t.ticket_type === 'ENHANCEMENT' && !isClosedStatus(t.status)).length,
    projectsDueThisWeek: projects.filter((p) => !isClosedStatus(p.status) && p.current_end_date >= today && p.current_end_date <= weekEnd).length,
    overdueProjects: projects.filter((p) => !isClosedStatus(p.status) && p.current_end_date < today).length,
    ticketsDueThisWeek: tickets.filter((t) => !isClosedStatus(t.status) && t.current_end_date >= today && t.current_end_date <= weekEnd).length,
    upcoming,
  };
}
