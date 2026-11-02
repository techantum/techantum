# AI CRM delivery status

## Runtime
- App directory: `apps/ai-crm`
- Port: **4300** (API served from the same Next process)
- Database: PostgreSQL schema **`crm`** (migrations recorded in `crm.schema_migrations`)
- Mode: live when WhatsApp/LLM keys present; telephony blocked until IVR keys set

## Verified flow (local smoke)
Lead ingest → WhatsApp template/workflow → inbound reply → AI qualification (`hot`/`warm`/`cold`) → document request for hot → assistive verify → sandbox AI call (or IVR dial when configured) → sales task → Zoho sync queue → dashboard metrics from DB.

## Commands
```bash
cd apps/ai-crm
npm install
npm run env:copy
npm run db:migrate
npm run dev
# optional: npm run worker
npm test
node scripts/e2e-smoke.mjs
```

Demo login: `admin@aicrm.local` / `Admin@12345`

## Modules
| Module | Status |
|--------|--------|
| Auth / RBAC roles / audit | Done |
| Leads CRUD, dedupe, import/export, ingest | Done |
| Google/Meta/WhatsApp webhooks | Done |
| WhatsApp adapter + AI qualification | Done |
| Multilingual agent languages + RAG chunks | Done |
| Voice call state machine + campaigns | Done (live dial needs IVR) |
| IVR/telephony adapter + webhook | Done |
| Zoho CRM sync (import/push/offline queue) | Done |
| Hot-lead document request + assistive verify | Done |
| Cost & capacity estimator UI | Done |
| Workflows + job worker | Done |
| Reporting dashboard | Done |
| Architecture / costs / coverage docs | `docs/AI_CALLING_RAG_SETUP.md`, `COST_ESTIMATES.md`, `REQUIREMENTS_COVERAGE.md` |

## Remaining for live AI voice demo
- Customer IVR API base URL + keys + transfer queue
- STT/TTS vendor keys for the six Indian languages
- Zoho OAuth client + refresh token for write-back
- Approved WhatsApp templates in Meta Business Manager
