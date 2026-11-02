import { query, withTransaction } from './db';
import { normalizeEmail, normalizePhone } from './normalize';
import { enqueueJob } from './jobs';
import { writeAudit } from './audit';

export type LeadInput = {
  workspaceId: string;
  fullName?: string;
  phone?: string;
  email?: string;
  source?: string;
  campaign?: string;
  externalSourceLeadId?: string;
  customAttributes?: Record<string, unknown>;
  assignedUserId?: string | null;
  consentStatus?: string;
  notes?: string;
  tags?: string[];
  actorUserId?: string | null;
};

export async function listLeads(opts: {
  workspaceId: string;
  q?: string;
  stage?: string;
  source?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, opts.page || 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize || 25));
  const offset = (page - 1) * pageSize;
  const params: unknown[] = [opts.workspaceId];
  const where = ['l.workspace_id = $1'];

  if (opts.q?.trim()) {
    params.push(`%${opts.q.trim()}%`);
    where.push(
      `(l.full_name ILIKE $${params.length} OR l.email ILIKE $${params.length} OR l.phone ILIKE $${params.length} OR l.campaign ILIKE $${params.length})`,
    );
  }
  if (opts.stage) {
    params.push(opts.stage);
    where.push(`ps.code = $${params.length}`);
  }
  if (opts.source) {
    params.push(opts.source);
    where.push(`l.source = $${params.length}`);
  }

  const whereSql = where.join(' AND ');
  const count = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM crm.leads l
     LEFT JOIN crm.pipeline_stages ps ON ps.id = l.pipeline_stage_id
     WHERE ${whereSql}`,
    params,
  );

  params.push(pageSize, offset);
  const { rows } = await query(
    `SELECT l.*, ps.code AS stage_code, ps.label AS stage_label,
            u.full_name AS assigned_name
     FROM crm.leads l
     LEFT JOIN crm.pipeline_stages ps ON ps.id = l.pipeline_stage_id
     LEFT JOIN crm.users u ON u.id = l.assigned_user_id
     WHERE ${whereSql}
     ORDER BY l.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );

  return {
    items: rows,
    total: Number(count.rows[0]?.count || 0),
    page,
    pageSize,
  };
}

export async function getLead(workspaceId: string, id: string) {
  const { rows } = await query(
    `SELECT l.*, ps.code AS stage_code, ps.label AS stage_label, u.full_name AS assigned_name
     FROM crm.leads l
     LEFT JOIN crm.pipeline_stages ps ON ps.id = l.pipeline_stage_id
     LEFT JOIN crm.users u ON u.id = l.assigned_user_id
     WHERE l.workspace_id=$1 AND l.id=$2`,
    [workspaceId, id],
  );
  return rows[0] || null;
}

export async function createOrUpsertLead(input: LeadInput) {
  const phoneNorm = normalizePhone(input.phone);
  const emailNorm = normalizeEmail(input.email);
  const source = input.source || 'manual';

  return withTransaction(async (q) => {
    let existing: any = null;
    if (input.externalSourceLeadId) {
      const r = await q(
        `SELECT * FROM crm.leads WHERE workspace_id=$1 AND source=$2 AND external_source_lead_id=$3 LIMIT 1`,
        [input.workspaceId, source, input.externalSourceLeadId],
      );
      existing = r.rows[0] || null;
    }
    if (!existing && phoneNorm) {
      const r = await q(
        `SELECT * FROM crm.leads WHERE workspace_id=$1 AND phone_normalized=$2 LIMIT 1`,
        [input.workspaceId, phoneNorm],
      );
      existing = r.rows[0] || null;
    }
    if (!existing && emailNorm) {
      const r = await q(
        `SELECT * FROM crm.leads WHERE workspace_id=$1 AND email_normalized=$2 LIMIT 1`,
        [input.workspaceId, emailNorm],
      );
      existing = r.rows[0] || null;
    }

    const stage = await q(
      `SELECT id FROM crm.pipeline_stages WHERE workspace_id=$1 AND code='NEW' LIMIT 1`,
      [input.workspaceId],
    );
    const stageId = stage.rows[0]?.id || null;

    if (existing) {
      const mergedAttrs = {
        ...(existing.custom_attributes || {}),
        ...(input.customAttributes || {}),
        _original_submissions: [
          ...((existing.custom_attributes?._original_submissions as unknown[]) || []),
          {
            at: new Date().toISOString(),
            source,
            externalSourceLeadId: input.externalSourceLeadId || null,
            payload: input.customAttributes || {},
          },
        ],
      };
      const updated = await q(
        `UPDATE crm.leads SET
          full_name = COALESCE(NULLIF($3,''), full_name),
          phone = COALESCE(NULLIF($4,''), phone),
          phone_normalized = COALESCE(NULLIF($5,''), phone_normalized),
          email = COALESCE(NULLIF($6,''), email),
          email_normalized = COALESCE(NULLIF($7,''), email_normalized),
          campaign = COALESCE(NULLIF($8,''), campaign),
          custom_attributes = $9::jsonb,
          updated_at = NOW(),
          last_engagement_at = NOW()
         WHERE id=$1 AND workspace_id=$2
         RETURNING *`,
        [
          existing.id,
          input.workspaceId,
          input.fullName || '',
          input.phone || '',
          phoneNorm,
          input.email || '',
          emailNorm,
          input.campaign || '',
          JSON.stringify(mergedAttrs),
        ],
      );
      await q(
        `INSERT INTO crm.lead_activities (workspace_id, lead_id, actor_user_id, activity_type, summary, payload)
         VALUES ($1,$2,$3,'lead.upsert','Duplicate lead merged from source', $4::jsonb)`,
        [input.workspaceId, existing.id, input.actorUserId || null, JSON.stringify({ source, externalSourceLeadId: input.externalSourceLeadId })],
      );
      return { lead: updated.rows[0], created: false };
    }

    const inserted = await q(
      `INSERT INTO crm.leads (
        workspace_id, full_name, phone, phone_normalized, email, email_normalized,
        source, campaign, external_source_lead_id, custom_attributes, assigned_user_id,
        pipeline_stage_id, consent_status, notes, tags, last_engagement_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12,$13,$14,$15,NOW()
      ) RETURNING *`,
      [
        input.workspaceId,
        input.fullName || null,
        input.phone || null,
        phoneNorm || null,
        input.email || null,
        emailNorm || null,
        source,
        input.campaign || null,
        input.externalSourceLeadId || null,
        JSON.stringify({
          ...(input.customAttributes || {}),
          _original_submissions: [
            {
              at: new Date().toISOString(),
              source,
              externalSourceLeadId: input.externalSourceLeadId || null,
              payload: input.customAttributes || {},
            },
          ],
        }),
        input.assignedUserId || null,
        stageId,
        input.consentStatus || 'unknown',
        input.notes || null,
        input.tags || [],
      ],
    );

    const lead = inserted.rows[0];
    await q(
      `INSERT INTO crm.lead_activities (workspace_id, lead_id, actor_user_id, activity_type, summary, payload)
       VALUES ($1,$2,$3,'lead.created','Lead created', $4::jsonb)`,
      [input.workspaceId, lead.id, input.actorUserId || null, JSON.stringify({ source })],
    );

    await enqueueJob({
      workspaceId: input.workspaceId,
      jobType: 'workflow.trigger',
      payload: { trigger: 'lead.created', leadId: lead.id },
      q,
    });

    return { lead, created: true };
  });
}

