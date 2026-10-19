import { randomBytes } from 'crypto';
import { assertClientSafeMessage, renderTicketUpdateMessage, renderProjectUpdateMessage, renderWelcomeMessage, ticketTypeLabel } from '@/lib/ops/messages';
import { isValidWhatsAppNumber, normalizeWhatsAppNumber } from '@/lib/ops/phone';
import { getWhatsAppDeliveryInfo, sendWhatsAppText } from '@/lib/ops/whatsapp';
import { q } from '@/lib/finance/db';
import { FinanceNotFoundError, FinanceValidationError } from '@/lib/finance/errors';
import { writePmAudit } from './audit';
import { effectiveEnd } from './calculate';
import { createProject } from './projects';

const TICKET_STATUS: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  client_review: 'Client Review',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

async function projectClient(projectId: string) {
  const { rows } = await q(
    undefined,
    `SELECT p.*, c.name AS client_name, c.whatsapp_number, c.id AS client_ref, ty.name AS type_name
     FROM project_management_projects p
     LEFT JOIN ops_clients c ON c.id = p.client_id
     LEFT JOIN project_management_project_types ty ON ty.id = p.project_type_id
     WHERE p.id = $1`,
    [projectId]
  );
  if (!rows[0]) throw new FinanceNotFoundError('Project not found');
  if (!rows[0].client_ref) throw new FinanceValidationError('Choose a client with a WhatsApp number before sending an update.');
  return rows[0];
}

function deliveryDate(row: Record<string, unknown>) {
  return effectiveEnd(row.planned_end_date as string | null, row.revised_end_date as string | null) || 'To be confirmed';
}

export async function previewProjectMessage(projectId: string, kind: 'welcome' | 'update', note?: string) {
  const row = await projectClient(projectId);
  const message = kind === 'welcome'
    ? renderWelcomeMessage({
      client_name: String(row.client_name || 'there'),
      project_type: String(row.type_name || 'project'),
      package_name: String(row.project_name),
      start_date: String(row.start_date || 'To be confirmed'),
      end_date: String(deliveryDate(row)),
    })
    : renderProjectUpdateMessage({
      client_name: String(row.client_name || 'there'),
      project_name: String(row.project_name),
      status: String(row.category || '').replaceAll('_', ' '),
      status_or_update: note?.trim() || 'Work is progressing as planned.',
      current_delivery_date: String(deliveryDate(row)),
    });
  return {
    client_name: row.client_name,
    whatsapp_number: row.whatsapp_number,
    message,
    delivery: await getWhatsAppDeliveryInfo(),
  };
}

export async function sendProjectMessage(projectId: string, message: string, userId: string, kind: string) {
  assertClientSafeMessage(message);
  const row = await projectClient(projectId);
  return deliver(String(row.client_ref), String(row.whatsapp_number || ''), message, userId, kind, projectId, null);
}

export async function listTickets(projectId?: string) {
  const values: unknown[] = [];
  let where = '';
  if (projectId) {
    values.push(projectId);
    where = 'WHERE t.project_id = $1';
  }
  const { rows } = await q(
    undefined,
    `SELECT t.*, p.project_code, p.project_name, c.name AS client_name,
            e.full_name AS assigned_name, e.status AS assigned_status, e.department AS assigned_department,
            r.requirement_code, r.title AS requirement_title
     FROM project_management_tickets t
     JOIN project_management_projects p ON p.id = t.project_id
     LEFT JOIN ops_clients c ON c.id = p.client_id
     LEFT JOIN finance_employees e ON e.id = t.assigned_employee_id
     LEFT JOIN project_management_requirements r ON r.id = t.requirement_id
     ${where}
     ORDER BY t.created_at DESC`,
    values
  );
  return rows;
}

export async function getTicket(id: string) {
  const rows = await listTickets();
  const row = rows.find((item) => item.id === id);
  if (!row) throw new FinanceNotFoundError('Ticket not found');
  return row;
}

