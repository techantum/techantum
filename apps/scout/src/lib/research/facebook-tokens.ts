import { decryptSecret, encryptSecret, isEncryptionReady } from '@/lib/ai/crypto';
import { q } from '@/lib/finance/db';
import { currentSaasAccountId, currentYoutubePartnerId } from '@/lib/youtube/scope';

export function facebookOwnerKey(userId?: string | null) {
  const account = currentSaasAccountId();
  if (account) return `account:${account}`;
  const partner = currentYoutubePartnerId();
  if (partner) return `partner:${partner}`;
  if (userId) return `user:${userId}`;
  return 'platform';
}

export async function saveFacebookPageTokens(
  pages: Array<{ id?: string; name?: string; username?: string; access_token?: string }>,
  ownerKey: string,
  userId?: string | null,
) {
  if (!isEncryptionReady()) {
    throw new Error('AI_SECRETS_ENCRYPTION_KEY is required to store Facebook Page tokens.');
  }
  for (const page of pages) {
    const pageId = String(page.id || '').trim();
    const token = String(page.access_token || '').trim();
    if (!pageId || !token) continue;
    await q(
      undefined,
      `INSERT INTO youtube_meta_page_tokens (owner_key, page_id, page_name, page_username, token_ciphertext, created_by, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW())
       ON CONFLICT (owner_key, page_id) DO UPDATE SET
         page_name=EXCLUDED.page_name,
         page_username=EXCLUDED.page_username,
         token_ciphertext=EXCLUDED.token_ciphertext,
         updated_at=NOW()`,
      [ownerKey, pageId, page.name || null, page.username || null, encryptSecret(token), userId || null],
    );
  }
}

export function facebookPageKeys(...values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => String(value || '').trim().replace(/^@/, '').toLowerCase()).filter(Boolean))];
}

export function facebookPageMatches(
  page: { id?: string | null; username?: string | null; name?: string | null },
  ...needles: Array<string | null | undefined>
) {
  const keys = facebookPageKeys(...needles);
  if (!keys.length) return false;
  const hay = facebookPageKeys(page.id, page.username, page.name);
  return keys.some((key) => {
    if (hay.includes(key)) return true;
    if (key.length < 4) return false;
    return hay.some((item) => item.includes(key) || (item.length >= 4 && key.includes(item)));
  });
}

export async function readFacebookPageToken(pageId: string, handle?: string | null, userId?: string | null) {
  const owner = facebookOwnerKey(userId);
  const keys = facebookPageKeys(pageId, handle);
  if (!keys.length) return '';
  const { rows } = await q<{ token_ciphertext: string; page_id: string; page_username: string | null; page_name: string | null }>(
    undefined,
    `SELECT token_ciphertext, page_id, page_username, page_name FROM youtube_meta_page_tokens
     WHERE owner_key=$1 ORDER BY updated_at DESC`,
    [owner],
  );
  const hit = rows.find((row) => facebookPageMatches(
    { id: row.page_id, username: row.page_username, name: row.page_name },
    ...keys,
  ));
  const payload = hit?.token_ciphertext;
  if (!payload) return '';
  try {
    return decryptSecret(payload);
  } catch {
    return '';
  }
}

export async function bindFacebookChannelIdentity(
  channelId: string,
  page: { id?: string; name?: string; username?: string },
) {
  const pageId = String(page.id || '').trim();
  if (!channelId || !pageId) return;
  const clash = await q<{ id: string }>(
    undefined,
    `SELECT id FROM youtube_channels WHERE platform='facebook' AND youtube_channel_id=$1 AND id<>$2`,
    [pageId, channelId],
  );
  if (clash.rows[0]) return;
  await q(
    undefined,
    `UPDATE youtube_channels
     SET youtube_channel_id=$2,
         channel_handle=COALESCE(NULLIF($3,''), channel_handle),
         channel_name=COALESCE(NULLIF($4,''), channel_name),
         channel_url=COALESCE(NULLIF($5,''), channel_url),
         last_refreshed_at=NOW()
     WHERE id=$1`,
    [
      channelId,
      pageId,
      page.username || '',
      page.name || '',
      page.username ? `https://www.facebook.com/${page.username}` : `https://www.facebook.com/${pageId}`,
    ],
  );
}

export async function connectedFacebookPageIds(userId?: string | null) {
  const { rows } = await q<{ page_id: string; page_username: string | null }>(
    undefined,
    `SELECT page_id, page_username FROM youtube_meta_page_tokens WHERE owner_key=$1`,
    [facebookOwnerKey(userId)],
  );
  return new Set(rows.flatMap((row) => facebookPageKeys(row.page_id, row.page_username)));
}
