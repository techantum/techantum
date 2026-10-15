import { q } from '@/lib/finance/db';

export interface MasterList {
  list_key: string;
  label: string;
  description: string | null;
  sort_order: number;
}

export interface MasterItem {
  id: string;
  list_key: string;
  item_key: string;
  label: string;
  parent_key: string | null;
  sort_order: number;
  active: boolean;
}

const LISTS: MasterList[] = [
  { list_key: 'project_type', label: 'Project types', description: 'Kinds of project used on invoices, delivery projects, and requirement links.', sort_order: 10 },
  { list_key: 'project_package', label: 'Project packages', description: 'Packages available for each project type. Parent is the project type.', sort_order: 20 },
  { list_key: 'client_type', label: 'Client types', description: 'Billing client types. Parent india or international controls GST fields.', sort_order: 30 },
  { list_key: 'payment_mode', label: 'Payment modes', description: 'Modes used when recording invoice and receipt payments.', sort_order: 40 },
  { list_key: 'tax_treatment', label: 'Tax treatments', description: 'GST treatment options on an invoice.', sort_order: 50 },
  { list_key: 'currency', label: 'Currencies', description: 'Billing currencies.', sort_order: 60 },
  { list_key: 'gst_rate', label: 'GST rates', description: 'GST percentages used on invoice lines.', sort_order: 70 },
  { list_key: 'document_type', label: 'Document types', description: 'Finance document categories.', sort_order: 80 },
  { list_key: 'document_link', label: 'Document links', description: 'What a finance document can be linked to.', sort_order: 90 },
  { list_key: 'record_status', label: 'Active status', description: 'Active and inactive values for clients and vendors.', sort_order: 100 },
  { list_key: 'ops_project_status', label: 'Delivery project statuses', description: 'Statuses for delivery projects.', sort_order: 110 },
  { list_key: 'ticket_type', label: 'Ticket types', description: 'Ticket kinds.', sort_order: 120 },
  { list_key: 'ticket_status', label: 'Ticket statuses', description: 'Ticket workflow statuses.', sort_order: 130 },
  { list_key: 'requirement_project_status', label: 'Requirement project statuses', description: 'Statuses for requirement-link projects.', sort_order: 140 },
  { list_key: 'requirement_status', label: 'Requirement statuses', description: 'Submitted requirement statuses.', sort_order: 150 },
  { list_key: 'partner_type', label: 'Partner types', description: 'Partner account types.', sort_order: 160 },
  { list_key: 'partner_tier', label: 'Partner tiers', description: 'Partner tiers.', sort_order: 170 },
  { list_key: 'partner_status', label: 'Partner statuses', description: 'Partner account statuses.', sort_order: 180 },
  { list_key: 'partner_requirement_status', label: 'Partner requirement statuses', description: 'Statuses for partner requirement records.', sort_order: 190 },
];

type SeedItem = { list_key: string; item_key: string; label: string; parent_key?: string; sort_order: number };