export async function createTicket(body: Record<string, unknown>, userId: string) {
  const title = String(body.title || '').trim();
  const projectId = String(body.project_id || '');
  if (!title) throw new FinanceValidationError('Ticket title is required');
  if (!projectId) throw new FinanceValidationError('Choose the existing project');
  const project = await q(undefined, `SELECT id, archived_at FROM project_management_projects WHERE id=$1`, [projectId]);
  if (!project.rows[0]) throw new FinanceNotFoundError('Project not found');
  if (project.rows[0].archived_at) throw new FinanceValidationError('Archived projects cannot receive new tickets');
  const types = ['FEATURE', 'ENHANCEMENT', 'BUG', 'bug', 'change_request', 'support', 'improvement', 'task', 'issue', 'client_request'];
  const type = types.includes(String(body.ticket_type)) ? String(body.ticket_type) : 'issue';
  const priorities = ['critical', 'high', 'medium', 'low'];
  const priority = priorities.includes(String(body.priority)) ? String(body.priority) : 'medium';
  if (body.assigned_employee_id) {
    const employee = await q(undefined, `SELECT status FROM finance_employees WHERE id=$1`, [body.assigned_employee_id]);
    if (!employee.rows[0]) throw new FinanceNotFoundError('Assigned employee was not found in HR');
    if (employee.rows[0].status !== 'active') throw new FinanceValidationError('Inactive employees cannot be assigned');
  }
  const { rows: codeRows } = await q<{ pm_next_code: string }>(undefined, `SELECT pm_next_code('TKT', 3)`);
  const { rows } = await q(
    undefined,
    `INSERT INTO project_management_tickets
      (ticket_code, project_id, requirement_id, ticket_type, title, description, priority, severity, status,
       assigned_employee_id, raised_by_employee_id, due_date, estimated_hours, start_date, end_date, created_by, updated_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'open',$9,$10,$11,$12,$13,$14,$15,$15) RETURNING *`,
    [
      codeRows[0]?.pm_next_code, projectId, body.requirement_id || null, type, title, body.description || null,
      priority, body.severity || null, body.assigned_employee_id || null, body.raised_by_employee_id || null,
      body.due_date || body.end_date || null, body.estimated_hours || null, body.start_date || null, body.end_date || body.due_date || null, userId,
    ]
  );
  await writePmAudit(undefined, { userId, entityType: 'ticket', entityId: rows[0].id, projectId, action: 'Ticket Created', next: rows[0] });
  await q(undefined, `INSERT INTO project_management_events (event_key, project_id, entity_type, entity_id, employee_id) VALUES ('ticket.created',$1,'ticket',$2,$3)`, [projectId, rows[0].id, body.assigned_employee_id || null]);
  return rows[0];
}

export async function previewTicketMessage(ticketId: string) {
  const ticket = await getTicket(ticketId);
  const message = renderTicketUpdateMessage({
    client_name: String(ticket.client_name || 'there'),
    project_name: String(ticket.project_name),
    ticket_title: String(ticket.title),
    ticket_code: String(ticket.ticket_code),
    ticket_type: ticketTypeLabel(String(ticket.ticket_type)),
    ticket_status: TICKET_STATUS[String(ticket.status)] || String(ticket.status),
    ticket_end_date: String(ticket.end_date || 'To be confirmed'),
  });
  const project = await projectClient(String(ticket.project_id));
  return {
    client_name: project.client_name,
    whatsapp_number: project.whatsapp_number,
    message,
    delivery: await getWhatsAppDeliveryInfo(),
  };
}

export async function sendTicketMessage(ticketId: string, message: string, userId: string) {
  assertClientSafeMessage(message);
  const ticket = await getTicket(ticketId);
  const project = await projectClient(String(ticket.project_id));
  return deliver(String(project.client_ref), String(project.whatsapp_number || ''), message, userId, 'ticket_update', String(ticket.project_id), ticketId);
}

