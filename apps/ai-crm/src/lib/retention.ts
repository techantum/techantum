import { query } from './db';
import { getWorkspaceSettings } from './settings';

export async function purgeExpired(workspaceId: string) {
  const settings = await getWorkspaceSettings(workspaceId);
  const policy = settings.retention_policy || {};
  const messageDays = Number(policy.messageDays || 180);
  const recordingDays = Number(policy.recordingDays || 90);
  const documentDays = Number(policy.documentDays || 365);

  const messages = await query(
    `DELETE FROM crm.messages
     WHERE workspace_id=$1 AND created_at < NOW() - ($2 || ' days')::interval
     RETURNING id`,
    [workspaceId, String(messageDays)],
  );
  const recordings = await query(
    `UPDATE crm.voice_calls
     SET transcript=NULL, recording_url=NULL, summary='Recording expired by retention policy'
     WHERE workspace_id=$1
       AND ended_at IS NOT NULL
       AND ended_at < NOW() - ($2 || ' days')::interval
       AND (transcript IS NOT NULL OR recording_url IS NOT NULL)
     RETURNING id`,
    [workspaceId, String(recordingDays)],
  );
  const documents = await query(
    `DELETE FROM crm.documents
     WHERE workspace_id=$1 AND created_at < NOW() - ($2 || ' days')::interval
     RETURNING id`,
    [workspaceId, String(documentDays)],
  );
  return {
    messages: messages.rowCount || 0,
    recordings: recordings.rowCount || 0,
    documents: documents.rowCount || 0,
  };
}

export async function eraseLead(workspaceId: string, leadId: string, actorUserId?: string | null) {
  const lead = (await query(`SELECT id FROM crm.leads WHERE workspace_id=$1 AND id=$2`, [workspaceId, leadId])).rows[0];
  if (!lead) return null;
  await query(`DELETE FROM crm.messages WHERE workspace_id=$1 AND lead_id=$2`, [workspaceId, leadId]);
  await query(`DELETE FROM crm.documents WHERE workspace_id=$1 AND lead_id=$2`, [workspaceId, leadId]);
  await query(
    `UPDATE crm.voice_calls
     SET transcript=NULL, recording_url=NULL, summary='Erased on customer request', disposition='erased'
     WHERE workspace_id=$1 AND lead_id=$2`,
    [workspaceId, leadId],
  );
  await query(
    `UPDATE crm.leads
     SET full_name='Erased customer', phone=NULL, phone_normalized=NULL, email=NULL, email_normalized=NULL,
         notes='Erased on customer request', consent_status='opted_out', calling_consent='denied',
         whatsapp_status='opted_out', ai_calling_status='cancelled', updated_at=NOW()
     WHERE workspace_id=$1 AND id=$2`,
    [workspaceId, leadId],
  );
  await query(
    `INSERT INTO crm.deletion_requests (workspace_id, lead_id, requested_by, status, scope)
     VALUES ($1,$2,$3,'completed','lead_erasure')`,
    [workspaceId, leadId, actorUserId || null],
  );
  return { erased: true };
}
