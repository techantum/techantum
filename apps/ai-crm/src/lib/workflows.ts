import { query } from './db';
import { sendWhatsAppTemplate } from './whatsapp';
import { scheduleCall } from './voice';
import { evaluateLead } from './qualification';

export async function runWorkflowTrigger(workspaceId: string, trigger: string, payload: Record<string, any>) {
  const { rows: workflows } = await query(
    `SELECT * FROM crm.workflows WHERE workspace_id=$1 AND status='published' AND trigger_type=$2`,
    [workspaceId, trigger],
  );

  for (const wf of workflows) {
    const exec = (
      await query(
        `INSERT INTO crm.workflow_executions (workspace_id, workflow_id, lead_id, status, steps)
         VALUES ($1,$2,$3,'running','[]'::jsonb) RETURNING *`,
        [workspaceId, wf.id, payload.leadId || null],
      )
    ).rows[0];

    const steps: any[] = [];
    try {
      const defSteps = (wf.definition?.steps || []) as Array<Record<string, any>>;
      for (const step of defSteps) {
        const result = await runStep(workspaceId, step, payload);
        steps.push({ step, result, at: new Date().toISOString() });
        await query(`UPDATE crm.workflow_executions SET steps=$2::jsonb WHERE id=$1`, [
          exec.id,
          JSON.stringify(steps),
        ]);
      }
      await query(
        `UPDATE crm.workflow_executions SET status='completed', finished_at=NOW(), steps=$2::jsonb WHERE id=$1`,
        [exec.id, JSON.stringify(steps)],
      );
    } catch (error) {
      await query(
        `UPDATE crm.workflow_executions SET status='failed', error=$2, finished_at=NOW(), steps=$3::jsonb WHERE id=$1`,
        [exec.id, error instanceof Error ? error.message : 'failed', JSON.stringify(steps)],
      );
    }
  }
}

async function runStep(workspaceId: string, step: Record<string, any>, payload: Record<string, any>) {
  const leadId = payload.leadId as string | undefined;
  switch (step.type) {
    case 'validate_consent': {
      if (!leadId) return { skipped: true };
      const lead = (await query(`SELECT consent_status FROM crm.leads WHERE id=$1`, [leadId])).rows[0];
      if (lead?.consent_status === 'opted_out') throw new Error('Consent opted out');
      if (!lead?.consent_status || lead.consent_status === 'unknown') {
        await query(`UPDATE crm.leads SET consent_status='implied' WHERE id=$1`, [leadId]);
      }
      return { ok: true };
    }
    case 'send_whatsapp_template': {
      if (!leadId) return { skipped: true };
      return sendWhatsAppTemplate(workspaceId, leadId, step.template || 'welcome');
    }
    case 'wait_for_reply':
      return { waiting: true };
    case 'start_ai_qualification':
      return { started: true };
    case 'evaluate_lead': {
      if (!leadId) return { skipped: true };
      const lead = (await query(`SELECT * FROM crm.leads WHERE id=$1`, [leadId])).rows[0];
      const result = evaluateLead({
        hasPhone: Boolean(lead?.phone_normalized),
        hasEmail: Boolean(lead?.email_normalized),
        responded: lead?.whatsapp_status === 'responded',
        intentScore: Number(lead?.lead_score || 0) > 0 ? 10 : 0,
      });
      await query(
        `UPDATE crm.leads SET validity_status=$2, qualification_status=$3, lead_score=$4, updated_at=NOW() WHERE id=$1`,
        [leadId, result.validity, result.priority, result.score],
      );
      return result;
    }
    case 'schedule_ai_call_if_qualified': {
      if (!leadId) return { skipped: true };
      const lead = (await query(`SELECT qualification_status FROM crm.leads WHERE id=$1`, [leadId])).rows[0];
      if (!['hot', 'warm'].includes(lead?.qualification_status)) return { skipped: true, reason: 'not_qualified' };
      // Do not schedule merely because WhatsApp was sent — only after qualification status is hot/warm
      return scheduleCall(workspaceId, leadId, { fromWorkflow: true });
    }
    case 'assign_sales_agent': {
      if (!leadId) return { skipped: true };
      const agent = (
        await query(
          `SELECT id FROM crm.users WHERE workspace_id=$1 AND role IN ('sales_agent','sales_manager') AND status='active' ORDER BY created_at ASC LIMIT 1`,
          [workspaceId],
        )
      ).rows[0];
      if (agent) {
        await query(`UPDATE crm.leads SET assigned_user_id=$2 WHERE id=$1`, [leadId, agent.id]);
      }
      return { assignedUserId: agent?.id || null };
    }
    case 'create_task': {
      if (!leadId) return { skipped: true };
      const { rows } = await query(
        `INSERT INTO crm.tasks (workspace_id, lead_id, title, priority, status, due_at)
         VALUES ($1,$2,$3,$4,'open', NOW() + INTERVAL '1 day') RETURNING *`,
        [workspaceId, leadId, step.title || 'Follow up', step.priority || 'medium'],
      );
      return rows[0];
    }
    case 'change_pipeline_stage': {
      if (!leadId || !step.stageCode) return { skipped: true };
      const stage = await query(
        `SELECT id FROM crm.pipeline_stages WHERE workspace_id=$1 AND code=$2`,
        [workspaceId, step.stageCode],
      );
      if (stage.rows[0]) {
        await query(`UPDATE crm.leads SET pipeline_stage_id=$2, updated_at=NOW() WHERE id=$1`, [
          leadId,
          stage.rows[0].id,
        ]);
      }
      return { stageCode: step.stageCode };
    }
    default:
      return { unknownStep: step.type };
  }
}
