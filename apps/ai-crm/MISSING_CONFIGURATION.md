# Missing / incomplete external configuration

Provider keys may be mapped from a local secrets file. Status as of AI CRM bootstrap:

| Area | Status | Notes |
|------|--------|-------|
| PostgreSQL `DATABASE_URL` / `DIRECT_URL` | Reused | AI CRM uses isolated schema `crm` on the same server. Prefer a dedicated DB/user in production. |
| Session / auth secret | Mapped | Uses `CRM_AUTH_SECRET` or falls back to `SAAS_SESSION_SECRET` / `LOCAL_SESSION_SECRET`. Issue a CRM-scoped secret for production. |
| WhatsApp Cloud API | Partial | Parent Meta/WhatsApp vars may exist. Live sends require valid token + phone number ID + approved templates. Default mode: `sandbox`. |
| Meta Lead Ads | Partial | Needs approved lead access permissions + app secret for signature validation. |
| Google Ads lead forms | Missing dedicated CRM keys | Set `CRM_GOOGLE_LEAD_WEBHOOK_KEY` (and Ads OAuth tokens if pulling leads via API). |
| Telephony / AI calling | Missing | `CRM_TELEPHONY_API_KEY` / provider not present. Outbound live calls disabled; sandbox state machine used. |
| STT / TTS | Missing | Sandbox call transcripts generated locally. |
| OCR provider | Missing | Sandbox OCR payload only — **not** official Aadhaar/PAN verification. |
| Redis | Optional | Not required; DB-backed `crm.jobs` queue is used. |
| Object storage bucket | Not configured for CRM | Document `storage_path` accepted; wire S3/Supabase Storage before production uploads. |

## Activation checklist
1. Set `CRM_INTEGRATION_MODE=live` only after credentials are verified.
2. Configure WhatsApp templates and webhook verify token.
3. Configure telephony provider and calling windows.
4. Rotate shared secrets to CRM-scoped credentials.
5. Confirm `crm` schema migrations applied.
