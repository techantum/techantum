import { crmMode, ensureEnv } from './env';
import { query } from './db';
import { extractFromChat, evaluateLead } from './qualification';
import { enqueueJob } from './jobs';

export type WhatsAppAdapter = {
  name: string;
  mode: 'sandbox' | 'live';
  sendTemplate: (input: {
    to: string;
    template: string;
    variables?: string[];
  }) => Promise<{ messageId: string; status: string }>;
  sendText: (input: { to: string; body: string }) => Promise<{ messageId: string; status: string }>;
};

function sandboxAdapter(): WhatsAppAdapter {
  return {
    name: 'sandbox',
    mode: 'sandbox',
    async sendTemplate({ to, template }) {
      return { messageId: `sandbox_tpl_${Date.now()}_${to}`, status: 'sent' };
    },
    async sendText({ to, body }) {
      return { messageId: `sandbox_txt_${Date.now()}_${to}`, status: 'sent' };
    },
  };
}

function liveAdapter(): WhatsAppAdapter {
  ensureEnv();
  const token = process.env.CRM_WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.CRM_WHATSAPP_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const version = (process.env.WHATSAPP_API_VERSION || process.env.META_GRAPH_API_VERSION || 'v21.0').replace(/^\//, '');
  const language = process.env.CRM_WHATSAPP_TEMPLATE_LANGUAGE || process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en';
  if (!token || !phoneId) return sandboxAdapter();

  return {
    name: 'meta_cloud',
    mode: 'live',
    async sendTemplate({ to, template, variables }) {
      const res = await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'template',
          template: {
            name: template,
            language: { code: language },
            components: variables?.length
              ? [{ type: 'body', parameters: variables.map((text) => ({ type: 'text', text })) }]
              : undefined,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || 'WhatsApp send failed');
      return { messageId: json.messages?.[0]?.id || `wa_${Date.now()}`, status: 'sent' };
    },
    async sendText({ to, body }) {
      const res = await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || 'WhatsApp send failed');
      return { messageId: json.messages?.[0]?.id || `wa_${Date.now()}`, status: 'sent' };
    },
  };
}

export function getWhatsAppAdapter(): WhatsAppAdapter {
  const token = process.env.CRM_WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.CRM_WHATSAPP_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_NUMBER_ID;
  // Prefer the Meta Cloud API whenever credentials are present.
  if (token && phoneId) return liveAdapter();
  if (crmMode() === 'live') return liveAdapter();
  return sandboxAdapter();
}

export async function ensureConversation(workspaceId: string, leadId: string) {
  const existing = await query(
    `SELECT * FROM crm.conversations WHERE workspace_id=$1 AND lead_id=$2 AND channel='whatsapp' ORDER BY created_at DESC LIMIT 1`,
    [workspaceId, leadId],
  );
  if (existing.rows[0]) return existing.rows[0];
  const { rows } = await query(
    `INSERT INTO crm.conversations (workspace_id, lead_id, channel, status, mode)
     VALUES ($1,$2,'whatsapp','open','AI') RETURNING *`,
    [workspaceId, leadId],
  );
  return rows[0];
}

