import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

export function loadAppEnv(appDir) {
  const files = [path.join(appDir, '.env'), path.join(appDir, '../..', '.env')];
  for (const file of files) {
    if (!existsSync(file)) continue;
    for (const raw of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const line = raw.replace(/^\uFEFF/, '').trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq <= 0) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]?.trim()) process.env[key] = val;
    }
  }
  process.env.CRM_WEB_PORT ||= '4300';
  process.env.CRM_API_PORT ||= '4301';
  process.env.CRM_APP_NAME ||= 'AI Lead CRM';
  process.env.CRM_INTEGRATION_MODE ||= 'sandbox';
  if (!process.env.CRM_DATABASE_URL?.trim() && process.env.DATABASE_URL?.trim()) {
    process.env.CRM_DATABASE_URL = process.env.DATABASE_URL.trim();
  }
  if (!process.env.CRM_DIRECT_URL?.trim() && process.env.DIRECT_URL?.trim()) {
    process.env.CRM_DIRECT_URL = process.env.DIRECT_URL.trim();
  }
  if (!process.env.CRM_AUTH_SECRET?.trim()) {
    process.env.CRM_AUTH_SECRET =
      process.env.SAAS_SESSION_SECRET ||
      process.env.LOCAL_SESSION_SECRET ||
      process.env.AI_SECRETS_ENCRYPTION_KEY ||
      '';
  }
}
