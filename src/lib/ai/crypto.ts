import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const ALGO = 'aes-256-gcm';
const PREFIX = 'v1';

export class EncryptionKeyMissingError extends Error {
  constructor() {
    super('AI_SECRETS_ENCRYPTION_KEY is not configured on the server.');
    this.name = 'EncryptionKeyMissingError';
  }
}

export function isEncryptionReady() {
  return Boolean(process.env.AI_SECRETS_ENCRYPTION_KEY?.trim());
}

function getMasterKey() {
  const raw = process.env.AI_SECRETS_ENCRYPTION_KEY?.trim();
  if (!raw) throw new EncryptionKeyMissingError();
  if (/^[0-9a-f]{64}$/i.test(raw)) return Buffer.from(raw, 'hex');
  return createHash('sha256').update(raw).digest();
}

export function encryptSecret(plain: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, getMasterKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [PREFIX, iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join(':');
}

export function decryptSecret(payload: string) {
  const [version, ivB64, tagB64, dataB64] = payload.split(':');
  if (version !== PREFIX || !ivB64 || !tagB64 || !dataB64) {
    throw new Error('Unsupported or corrupt secret encoding.');
  }
  const decipher = createDecipheriv(ALGO, getMasterKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
}

export function secretHint(value: string) {
  const trimmed = value.trim();
  if (trimmed.length < 4) return '••••';
  return `•••• ${trimmed.slice(-4)}`;
}

export function looksLikeMaskedSecret(value: string) {
  return /^[•*xX.\s]+/.test(value.trim()) && !/[A-Za-z0-9_-]{8,}/.test(value);
}
