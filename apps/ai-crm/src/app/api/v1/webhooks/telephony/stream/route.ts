import { query } from '@/lib/db';
import { fail, ok } from '@/lib/http';

/** Provider stream callback. Audio stays with the telephony vendor until STT text arrives. */
export async function POST(req: Request) {
  const streamUrl = process.env.CRM_TELEPHONY_STREAM_URL || '';
  const stt = Boolean(process.env.CRM_STT_API_KEY);
  const tts = Boolean(process.env.CRM_TTS_API_KEY);
  if (!streamUrl || !stt || !tts) {
    return fail('Bidirectional voice is not configured. Set CRM_TELEPHONY_STREAM_URL, CRM_STT_API_KEY, and CRM_TTS_API_KEY.', 503);
  }
  const body = await req.json().catch(() => ({}));
  const callId = body.call_id || body.callId;
  if (!callId) return fail('call_id required');
  if (body.event === 'transfer' || body.request_human) {
    await query(`UPDATE crm.voice_calls SET status='transferred', disposition='transferred', ended_at=NOW() WHERE id=$1`, [callId]);
    return ok({ action: 'transfer', queue: process.env.CRM_TELEPHONY_TRANSFER_QUEUE || '' });
  }
  if (body.text) {
    await query(
      `UPDATE crm.voice_calls SET transcript=COALESCE(transcript,'') || E'\n' || $2 WHERE id=$1`,
      [callId, `Customer: ${String(body.text).slice(0, 2000)}`],
    );
    return ok({ action: 'accepted', note: 'Text turn stored. Speak the reply with your TTS vendor on the media stream.' });
  }
  return ok({ action: 'noop' });
}
