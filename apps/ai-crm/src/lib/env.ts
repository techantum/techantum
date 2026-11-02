import { loadAppEnv } from './load-env';

let loaded = false;

export function ensureEnv() {
  if (loaded) return;
  try {
    loadAppEnv(process.cwd());
  } catch {
    /* scripts may already have loaded */
  }
  loaded = true;
}

export function requireEnv(keys: string[]) {
  ensureEnv();
  const missing = keys.filter((k) => !String(process.env[k] || '').trim());
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

export function crmMode(): 'sandbox' | 'live' {
  ensureEnv();
  return process.env.CRM_INTEGRATION_MODE === 'live' ? 'live' : 'sandbox';
}

export function databaseUrl() {
  ensureEnv();
  // Prefer direct/DB URL over session pooler to avoid EMAXCONNSESSION on shared Supabase.
  const url =
    process.env.CRM_DIRECT_URL ||
    process.env.DIRECT_URL ||
    process.env.CRM_DATABASE_URL ||
    process.env.DATABASE_URL;
  if (!url?.trim()) throw new Error('Missing CRM_DATABASE_URL / DATABASE_URL');
  return url.trim();
}

export function authSecret() {
  ensureEnv();
  const secret =
    process.env.CRM_AUTH_SECRET ||
    process.env.SAAS_SESSION_SECRET ||
    process.env.LOCAL_SESSION_SECRET ||
    process.env.AI_SECRETS_ENCRYPTION_KEY;
  if (!secret?.trim()) throw new Error('Missing CRM_AUTH_SECRET');
  return secret.trim();
}
