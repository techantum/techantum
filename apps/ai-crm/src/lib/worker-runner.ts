import { claimJobs, completeJob } from './jobs';
import { runWorkflowTrigger } from './workflows';
import { runAiQualificationReply } from './whatsapp';
import { executeCall } from './voice';

export async function processOnce(limit = 10) {
  const jobs = await claimJobs(limit);
  const results: Array<{ id: string; ok: boolean; error?: string }> = [];

  for (const job of jobs) {
    try {
      const payload = job.payload || {};
      switch (job.job_type) {
        case 'workflow.trigger':
          await runWorkflowTrigger(job.workspace_id, payload.trigger, payload);
          break;
        case 'whatsapp.ai_reply':
          await runAiQualificationReply(
            job.workspace_id,
            payload.leadId,
            payload.conversationId,
            payload.body || '',
          );
          break;
        case 'voice.schedule': {
          const { scheduleCall } = await import('./voice');
          await scheduleCall(job.workspace_id, payload.leadId, payload);
          break;
        }
        case 'voice.execute':
          await executeCall(payload.callId);
          break;
        case 'documents.request_hot': {
          const { requestHotLeadDocuments } = await import('./document-verify');
          await requestHotLeadDocuments(job.workspace_id, payload.leadId);
          break;
        }
        case 'retention.purge': {
          const { purgeExpired } = await import('./retention');
          await purgeExpired(job.workspace_id);
          break;
        }
        case 'zoho.push_lead': {
          const { pushLeadToZoho } = await import('./zoho');
          const lead = (
            await (await import('./db')).query(`SELECT * FROM crm.leads WHERE id=$1`, [payload.leadId])
          ).rows[0];
          if (lead) await pushLeadToZoho(job.workspace_id, lead);
          break;
        }
        default:
          throw new Error(`Unknown job type ${job.job_type}`);
      }
      await completeJob(job.id);
      results.push({ id: job.id, ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'job failed';
      await completeJob(job.id, message);
      results.push({ id: job.id, ok: false, error: message });
    }
  }
  return results;
}