const ITEMS: SeedItem[] = [
  ...['Website', 'Web Application', 'Mobile Application', 'CMS Website', 'UI/UX Design', 'Digital Marketing', 'Branding'].map((label, index) => ({
    list_key: 'project_type', item_key: label, label, sort_order: index + 1,
  })),
  ...[
    ['Website', 'Launch Website'],
    ['Website', 'Growth Website'],
    ['Website', 'Enterprise Website'],
    ['Web Application', 'Accelerate'],
    ['Web Application', 'Scale'],
    ['Web Application', 'Transform'],
    ['Mobile Application', 'Launch Mobile'],
    ['Mobile Application', 'Growth Mobile'],
    ['Mobile Application', 'Enterprise Mobile'],
    ['CMS Website', 'Launch Plan'],
    ['CMS Website', 'Growth Plan'],
    ['CMS Website', 'Enterprise Plan'],
    ['Web Application', 'MVP'],
    ['Web Application', 'Growth'],
    ['Web Application', 'Enterprise'],
    ['Mobile Application', 'Prototype'],
    ['Mobile Application', 'MVP'],
    ['UI/UX Design', 'Audit'],
    ['UI/UX Design', 'Product Design'],
    ['UI/UX Design', 'Design System'],
    ['Digital Marketing', 'Launch'],
    ['Digital Marketing', 'Growth'],
    ['Digital Marketing', 'Performance'],
    ['Branding', 'Identity'],
    ['Branding', 'Brand Kit'],
    ['Branding', 'Rebrand'],
  ].map(([parent, label], index) => ({
    list_key: 'project_package', item_key: `${parent}:${label}`, label, parent_key: parent, sort_order: index + 1,
  })),
  { list_key: 'client_type', item_key: 'indian_business', label: 'Indian Business', parent_key: 'india', sort_order: 1 },
  { list_key: 'client_type', item_key: 'indian_individual', label: 'Indian Individual', parent_key: 'india', sort_order: 2 },
  { list_key: 'client_type', item_key: 'international_business', label: 'International Business', parent_key: 'international', sort_order: 3 },
  { list_key: 'client_type', item_key: 'international_individual', label: 'International Individual', parent_key: 'international', sort_order: 4 },
  ...['Bank Transfer', 'UPI', 'Cheque', 'Cash', 'Card', 'Other'].map((label, index) => ({
    list_key: 'payment_mode', item_key: label, label, sort_order: index + 1,
  })),
  { list_key: 'tax_treatment', item_key: 'auto', label: 'Auto (CGST+SGST if same state, else IGST)', sort_order: 1 },
  { list_key: 'tax_treatment', item_key: 'cgst_sgst', label: 'Force CGST + SGST', sort_order: 2 },
  { list_key: 'tax_treatment', item_key: 'igst', label: 'Force IGST', sort_order: 3 },
  { list_key: 'tax_treatment', item_key: 'none', label: 'No GST', sort_order: 4 },
  ...['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD'].map((label, index) => ({
    list_key: 'currency', item_key: label, label, sort_order: index + 1,
  })),
  ...['0', '5', '12', '18', '28'].map((label, index) => ({
    list_key: 'gst_rate', item_key: label, label, sort_order: index + 1,
  })),
  ...[
    ['client_invoice', 'Invoice'],
    ['vendor_bill', 'Vendor bill'],
    ['vendor_invoice', 'Vendor invoice'],
    ['receipt', 'Receipt'],
    ['payslip', 'Payslip'],
    ['bank_statement', 'Bank statement'],
    ['tax_document', 'Tax document'],
    ['other', 'Other'],
  ].map(([item_key, label], index) => ({ list_key: 'document_type', item_key, label, sort_order: index + 1 })),
  ...[
    ['client', 'Client'],
    ['invoice', 'Invoice'],
    ['vendor', 'Vendor'],
    ['receipt', 'Receipt'],
    ['employee', 'Employee'],
    ['payslip', 'Payslip'],
    ['transaction', 'Transaction'],
  ].map(([item_key, label], index) => ({ list_key: 'document_link', item_key, label, sort_order: index + 1 })),
  { list_key: 'record_status', item_key: 'active', label: 'Active', sort_order: 1 },
  { list_key: 'record_status', item_key: 'inactive', label: 'Inactive', sort_order: 2 },
  ...[
    ['draft', 'Draft'],
    ['onboarding', 'Onboarding'],
    ['not_started', 'Not Started'],
    ['in_progress', 'In Progress'],
    ['on_hold', 'On Hold'],
    ['under_review', 'Under Review'],
    ['client_review', 'Client Review'],
    ['completed', 'Completed'],
    ['cancelled', 'Cancelled'],
  ].map(([item_key, label], index) => ({ list_key: 'ops_project_status', item_key, label, sort_order: index + 1 })),
  ...[
    ['FEATURE', 'Feature'],
    ['ENHANCEMENT', 'Enhancement'],
    ['BUG', 'Bug'],
  ].map(([item_key, label], index) => ({ list_key: 'ticket_type', item_key, label, sort_order: index + 1 })),
  ...[
    ['open', 'Open'],
    ['assigned', 'Assigned'],
    ['in_progress', 'In Progress'],
    ['testing', 'Testing'],
    ['client_review', 'Client Review'],
    ['on_hold', 'On Hold'],
    ['completed', 'Completed'],
    ['cancelled', 'Cancelled'],
  ].map(([item_key, label], index) => ({ list_key: 'ticket_status', item_key, label, sort_order: index + 1 })),
  ...[
    ['draft', 'Draft'],
    ['active', 'Active'],
    ['closed', 'Closed'],
  ].map(([item_key, label], index) => ({ list_key: 'requirement_project_status', item_key, label, sort_order: index + 1 })),
  ...[
    ['draft', 'Draft'],
    ['submitted', 'Submitted'],
    ['pending', 'Pending'],
    ['reviewed', 'Reviewed'],
    ['approved', 'Approved'],
    ['need_clarification', 'Need Clarification'],
  ].map(([item_key, label], index) => ({ list_key: 'requirement_status', item_key, label, sort_order: index + 1 })),
  { list_key: 'partner_type', item_key: 'sales', label: 'Sales Partner', sort_order: 1 },
  { list_key: 'partner_type', item_key: 'marketing', label: 'Marketing Partner', sort_order: 2 },
  { list_key: 'partner_type', item_key: 'business_development', label: 'Business Development', sort_order: 3 },
  ...['bronze', 'silver', 'gold', 'platinum'].map((item_key, index) => ({
    list_key: 'partner_tier', item_key, label: `${item_key[0].toUpperCase()}${item_key.slice(1)} Partner`, sort_order: index + 1,
  })),
  { list_key: 'partner_status', item_key: 'pending', label: 'Pending Invite', sort_order: 1 },
  { list_key: 'partner_status', item_key: 'active', label: 'Active', sort_order: 2 },
  { list_key: 'partner_status', item_key: 'suspended', label: 'Suspended', sort_order: 3 },
  { list_key: 'partner_status', item_key: 'archived', label: 'Archived', sort_order: 4 },
  ...[
    ['draft', 'Draft'],
    ['submitted', 'Submitted'],
    ['under_review', 'Under Review'],
    ['need_clarification', 'Need Clarification'],
    ['proposal_sent', 'Proposal Sent'],
    ['approved', 'Approved'],
    ['rejected', 'Rejected'],
    ['won', 'Won'],
    ['lost', 'Lost'],
    ['archived', 'Archived'],
  ].map(([item_key, label], index) => ({ list_key: 'partner_requirement_status', item_key, label, sort_order: index + 1 })),
];

