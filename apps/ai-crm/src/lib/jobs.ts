import { query } from './db';

type Q = typeof query;

export async function enqueueJob(input: {
  workspaceId?: string | null;
  jobType: string;
  payload?: Record<string, unknown>;
  runAt?: Date;
  q?: Q;
}) {
  const q = input.q || query;
  const { rows } = await q(
    `INSERT INTO crm.jobs (workspace_id, job_type, payload, run_at, status)
     VALUES ($1,$2,$3::jsonb,COALESCE($4, NOW()),'queued')
     RETURNING *`,
    [
      input.workspaceId || null,
      input.jobType,
      JSON.stringify(input.payload || {}),
      input.runAt ? input.runAt.toISOString() : null,
    ],
  );
  return rows[0];
}

export async function claimJobs(limit = 10) {
  const { rows } = await query(
    `WITH cte AS (
       SELECT id FROM crm.jobs
       WHERE status='queued' AND run_at <= NOW()
       ORDER BY run_at ASC
       FOR UPDATE SKIP LOCKED
       LIMIT $1
     )
     UPDATE crm.jobs j
     SET status='running', locked_at=NOW(), attempts=attempts+1
     FROM cte WHERE j.id=cte.id
     RETURNING j.*`,
    [limit],
  );
  return rows;
}

export async function completeJob(id: string, error?: string) {
  if (error) {
    await query(
      `UPDATE crm.jobs SET status=CASE WHEN attempts>=5 THEN 'dead' ELSE 'queued' END,
        error=$2, locked_at=NULL, run_at=NOW() + (INTERVAL '1 minute' * LEAST(attempts, 30))
       WHERE id=$1`,
      [id, error],
    );
    return;
  }
  await query(`UPDATE crm.jobs SET status='done', locked_at=NULL, error=NULL WHERE id=$1`, [id]);
}