async function deliver(clientId: string, whatsapp: string, message: string, userId: string, messageType: string, projectId: string, ticketId: string | null) {
  const recipient = normalizeWhatsAppNumber(whatsapp);
  if (!recipient || !isValidWhatsAppNumber(recipient)) {
    throw new FinanceValidationError('This client does not have a valid WhatsApp number.');
  }
  const since = new Date(Date.now() - 60_000).toISOString();
  const recent = await q(undefined, `SELECT id FROM ops_client_communications WHERE recipient=$1 AND message_body=$2 AND status='sent' AND created_at >= $3 LIMIT 1`, [recipient, message, since]);
  if (recent.rows[0]) throw new FinanceValidationError('This message was already sent in the last minute.');
  const result = await sendWhatsAppText(recipient, message);
  await q(
    undefined,
    `INSERT INTO ops_client_communications
      (client_id, channel, message_type, recipient, message_body, provider_message_id, status, error_message, sent_by, sent_at, pm_project_id, pm_ticket_id)
     VALUES ($1,'whatsapp',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [clientId, messageType, recipient, message, result.provider_message_id, result.status, result.error_message, userId, result.ok ? new Date().toISOString() : null, projectId, ticketId]
  );
  if (!result.ok) throw new FinanceValidationError(result.error_message || 'Failed to send WhatsApp message.');
  return { ok: true };
}

export async function listRequirementLinks() {
  const { rows } = await q(undefined, `SELECT * FROM project_management_requirement_links ORDER BY created_at DESC`);
  return rows.map((row) => ({ ...row, share_url: shareUrl(String(row.token)) }));
}

function shareUrl(token: string) {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.SITE_URL || 'http://localhost:3005').replace(/\/$/, '');
  return `${base}/requirements/link/${token}`;
}

export async function createRequirementLink(body: Record<string, unknown>, userId: string) {
  const token = randomBytes(18).toString('hex');
  const { rows } = await q(
    undefined,
    `INSERT INTO project_management_requirement_links
      (token, client_name, company_name, email, whatsapp_number, project_name, project_type, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [
      token,
      body.client_name || null,
      body.company_name || null,
      body.email || null,
      normalizeWhatsAppNumber(String(body.whatsapp_number || '')) || body.whatsapp_number || null,
      body.project_name || null,
      body.project_type || null,
      userId,
    ]
  );
  return { ...rows[0], share_url: shareUrl(token) };
}

export async function publicRequirement(token: string) {
  const { rows } = await q(undefined, `SELECT id, token, client_name, company_name, email, whatsapp_number, project_name, project_type, brief, preferred_start, references_text, status FROM project_management_requirement_links WHERE token=$1`, [token]);
  if (!rows[0]) throw new FinanceNotFoundError('This link is not available');
  if (rows[0].status === 'used') throw new FinanceValidationError('This requirement has already been received.');
  return rows[0];
}

export async function submitRequirement(token: string, body: Record<string, unknown>) {
  const current = await publicRequirement(token);
  if (current.status === 'submitted') throw new FinanceValidationError('This form was already submitted.');
  const clientName = String(body.client_name || '').trim();
  const brief = String(body.brief || '').trim();
  if (!clientName) throw new FinanceValidationError('Your name is required');
  if (!brief) throw new FinanceValidationError('Tell us what you need built');
  const whatsapp = normalizeWhatsAppNumber(String(body.whatsapp_number || '')) || String(body.whatsapp_number || '').trim();
  const { rows } = await q(
    undefined,
    `UPDATE project_management_requirement_links SET
       client_name=$2, company_name=$3, email=$4, whatsapp_number=$5, project_name=$6,
       brief=$7, preferred_start=$8, references_text=$9, status='submitted', submitted_at=NOW()
     WHERE token=$1 RETURNING id, status`,
    [token, clientName, body.company_name || null, body.email || null, whatsapp || null, body.project_name || current.project_name, brief, body.preferred_start || null, body.references_text || null]
  );
  return rows[0];
}

export async function createProjectFromRequirement(id: string, userId: string) {
  const { rows } = await q(undefined, 'SELECT * FROM project_management_requirement_links WHERE id=$1', [id]);
  const link = rows[0];
  if (!link) throw new FinanceNotFoundError('Requirement link not found');
  if (link.status !== 'submitted') throw new FinanceValidationError('Wait until the client submits the form.');
  if (link.pm_project_id) throw new FinanceValidationError('A project was already created from this requirement.');
  const clientId = await findOrCreateClient(link, userId);
  const type = link.project_type
    ? await q(undefined, 'SELECT id FROM project_management_project_types WHERE lower(name)=lower($1)', [link.project_type])
    : { rows: [] as { id: string }[] };
  const project = await createProject({
    client_id: clientId,
    project_name: link.project_name || `${link.company_name || link.client_name} project`,
    project_type_id: type.rows[0]?.id,
    category: 'planned_to_onboard',
    start_date: link.preferred_start,
    notes: [link.brief, link.references_text ? `References: ${link.references_text}` : ''].filter(Boolean).join('\n\n'),
  }, userId);
  await q(undefined, `UPDATE project_management_requirement_links SET status='used', pm_project_id=$2 WHERE id=$1`, [id, project.id]);
  return project;
}

async function findOrCreateClient(link: Record<string, unknown>, userId: string) {
  const email = String(link.email || '').trim();
  const whatsapp = String(link.whatsapp_number || '').trim();
  const name = String(link.company_name || link.client_name || '').trim();
  const found = await q(
    undefined,
    `SELECT id FROM ops_clients
     WHERE ($1 <> '' AND lower(email)=lower($1))
        OR ($2 <> '' AND regexp_replace(whatsapp_number, '\\D', '', 'g') = regexp_replace($2, '\\D', '', 'g'))
     LIMIT 1`,
    [email, whatsapp]
  );
  if (found.rows[0]) return found.rows[0].id;
  const code = await q<{ ops_next_code: string }>(undefined, `SELECT ops_next_code('client')`);
  const inserted = await q(
    undefined,
    `INSERT INTO ops_clients (client_code, name, contact_number, whatsapp_number, email, status, created_by, updated_by)
     VALUES ($1,$2,$3,$4,$5,'active',$6,$6) RETURNING id`,
    [code.rows[0]?.ops_next_code, name || 'Client', whatsapp || null, whatsapp || null, email || null, userId]
  );
  return inserted.rows[0].id;
}
