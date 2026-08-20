export type ConversationMode = 'AI' | 'HYBRID' | 'HUMAN';
export type ConversationStatus = 'OPEN' | 'CLOSED' | 'ARCHIVED';
export type MessageDirection = 'INBOUND' | 'OUTBOUND';
export type MessageSenderType = 'CUSTOMER' | 'AI' | 'STAFF' | 'SYSTEM';
export type KnowledgeStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type LeadStage =
  | 'NEW'
  | 'ENGAGED'
  | 'REQUIREMENT_IDENTIFIED'
  | 'QUALIFIED'
  | 'PROPOSAL_REQUESTED'
  | 'HUMAN_FOLLOWUP'
  | 'CONVERTED'
  | 'LOST';

export type WhatsAppIntent =
  | 'GREETING'
  | 'GENERAL_ENQUIRY'
  | 'WEBSITE'
  | 'WEB_APPLICATION'
  | 'MOBILE_APPLICATION'
  | 'SAAS'
  | 'CRM'
  | 'CUSTOM_SOFTWARE'
  | 'UI_UX'
  | 'PRICING'
  | 'SUPPORT'
  | 'EXISTING_CLIENT'
  | 'PROPOSAL_REQUEST'
  | 'CALL_REQUEST'
  | 'MEETING_REQUEST'
  | 'COMPLAINT'
  | 'OUT_OF_SCOPE'
  | 'OTHER';

export interface ExtractedLeadData {
  name: string | null;
  company: string | null;
  email: string | null;
  service: string | null;
  project_type: string | null;
  requirement: string | null;
  budget: string | null;
  timeline: string | null;
  location: string | null;
}

export interface AIReplyStructured {
  reply_text: string;
  intent: WhatsAppIntent | string;
  is_techantum_related: boolean;
  knowledge_sufficient: boolean;
  lead_stage: LeadStage | string;
  handoff_required: boolean;
  handoff_reason: string | null;
  extracted_data: ExtractedLeadData;
}

export interface WhatsAppContact {
  id: string;
  phone_number: string;
  whatsapp_user_id: string | null;
  profile_name: string | null;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  email: string | null;
  location: string | null;
  lead_id: string | null;
  client_id: string | null;
  first_contact_at: string;
  last_contact_at: string;
}

export interface WhatsAppConversation {
  id: string;
  contact_id: string;
  status: ConversationStatus;
  mode: ConversationMode;
  assigned_user_id: string | null;
  ai_enabled: boolean;
  conversation_summary: string | null;
  last_ai_response_id: string | null;
  lead_stage: LeadStage | string;
  intent: string | null;
  handoff_required: boolean;
  handoff_reason: string | null;
  last_inbound_at: string | null;
  last_outbound_at: string | null;
  whatsapp_contacts?: WhatsAppContact;
}

export interface WhatsAppMessage {
  id: string;
  conversation_id: string;
  contact_id: string;
  whatsapp_message_id: string | null;
  direction: MessageDirection;
  sender_type: MessageSenderType;
  message_type: string;
  text_content: string | null;
  media_id: string | null;
  media_url: string | null;
  media_mime_type: string | null;
  delivery_status: string;
  ai_generated: boolean;
  error_message: string | null;
  created_at: string;
}

export interface AISettings {
  id: number;
  ai_enabled: boolean;
  default_mode: ConversationMode;
  auto_handoff: boolean;
  auto_lead_creation: boolean;
  auto_conversation_summary: boolean;
  knowledge_retrieval_limit: number;
  max_response_length: number;
  fallback_message: string;
  out_of_scope_message: string;
  business_hours: Record<string, unknown>;
  after_hours_message: string;
  handoff_mode: 'HUMAN' | 'HYBRID';
  updated_at?: string;
}

export interface KnowledgeEntry {
  id: string;
  category_id: string;
  title: string;
  content: string;
  keywords: string | null;
  status: KnowledgeStatus;
  allow_ai: boolean;
  ai_knowledge_categories?: { name: string; slug: string };
}

export interface InboundWhatsAppMessage {
  whatsapp_message_id: string;
  from: string;
  timestamp: string;
  type: string;
  text?: string;
  profile_name?: string;
  media_id?: string;
  media_mime_type?: string;
  raw: Record<string, unknown>;
}
