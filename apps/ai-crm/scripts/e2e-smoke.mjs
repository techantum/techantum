import { loadAppEnv } from './load-env.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
loadAppEnv(appDir);

const base = process.env.CRM_WEB_URL || 'http://localhost:4300';

async function json(res) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `${res.status}`);
  return body;
}

const cookieJar = { value: '' };
function withCookie(init = {}) {
  return {
    ...init,
    headers: {
      ...(init.headers || {}),
      ...(cookieJar.value ? { cookie: cookieJar.value } : {}),
    },
  };
}

const loginRes = await fetch(`${base}/api/v1/auth/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: 'admin@aicrm.local', password: 'Admin@12345' }),
});
const setCookie = loginRes.headers.getSetCookie?.() || [];
cookieJar.value = setCookie.map((c) => c.split(';')[0]).join('; ');
await json(loginRes);

const ingest = await json(
  await fetch(`${base}/api/v1/leads/ingest`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-crm-ingest-key': 'crm-sandbox-ingest-key' },
    body: JSON.stringify({
      fullName: 'E2E Lead',
      phone: '9000011122',
      email: 'e2e@example.com',
      source: 'api',
      consentStatus: 'granted',
      campaign: 'smoke',
    }),
  }),
);

await json(await fetch(`${base}/api/v1/workers/process`, withCookie({ method: 'POST' })));

const wa = await json(
  await fetch(`${base}/api/v1/webhooks/whatsapp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      from: '919000011122',
      body: 'I need a website this week, budget 2 lakh, ready to start',
      id: `e2e_${Date.now()}`,
    }),
  }),
);

await json(await fetch(`${base}/api/v1/workers/process`, withCookie({ method: 'POST' })));
await json(await fetch(`${base}/api/v1/workers/process`, withCookie({ method: 'POST' })));

const dash = await json(await fetch(`${base}/api/v1/reports/dashboard`, withCookie()));

console.log(
  JSON.stringify(
    {
      leadId: ingest.lead?.id,
      created: ingest.created,
      whatsappProcessed: wa.processed,
      totalLeads: dash.totalLeads,
      callsCompleted: dash.callsCompleted,
      whatsappResponded: dash.whatsappResponded,
    },
    null,
    2,
  ),
);