let seeded = false;

export async function ensureMasterData() {
  if (seeded) return;
  for (const list of LISTS) {
    await q(
      undefined,
      `INSERT INTO admin_master_lists (list_key, label, description, sort_order)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (list_key) DO NOTHING`,
      [list.list_key, list.label, list.description, list.sort_order]
    );
  }
  for (const item of ITEMS) {
    await q(
      undefined,
      `INSERT INTO admin_master_items (list_key, item_key, label, parent_key, sort_order)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (list_key, item_key) DO NOTHING`,
      [item.list_key, item.item_key, item.label, item.parent_key || null, item.sort_order]
    );
  }
  seeded = true;
}

export async function listMasterLists() {
  await ensureMasterData();
  const { rows } = await q<MasterList>(
    undefined,
    `SELECT list_key, label, description, sort_order
     FROM admin_master_lists
     ORDER BY sort_order, label`
  );
  return rows;
}

export async function listMasterItems(listKey?: string, activeOnly = false) {
  await ensureMasterData();
  const { rows } = await q<MasterItem>(
    undefined,
    `SELECT id, list_key, item_key, label, parent_key, sort_order, active
     FROM admin_master_items
     WHERE ($1::text IS NULL OR list_key = $1)
       AND ($2::boolean = FALSE OR active = TRUE)
     ORDER BY sort_order, label`,
    [listKey || null, activeOnly]
  );
  return rows;
}

export async function createMasterItem(input: { list_key: string; label: string; item_key?: string; parent_key?: string }) {
  await ensureMasterData();
  const label = input.label.trim();
  if (!label) throw new Error('Label is required');
  const itemKey = (input.item_key || label).trim();
  const { rows: last } = await q<{ sort_order: number }>(
    undefined,
    `SELECT COALESCE(MAX(sort_order), 0)::int AS sort_order FROM admin_master_items WHERE list_key = $1`,
    [input.list_key]
  );
  const { rows } = await q<MasterItem>(
    undefined,
    `INSERT INTO admin_master_items (list_key, item_key, label, parent_key, sort_order)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING id, list_key, item_key, label, parent_key, sort_order, active`,
    [input.list_key, itemKey, label, input.parent_key?.trim() || null, Number(last[0]?.sort_order || 0) + 1]
  );
  return rows[0];
}

export async function updateMasterItem(id: string, input: { label?: string; parent_key?: string | null; active?: boolean; sort_order?: number }) {
  const current = await q<MasterItem>(undefined, 'SELECT * FROM admin_master_items WHERE id = $1', [id]);
  const row = current.rows[0];
  if (!row) throw new Error('Item not found');
  const { rows } = await q<MasterItem>(
    undefined,
    `UPDATE admin_master_items
     SET label = $2, parent_key = $3, active = $4, sort_order = $5, updated_at = NOW()
     WHERE id = $1
     RETURNING id, list_key, item_key, label, parent_key, sort_order, active`,
    [
      id,
      input.label?.trim() || row.label,
      input.parent_key === undefined ? row.parent_key : input.parent_key || null,
      input.active === undefined ? row.active : input.active,
      input.sort_order === undefined ? row.sort_order : input.sort_order,
    ]
  );
  return rows[0];
}