export async function sendWhatsAppTemplate(workspaceId: string, leadId: string, template = 'welcome') {
  const lead = (
    await query(`SELECT * FROM crm.leads WHERE workspace_id=$1 AND id=$2`, [workspaceId, leadId])
  ).rows[0];
  if (!lead?.phone_normalized) throw new Error('Lead phone missing');
  if (lead.consent_status === 'opted_out') throw new Error('Lead opted out');

  const conversation = await ensureConversation(workspaceId, leadId);
  const adapter = getWhatsAppAdapter();
  const templateName =
    !template || template === 'welcome'
      ? process.env.CRM_WHATSAPP_TEMPLATE_NAME || process.env.WHATSAPP_TEMPLATE_NAME || 'welcome'
      : template;
  const sent = await adapter.sendTemplate({
    to: lead.phone_normalized,
    template: templateName,
    variables: [lead.full_name || 'there'],
  });

  await query(
    `INSERT INTO crm.messages (workspace_id, conversation_id, lead_id, direction, provider_message_id, body, status, payload)
     VALUES ($1,$2,$3,'outbound',$4,$5,'sent',$6::jsonb)`,
    [
      workspaceId,
      conversation.id,
      leadId,
      sent.messageId,
      `Template: ${templateName}`,
      JSON.stringify({ adapter: adapter.name, mode: adapter.mode, template: templateName }),
    ],
  );
  await query(
    `UPDATE crm.leads SET whatsapp_status='template_sent', updated_at=NOW(), last_engagement_at=NOW() WHERE id=$1`,
    [leadId],
  );
  await query(
    `UPDATE crm.conversations SET last_message_at=NOW() WHERE id=$1`,
    [conversation.id],
  );
  await query(
    `INSERT INTO crm.lead_activities (workspace_id, lead_id, activity_type, summary, payload)
     VALUES ($1,$2,'whatsapp.template_sent','WhatsApp template sent',$3::jsonb)`,
    [workspaceId, leadId, JSON.stringify({ template: templateName, messageId: sent.messageId, mode: adapter.mode })],
  );
  return sent;
}

export async function handleInboundMessage(input: {
  workspaceId: string;
  from: string;
  body: string;
  providerMessageId?: string;
}) {
  const phone = input.from.replace(/\D+/g, '');
  const leadRes = await query(
    `SELECT * FROM crm.leads WHERE workspace_id=$1 AND phone_normalized=$2 LIMIT 1`,
    [input.workspaceId, phone],
  );
  let lead = leadRes.rows[0];
  if (!lead) {
    const created = await query(
      `INSERT INTO crm.leads (workspace_id, full_name, phone, phone_normalized, source, consent_status, whatsapp_status)
       VALUES ($1,$2,$3,$4,'whatsapp_inbound','granted','responded') RETURNING *`,
      [input.workspaceId, input.from, input.from, phone],
    );
    lead = created.rows[0];
  }

  const conversation = await ensureConversation(input.workspaceId, lead.id);
  try {
    await query(
      `INSERT INTO crm.messages (workspace_id, conversation_id, lead_id, direction, provider_message_id, body, status)
       VALUES ($1,$2,$3,'inbound',$4,$5,'received')`,
      [input.workspaceId, conversation.id, lead.id, input.providerMessageId || null, input.body],
    );
  } catch {
    return { duplicate: true, leadId: lead.id };
  }

  await query(
    `UPDATE crm.leads SET whatsapp_status='responded', updated_at=NOW(), last_engagement_at=NOW() WHERE id=$1`,
    [lead.id],
  );
  await query(`UPDATE crm.conversations SET last_message_at=NOW() WHERE id=$1`, [conversation.id]);

  if (/^(stop|unsubscribe|opt\s*out|opt-out)$/i.test(input.body.trim())) {
    await query(
      `UPDATE crm.leads
       SET consent_status='opted_out', calling_consent='denied', whatsapp_status='opted_out', updated_at=NOW()
       WHERE id=$1`,
      [lead.id],
    );
    await query(`UPDATE crm.conversations SET mode='HUMAN', status='closed' WHERE id=$1`, [conversation.id]);
    const adapter = getWhatsAppAdapter();
    await adapter
      .sendText({ to: lead.phone_normalized || phone, body: 'You are opted out. We will not message or call you again.' })
      .catch(() => null);
    return { duplicate: false, leadId: lead.id, optedOut: true };
  }

  if (conversation.mode === 'AI') {
    await enqueueJob({
      workspaceId: input.workspaceId,
      jobType: 'whatsapp.ai_reply',
      payload: { leadId: lead.id, conversationId: conversation.id, body: input.body },
    });
  }

  await enqueueJob({
    workspaceId: input.workspaceId,
    jobType: 'workflow.trigger',
    payload: { trigger: 'whatsapp.response_received', leadId: lead.id },
  });

  return { duplicate: false, leadId: lead.id, conversationId: conversation.id };
}

