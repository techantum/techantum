import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dest = path.join(appDir, '.env');
const parent = path.join(appDir, '../..', '.env');
const keys = [
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'RAZORPAY_WEBHOOK_SECRET',
  'NEXT_PUBLIC_RAZORPAY_KEY_ID',
  'GOOGLE_OAUTH_CLIENT_ID',
  'GOOGLE_OAUTH_CLIENT_SECRET',
  'WHATSAPP_ACCESS_TOKEN',
  'WHATSAPP_PHONE_NUMBER_ID',
  'WHATSAPP_API_VERSION',
  'WHATSAPP_LOGIN_OTP_TEMPLATE',
  'WHATSAPP_LOGIN_OTP_TEMPLATE_LANG',
  'META_WHATSAPP_ACCESS_TOKEN',
  'META_WHATSAPP_PHONE_NUMBER_ID',
  'LOGIN_OTP_PEPPER',
];

if (!existsSync(parent)) {
  console.error('Parent .env not found.');
  process.exit(1);
}

const parsed = {};
for (const line of readFileSync(parent, 'utf8').split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (!match || !keys.includes(match[1])) continue;
  let value = match[2].trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
  if (value) parsed[match[1]] = value;
}

let text = existsSync(dest) ? readFileSync(dest, 'utf8') : '';
if (text && !text.endsWith('\n')) text += '\n';
let written = 0;
for (const key of keys) {
  const value = parsed[key];
  if (!value) continue;
  const pattern = new RegExp(`^${key}=.*$`, 'm');
  if (pattern.test(text)) text = text.replace(pattern, `${key}=${value}`);
  else text += `${key}=${value}\n`;
  written += 1;
}
writeFileSync(dest, text);
console.log(`Synced ${written} billing/auth keys into apps/scout/.env`);
