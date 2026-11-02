import { getSession, hasMinRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { fail, forbidden, ok, unauthorized } from '@/lib/http';

const DEFAULTS = {
  voiceBlendedPerMin: 2.5,
  whatsappMarketing: 0.78,
  whatsappUtility: 0.115,
  ocrPerPage: 1.5,
  storagePerGb: 2.5,
  platformMonthly: 75000,
  maxConcurrency: 5,
  avgCallMinutes: 3.5,
};

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();
  const url = new URL(req.url);
  const callsPerDay = Number(url.searchParams.get('callsPerDay') || 200);
  const templatesMarketing = Number(url.searchParams.get('marketingTemplates') || 10000);
  const templatesUtility = Number(url.searchParams.get('utilityTemplates') || 6000);
  const docPages = Number(url.searchParams.get('docPages') || 2000);
  const storageGb = Number(url.searchParams.get('storageGb') || 50);

  const saved = await query(`SELECT assumptions FROM crm.cost_assumptions WHERE workspace_id=$1`, [
    session.workspaceId,
  ]);
  const a = { ...DEFAULTS, ...(saved.rows[0]?.assumptions || {}) };
  const minutes = callsPerDay * 30 * a.avgCallMinutes;
  const voice = minutes * a.voiceBlendedPerMin;
  const wa = templatesMarketing * a.whatsappMarketing + templatesUtility * a.whatsappUtility;
  const docs = docPages * a.ocrPerPage + storageGb * a.storagePerGb;
  const platform = a.platformMonthly;
  const total = voice + wa + docs + platform;

  return ok({
    assumptions: a,
    inputs: { callsPerDay, templatesMarketing, templatesUtility, docPages, storageGb },
    monthly: {
      voiceInr: Math.round(voice),
      whatsappInr: Math.round(wa),
      documentsInr: Math.round(docs),
      platformInr: Math.round(platform),
      totalInr: Math.round(total),
      minutes: Math.round(minutes),
    },
    capacity: {
      maxConcurrency: a.maxConcurrency,
      note: 'True ceiling = min(app concurrency, IVR channels, STT/TTS quota, LLM rate limits)',
    },
    disclaimer: 'Indicative planning estimates only — not a commercial quote. GST extra.',
  });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!hasMinRole(session, 'business_admin')) return forbidden();
  try {
    const body = await req.json();
    const { rows } = await query(
      `INSERT INTO crm.cost_assumptions (workspace_id, assumptions, updated_at)
       VALUES ($1,$2::jsonb,NOW())
       ON CONFLICT (workspace_id) DO UPDATE SET assumptions=EXCLUDED.assumptions, updated_at=NOW()
       RETURNING *`,
      [session.workspaceId, JSON.stringify({ ...DEFAULTS, ...(body.assumptions || body) })],
    );
    return ok({ assumptions: rows[0] });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Save failed', 500);
  }
}