export async function updateLead(
  workspaceId: string,
  id: string,
  patch: Record<string, unknown>,
  actorUserId?: string | null,
) {
  const current = await getLead(workspaceId, id);
  if (!current) return null;

  const fields: string[] = [];
  const params: unknown[] = [workspaceId, id];
  const map: Record<string, string> = {
    fullName: 'full_name',
    phone: 'phone',
    email: 'email',
    campaign: 'campaign',
    assignedUserId: 'assigned_user_id',
    validityStatus: 'validity_status',
    qualificationStatus: 'qualification_status',
    leadScore: 'lead_score',
    whatsappStatus: 'whatsapp_status',
    aiCallingStatus: 'ai_calling_status',
    consentStatus: 'consent_status',
    callingConsent: 'calling_consent',
    notes: 'notes',
    nextFollowUpAt: 'next_follow_up_at',
  };

  for (const [k, col] of Object.entries(map)) {
    if (k in patch) {
      params.push(patch[k]);
      fields.push(`${col}=$${params.length}`);
    }
  }
  if ('phone' in patch) {
    params.push(normalizePhone(String(patch.phone || '')));
    fields.push(`phone_normalized=$${params.length}`);
  }
  if ('email' in patch) {
    params.push(normalizeEmail(String(patch.email || '')));
    fields.push(`email_normalized=$${params.length}`);
  }
  if ('customAttributes' in patch) {
    params.push(JSON.stringify(patch.customAttributes || {}));
    fields.push(`custom_attributes=$${params.length}::jsonb`);
  }
  if ('tags' in patch) {
    params.push(patch.tags || []);
    fields.push(`tags=$${params.length}`);
  }
  if ('stageCode' in patch && patch.stageCode) {
    const stage = await query(
      `SELECT id FROM crm.pipeline_stages WHERE workspace_id=$1 AND code=$2`,
      [workspaceId, patch.stageCode],
    );
    if (stage.rows[0]) {
      params.push(stage.rows[0].id);
      fields.push(`pipeline_stage_id=$${params.length}`);
    }
  }

  if (!fields.length) return current;
  fields.push('updated_at=NOW()', 'last_engagement_at=NOW()');

  const { rows } = await query(
    `UPDATE crm.leads SET ${fields.join(', ')} WHERE workspace_id=$1 AND id=$2 RETURNING *`,
    params,
  );

  await query(
    `INSERT INTO crm.lead_activities (workspace_id, lead_id, actor_user_id, activity_type, summary, payload)
     VALUES ($1,$2,$3,'lead.updated','Lead updated',$4::jsonb)`,
    [workspaceId, id, actorUserId || null, JSON.stringify(patch)],
  );
  await writeAudit({
    workspaceId,
    actorUserId,
    action: 'lead.updated',
    targetType: 'lead',
    targetId: id,
    previousValue: current,
    newValue: rows[0],
  });

  if (patch.stageCode) {
    await enqueueJob({
      workspaceId,
      jobType: 'workflow.trigger',
      payload: { trigger: 'pipeline.stage_changed', leadId: id, stageCode: patch.stageCode },
    });
  }

  return rows[0];
}

export async function deleteLead(workspaceId: string, id: string, actorUserId?: string | null) {
  const { rows } = await query(`DELETE FROM crm.leads WHERE workspace_id=$1 AND id=$2 RETURNING id`, [
    workspaceId,
    id,
  ]);
  if (rows[0]) {
    await writeAudit({
      workspaceId,
      actorUserId,
      action: 'lead.deleted',
      targetType: 'lead',
      targetId: id,
    });
  }
  return Boolean(rows[0]);
}

export async function listActivities(workspaceId: string, leadId: string) {
  const { rows } = await query(
    `SELECT * FROM crm.lead_activities WHERE workspace_id=$1 AND lead_id=$2 ORDER BY created_at DESC LIMIT 200`,
    [workspaceId, leadId],
  );
  return rows;
}
