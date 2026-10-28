import { q } from '@/lib/finance/db';
import { FinanceNotFoundError, FinanceValidationError } from '@/lib/finance/errors';

function accountKey(accountId: string | null | undefined) {
  return accountId && /^[0-9a-f-]{36}$/i.test(accountId) ? accountId : null;
}

export type HookoohConversation = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export async function hookoohEnabled() {
  try {
    const { rows } = await q<{ enabled: boolean }>(undefined, `SELECT enabled FROM hookooh_settings WHERE id='default'`);
    return rows[0]?.enabled !== false;
  } catch {
    return true;
  }
}

export async function setHookoohEnabled(enabled: boolean) {
  await q(undefined, `INSERT INTO hookooh_settings (id, enabled, updated_at) VALUES ('default',$1,NOW())
    ON CONFLICT (id) DO UPDATE SET enabled=EXCLUDED.enabled, updated_at=NOW()`, [enabled]);
  return { enabled };
}

export async function listHookoohConversations(userId: string, accountId: string | null) {
  const { rows } = await q<HookoohConversation>(
    undefined,
    `SELECT id, title, created_at::text, updated_at::text
     FROM hookooh_conversations
     WHERE user_id=$1 AND (($2::uuid IS NULL AND saas_account_id IS NULL) OR saas_account_id=$2)
     ORDER BY updated_at DESC
     LIMIT 40`,
    [userId, accountKey(accountId)],
  );
  return rows;
}

export async function createHookoohConversation(userId: string, accountId: string | null, title = 'New chat') {
  const { rows } = await q<HookoohConversation>(
    undefined,
    `INSERT INTO hookooh_conversations (user_id, saas_account_id, title) VALUES ($1,$2,$3)
     RETURNING id, title, created_at::text, updated_at::text`,
    [userId, accountKey(accountId), title.slice(0, 80)],
  );
  return rows[0];
}

async function ownedConversation(id: string, userId: string, accountId: string | null) {
  const { rows } = await q<HookoohConversation>(
    undefined,
    `SELECT id, title, created_at::text, updated_at::text
     FROM hookooh_conversations
     WHERE id=$1 AND user_id=$2 AND (($3::uuid IS NULL AND saas_account_id IS NULL) OR saas_account_id=$3)`,
    [id, userId, accountKey(accountId)],
  );
  if (!rows[0]) throw new FinanceNotFoundError('Conversation not found');
  return rows[0];
}

export async function getHookoohConversation(id: string, userId: string, accountId: string | null) {
  const conversation = await ownedConversation(id, userId, accountId);
  const { rows } = await q<{ id: string; role: string; content: string; sources: unknown; created_at: string }>(
    undefined,
    `SELECT id, role, content, sources, created_at::text FROM hookooh_messages WHERE conversation_id=$1 ORDER BY created_at`,
    [id],
  );
  return { ...conversation, messages: rows };
}

export async function renameHookoohConversation(id: string, userId: string, accountId: string | null, title: string) {
  const name = String(title || '').trim().slice(0, 80);
  if (name.length < 2) throw new FinanceValidationError('Enter a chat title.');
  await ownedConversation(id, userId, accountId);
  const { rows } = await q(
    undefined,
    `UPDATE hookooh_conversations SET title=$2, updated_at=NOW() WHERE id=$1 RETURNING id, title, created_at::text, updated_at::text`,
    [id, name],
  );
  return rows[0];
}

export async function deleteHookoohConversation(id: string, userId: string, accountId: string | null) {
  await ownedConversation(id, userId, accountId);
  await q(undefined, `DELETE FROM hookooh_conversations WHERE id=$1`, [id]);
  return { ok: true };
}

export async function addHookoohMessage(
  conversationId: string,
  role: 'user' | 'assistant',
  content: string,
  sources: unknown[] = [],
) {
  const { rows } = await q(
    undefined,
    `INSERT INTO hookooh_messages (conversation_id, role, content, sources) VALUES ($1,$2,$3,$4::jsonb) RETURNING id, role, content, sources, created_at::text`,
    [conversationId, role, content, JSON.stringify(sources)],
  );
  await q(undefined, `UPDATE hookooh_conversations SET updated_at=NOW() WHERE id=$1`, [conversationId]);
  if (role === 'user') {
    const { rows: titled } = await q<{ title: string }>(undefined, `SELECT title FROM hookooh_conversations WHERE id=$1`, [conversationId]);
    if (titled[0]?.title === 'New chat') {
      await q(undefined, `UPDATE hookooh_conversations SET title=$2 WHERE id=$1`, [conversationId, content.replace(/\s+/g, ' ').trim().slice(0, 48)]);
    }
  }
  return rows[0];
}

export async function listHookoohHistory(conversationId: string) {
  const { rows } = await q<{ role: 'user' | 'assistant'; content: string }>(
    undefined,
    `SELECT role, content FROM hookooh_messages WHERE conversation_id=$1 ORDER BY created_at`,
    [conversationId],
  );
  return rows;
}

export async function deleteLastAssistantMessage(conversationId: string, userId: string, accountId: string | null) {
  await ownedConversation(conversationId, userId, accountId);
  const { rows } = await q<{ id: string }>(
    undefined,
    `SELECT id FROM hookooh_messages WHERE conversation_id=$1 AND role='assistant' ORDER BY created_at DESC LIMIT 1`,
    [conversationId],
  );
  if (rows[0]) await q(undefined, `DELETE FROM hookooh_messages WHERE id=$1`, [rows[0].id]);
}

export async function hookoohUsage() {
  try {
    const { rows } = await q<{ conversations: string; messages: string; feedback: string }>(
      undefined,
      `SELECT
         (SELECT COUNT(*) FROM hookooh_conversations)::text AS conversations,
         (SELECT COUNT(*) FROM hookooh_messages)::text AS messages,
         (SELECT COUNT(*) FROM hookooh_feedback)::text AS feedback`,
    );
    return {
      conversations: Number(rows[0]?.conversations || 0),
      messages: Number(rows[0]?.messages || 0),
      feedback: Number(rows[0]?.feedback || 0),
    };
  } catch {
    return { conversations: 0, messages: 0, feedback: 0 };
  }
}

export async function saveHookoohFeedback(messageId: string, userId: string, vote: string) {
  if (vote !== 'up' && vote !== 'down') throw new FinanceValidationError('Choose up or down.');
  await q(
    undefined,
    `INSERT INTO hookooh_feedback (message_id, user_id, vote) VALUES ($1,$2,$3)
     ON CONFLICT (message_id, user_id) DO UPDATE SET vote=EXCLUDED.vote`,
    [messageId, userId, vote],
  );
  return { ok: true };
}