export async function runAiQualificationReply(workspaceId: string, leadId: string, conversationId: string, body: string) {
  const msgs = await query(
    `SELECT direction, body FROM crm.messages WHERE conversation_id=$1 ORDER BY created_at ASC`,
    [conversationId],
  );
  const extracted = extractFromChat([...msgs.rows, { direction: 'inbound', body }]);
  const lead = (await query(`SELECT * FROM crm.leads WHERE id=$1`, [leadId])).rows[0];
  const result = evaluateLead({
    hasPhone: Boolean(lead?.phone_normalized),
    hasEmail: Boolean(lead?.email_normalized),
    ...extracted,
  });

  const { getOrCreateWhatsAppAgent, listKnowledge } = await import('./agents');
  const { generateAssistantReply } = await import('./llm');
  const { retrieveKnowledge } = await import('./rag');
  const agent = await getOrCreateWhatsAppAgent(workspaceId);
  const knowledge = await listKnowledge(workspaceId, agent.id);
  const ragHits = await retrieveKnowledge(workspaceId, agent.id, body, 4);
  const llm = await generateAssistantReply({
    instructions: `${agent.instructions}\n\nSupported languages: ${(agent.languages || []).join(', ')}\nDetect customer language and reply in that language when possible.\nCurrent qualification snapshot: ${JSON.stringify(result)}`,
    knowledge: [
      ...ragHits.map((h) => h.content),
      ...knowledge.map((k: any) => `# ${k.title}\n${k.content}`),
    ]
      .join('\n\n')
      .slice(0, 7000),
    messages: msgs.rows.map((m: any) => ({
      role: (m.direction === 'outbound' ? 'assistant' : 'user') as 'assistant' | 'user',
      content: m.body || '',
    })).concat([{ role: 'user', content: body }]),
  });
  const reply = llm.text;

  const adapter = getWhatsAppAdapter();
  const to = lead.phone_normalized;
  const sent = await adapter.sendText({ to, body: reply });
  await query(
    `INSERT INTO crm.messages (workspace_id, conversation_id, lead_id, direction, provider_message_id, body, status, payload)
     VALUES ($1,$2,$3,'outbound',$4,$5,'sent',$6::jsonb)`,
    [
      workspaceId,
      conversationId,
      leadId,
      sent.messageId,
      reply,
      JSON.stringify({ adapter: adapter.name, qualification: result, llm: { provider: llm.provider, mode: llm.mode } }),
    ],
  );

  await query(
    `UPDATE crm.leads SET
      validity_status=$2,
      qualification_status=$3,
      lead_score=$4,
      custom_attributes = COALESCE(custom_attributes,'{}'::jsonb) || $5::jsonb,
      updated_at=NOW()
     WHERE id=$1`,
    [
      leadId,
      result.validity,
      result.priority,
      result.score,
      JSON.stringify({ qualification_reasons: result.reasons, last_qualification: result }),
    ],
  );

  const stageCode = result.scheduleCall ? 'QUALIFIED' : extracted.responded ? 'IN_DISCUSSION' : 'NEW';
  const stage = await query(
    `SELECT id FROM crm.pipeline_stages WHERE workspace_id=$1 AND code=$2`,
    [workspaceId, stageCode],
  );
  if (stage.rows[0]) {
    await query(`UPDATE crm.leads SET pipeline_stage_id=$2 WHERE id=$1`, [leadId, stage.rows[0].id]);
  }

  await query(
    `UPDATE crm.conversations SET qualification=$2::jsonb, last_message_at=NOW() WHERE id=$1`,
    [conversationId, JSON.stringify(result)],
  );

  if (result.scheduleCall) {
    await enqueueJob({
      workspaceId,
      jobType: 'voice.schedule',
      payload: { leadId, reason: 'qualified' },
    });
  }
  if (result.priority === 'hot') {
    await enqueueJob({
      workspaceId,
      jobType: 'documents.request_hot',
      payload: { leadId },
    });
  }
  try {
    const { pushLeadToZoho } = await import('./zoho');
    await pushLeadToZoho(workspaceId, {
      ...lead,
      qualification_status: result.priority,
      lead_score: result.score,
    });
  } catch {
    /* zoho optional */
  }

  await enqueueJob({
    workspaceId,
    jobType: 'workflow.trigger',
    payload: { trigger: 'qualification.completed', leadId, result },
  });

  return { reply, result };
}
