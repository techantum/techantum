# AI Lead CRM — product notes

## Stack
- Next.js 15 App Router, React 19, TypeScript, Tailwind
- PostgreSQL via `pg`
- Meta WhatsApp Cloud API and OpenAI, configured from environment

## Runtime
- App: `apps/ai-crm`
- Port: **4300**
- Database schema: **`crm`**
- Provider adapters stay inactive until their API keys are set

## Product boundary
This app does not import another product at runtime. Meta, Google, OpenAI, and database URLs can be supplied from a local secrets file until the CRM has its own credentials.
