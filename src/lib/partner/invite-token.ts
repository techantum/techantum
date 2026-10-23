import { createHash, randomBytes } from 'crypto';

export const INVITE_EXPIRY_DAYS = 7;

export function generateInviteToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashInviteToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function inviteExpiryDate(now = Date.now(), days = INVITE_EXPIRY_DAYS): Date {
  return new Date(now + days * 24 * 60 * 60 * 1000);
}

export function classifyInvite(
  invite: { used_at?: string | null; expires_at?: string | null } | null | undefined,
  now = new Date()
): 'valid' | 'expired' | 'used' | 'invalid' {
  if (!invite?.expires_at) return 'invalid';
  if (invite.used_at) return 'used';
  if (new Date(invite.expires_at).getTime() <= now.getTime()) return 'expired';
  return 'valid';
}

export function inviteStatusMessage(status: 'expired' | 'used' | 'invalid'): string {
  if (status === 'expired') return 'This invitation has expired. Ask your team admin to send a new one.';
  if (status === 'used') return 'This invitation has already been used.';
  return 'This invitation link is not valid.';
}
