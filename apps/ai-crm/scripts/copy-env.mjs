import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dest = path.join(appDir, '.env');
const secretsFile = path.join(appDir, '../..', '.env');

if (!existsSync(secretsFile)) {
  console.error('No shared secrets .env found to map API keys from.');
  process.exit(1);
}

function parseEnv(text) {
  /** @type {Record<string,string>} */
  const out = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/^\uFEFF/, '');
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1);
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const API_PREFIXES = ['WHATSAPP_', 'META_', 'OPENAI_', 'GOOGLE_', 'GA4_', 'GBP_', 'YOUTUBE_'];
const API_EXACT = new Set(['DATABASE_URL', 'DIRECT_URL']);

function isProviderKey(key) {
  return API_EXACT.has(key) || API_PREFIXES.some((prefix) => key.startsWith(prefix));
}

const secrets = parseEnv(readFileSync(secretsFile, 'utf8'));
const existing = existsSync(dest) ? parseEnv(readFileSync(dest, 'utf8')) : {};

/** @type {Record<string,string>} */
const merged = {};
for (const [key, value] of Object.entries(existing)) {
  if (key.startsWith('CRM_') || key.startsWith('NEXT_PUBLIC_CRM_') || key === 'NEXT_PUBLIC_SITE_URL') {
    merged[key] = value;
  }
}
for (const [key, value] of Object.entries(secrets)) {
  if (isProviderKey(key) && value) merged[key] = value;
}

const hasWhatsApp = Boolean((secrets.WHATSAPP_ACCESS_TOKEN || '').trim() && (secrets.WHATSAPP_PHONE_NUMBER_ID || '').trim());
const hasLlm = Boolean((secrets.OPENAI_API_KEY || '').trim());

merged.CRM_APP_NAME = 'AI Lead CRM';
merged.NEXT_PUBLIC_CRM_APP_NAME = 'AI Lead CRM';
merged.CRM_NODE_ENV = merged.CRM_NODE_ENV || 'development';
merged.CRM_WEB_PORT = '4300';
merged.CRM_API_PORT = '4301';
merged.CRM_WEB_URL = 'https://aicrm.techantum.info';
merged.CRM_API_URL = 'https://aicrm.techantum.info';
merged.CRM_DB_SCHEMA = 'crm';
const keepIsolatedDb = existing.CRM_DATA_ISOLATED === 'true' && existing.CRM_DATABASE_URL && !/supabase\.com/i.test(existing.CRM_DATABASE_URL);
if (keepIsolatedDb) {
  merged.CRM_DATA_ISOLATED = 'true';
  merged.CRM_DB_PASSWORD = existing.CRM_DB_PASSWORD || '';
  merged.CRM_DATABASE_URL = existing.CRM_DATABASE_URL;
  merged.CRM_DIRECT_URL = existing.CRM_DIRECT_URL || existing.CRM_DATABASE_URL;
  delete merged.DATABASE_URL;
  delete merged.DIRECT_URL;
} else {
  merged.CRM_DATABASE_URL = secrets.DATABASE_URL || merged.CRM_DATABASE_URL || '';
  merged.CRM_DIRECT_URL = secrets.DIRECT_URL || merged.CRM_DIRECT_URL || '';
}
merged.CRM_AUTH_SECRET =
  merged.CRM_AUTH_SECRET ||
  secrets.SAAS_SESSION_SECRET ||
  secrets.LOCAL_SESSION_SECRET ||
  secrets.AI_SECRETS_ENCRYPTION_KEY ||
  '';
const parentToken = secrets.WHATSAPP_ACCESS_TOKEN || '';
const currentToken = existing.CRM_WHATSAPP_ACCESS_TOKEN || '';
merged.CRM_WHATSAPP_ACCESS_TOKEN =
  currentToken.length > parentToken.length && !currentToken.endsWith('>') ? currentToken : parentToken;
merged.CRM_WHATSAPP_PHONE_NUMBER_ID = secrets.WHATSAPP_PHONE_NUMBER_ID || existing.CRM_WHATSAPP_PHONE_NUMBER_ID || '';
merged.CRM_WHATSAPP_BUSINESS_ACCOUNT_ID = secrets.WHATSAPP_BUSINESS_ACCOUNT_ID || existing.CRM_WHATSAPP_BUSINESS_ACCOUNT_ID || '';
merged.CRM_WHATSAPP_VERIFY_TOKEN =
  secrets.WHATSAPP_VERIFY_TOKEN || secrets.META_WHATSAPP_VERIFY_TOKEN || '';
merged.CRM_WHATSAPP_TEMPLATE_NAME = existing.CRM_WHATSAPP_TEMPLATE_NAME || secrets.WHATSAPP_TEMPLATE_NAME || '';
merged.CRM_WHATSAPP_TEMPLATE_LANGUAGE = existing.CRM_WHATSAPP_TEMPLATE_LANGUAGE || secrets.WHATSAPP_TEMPLATE_LANGUAGE || 'en';
merged.CRM_META_APP_SECRET = secrets.META_APP_SECRET || '';
merged.CRM_META_APP_ID = secrets.META_APP_ID || '';
merged.CRM_LLM_API_KEY = secrets.OPENAI_API_KEY || '';
merged.CRM_LLM_PROVIDER = hasLlm ? 'openai' : merged.CRM_LLM_PROVIDER || '';
merged.CRM_INTEGRATION_MODE = hasWhatsApp || hasLlm ? 'live' : 'sandbox';
merged.CRM_INGEST_API_KEY = merged.CRM_INGEST_API_KEY || 'crm-sandbox-ingest-key';
merged.CRM_TELEPHONY_PROVIDER = merged.CRM_TELEPHONY_PROVIDER || 'mock';
merged.CRM_TELEPHONY_API_KEY = merged.CRM_TELEPHONY_API_KEY || 'crm-mock-telephony-key';
merged.CRM_TELEPHONY_BASE_URL = merged.CRM_TELEPHONY_BASE_URL || 'mock://local';
merged.CRM_MAX_CONCURRENCY = merged.CRM_MAX_CONCURRENCY || '5';
merged.CRM_PUBLIC_WEBHOOK_BASE_URL = 'https://aicrm.techantum.info';
merged.NEXT_PUBLIC_SITE_URL = 'https://aicrm.techantum.info';

const header = [
  '# AI Lead CRM — independent product configuration.',
  '# Meta, Google, OpenAI, and database URLs are mapped from a local secrets file for now.',
  '# Do not commit this file.',
  '',
];

const lines = Object.entries(merged)
  .filter(([key]) => !/HOOKOOH|TECHANTUM|REVEALEO/i.test(key))
  .map(([key, value]) => {
    const needsQuote = /[\n#]/.test(value) || /\s/.test(value);
    return `${key}=${needsQuote ? JSON.stringify(value) : value}`;
  });

writeFileSync(dest, `${header.join('\n')}${lines.join('\n')}\n`);
console.log(
  `Wrote apps/ai-crm/.env (${lines.length} keys). mode=${merged.CRM_INTEGRATION_MODE} whatsapp=${hasWhatsApp} llm=${hasLlm}`,
);
