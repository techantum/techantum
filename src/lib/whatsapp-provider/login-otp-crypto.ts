import { createHash } from 'node:crypto';

export function hashLoginOtp(phone: string, code: string, secret: string) {
  return createHash('sha256').update(`${phone}:${code}:${secret}`).digest('hex');
}

export function phoneLoginEmail(phone: string) {
  return `wa${String(phone || '').replace(/[^\d]/g, '')}@otp.techantum.local`;
}
