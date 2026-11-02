# AI Lead CRM

Standalone lead CRM and sales automation app.

## Ports
- Web/API: **4300** (`CRM_WEB_PORT`)

## Database
- PostgreSQL schema **`crm`**
- Job queue: `crm.jobs` (Redis optional)

## Quick start

```bash
cd apps/ai-crm
npm install
npm run env:copy
npm run db:migrate
npm run dev
```

Optional worker loop:

```bash
npm run worker
```

Demo login (after migrate):
- Email: `admin@aicrm.local`
- Password: `Admin@12345`

## Key URLs
- App: http://localhost:4300
- Health: http://localhost:4300/api/health
- OpenAPI: http://localhost:4300/api/v1/openapi

## Ingest
```bash
curl -X POST http://localhost:4300/api/v1/leads/ingest \
  -H "content-type: application/json" \
  -H "x-crm-ingest-key: crm-sandbox-ingest-key" \
  -d '{"fullName":"Test Lead","phone":"9876543210","source":"api","consentStatus":"granted"}'
```

Process background jobs (or run `npm run worker`):
```bash
curl -X POST http://localhost:4300/api/v1/workers/process -b cookies.txt
```

## Tests
```bash
npm test
```

See `MISSING_CONFIGURATION.md` for external credentials.
