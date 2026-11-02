export const LEAD_PIPELINE = [
  { id: 'NEW', label: 'New Lead', tone: 'emerald' },
  { id: 'CONTACT_INITIATED', label: 'Contact Initiated', tone: 'sky' },
  { id: 'CUSTOMER_RESPONDED', label: 'Customer Responded', tone: 'sky' },
  { id: 'AI_QUALIFYING', label: 'AI Qualifying', tone: 'violet' },
  { id: 'IN_DISCUSSION', label: 'In Discussion', tone: 'sky' },
  { id: 'QUALIFIED', label: 'Qualified', tone: 'violet' },
  { id: 'AI_CALL_COMPLETED', label: 'AI Call Completed', tone: 'amber' },
  { id: 'SALES_FOLLOWUP', label: 'Sales Follow-up', tone: 'amber' },
  { id: 'PROPOSAL', label: 'Proposal / Negotiation', tone: 'amber' },
  { id: 'APPOINTMENT_BOOKED', label: 'Appointment Booked', tone: 'amber' },
  { id: 'CONVERTED', label: 'Won', tone: 'green' },
  { id: 'LOST', label: 'Lost', tone: 'rose' },
] as const;

export type LeadStage = (typeof LEAD_PIPELINE)[number]['id'];

export function leadStageLabel(stage?: string | null) {
  return LEAD_PIPELINE.find((s) => s.id === stage)?.label || stage || 'New Lead';
}

export function leadStageTone(stage?: string | null) {
  return LEAD_PIPELINE.find((s) => s.id === stage)?.tone || 'emerald';
}
