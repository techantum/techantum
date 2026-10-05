import type { LeadStage, WhatsAppConversation } from './types';

export const LEAD_PIPELINE: { id: LeadStage; label: string; tone: 'emerald' | 'sky' | 'violet' | 'amber' | 'green' | 'rose' }[] = [
  { id: 'NEW', label: 'New Lead', tone: 'emerald' },
  { id: 'IN_DISCUSSION', label: 'In Discussion', tone: 'sky' },
  { id: 'QUALIFIED', label: 'Qualified', tone: 'violet' },
  { id: 'APPOINTMENT_BOOKED', label: 'Appointment Booked', tone: 'amber' },
  { id: 'CONVERTED', label: 'Converted', tone: 'green' },
  { id: 'LOST', label: 'Lost', tone: 'rose' },
];

const LEGACY_DISCUSSION = new Set(['ENGAGED', 'REQUIREMENT_IDENTIFIED', 'PROPOSAL_REQUESTED', 'HUMAN_FOLLOWUP']);

export function normalizeLeadStage(stage?: string | null): LeadStage {
  if (!stage) return 'NEW';
  if (LEGACY_DISCUSSION.has(stage)) return 'IN_DISCUSSION';
  if (LEAD_PIPELINE.some((item) => item.id === stage)) return stage as LeadStage;
  return 'IN_DISCUSSION';
}

export function pipelineStage(row: Pick<WhatsAppConversation, 'lead_stage'> & { appointment?: { id?: string } | null }): LeadStage {
  const stage = normalizeLeadStage(row.lead_stage);
  if (stage === 'CONVERTED' || stage === 'LOST') return stage;
  if (row.appointment?.id || stage === 'APPOINTMENT_BOOKED') return 'APPOINTMENT_BOOKED';
  return stage;
}

export function leadStageLabel(stage?: string | null) {
  const normalized = normalizeLeadStage(stage);
  return LEAD_PIPELINE.find((item) => item.id === normalized)?.label || stage || 'New Lead';
}

export function leadStageTone(stage?: string | null) {
  const normalized = normalizeLeadStage(stage);
  return LEAD_PIPELINE.find((item) => item.id === normalized)?.tone || 'emerald';
}

export const LEAD_STAGE_VALUES = LEAD_PIPELINE.map((item) => item.id) as LeadStage[];
