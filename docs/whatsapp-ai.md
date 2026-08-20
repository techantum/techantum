# Techantum WhatsApp AI Assistant

Production-ready WhatsApp sales & support assistant integrated with the Techantum admin panel.

## Architecture

```text
Website WhatsApp CTA
        ↓
Meta WhatsApp Cloud API
        ↓
POST /api/webhooks/whatsapp
        ↓
Conversation engine + Knowledge base retrieval
        ↓
OpenAI Responses API (structured JSON)
        ↓
Response validator + lead extraction
        ↓
Meta WhatsApp session message
        ↓
Customer
```

All Meta and OpenAI credentials stay **server-side only**.

## Environment variables

See `.env.example`. Minimum for AI assistant:

- `META_WHATSAPP_ACCESS_TOKEN` (or `WHATSAPP_ACCESS_TOKEN`)
- `META_WHATSAPP_PHONE_NUMBER_ID`
- `META_WHATSAPP_VERIFY_TOKEN`
- `META_WHATSAPP_APP_SECRET` (recommended for webhook signature validation)
- `OPENAI_API_KEY`
- `OPENAI_MODEL` (default `gpt-4o-mini`)

Enable assistant in admin: **WhatsApp AI → AI Settings → AI enabled**.

## Database migration

Apply:

```bash
supabase db push
```

Migration: `supabase/migrations/20260820180000_whatsapp_ai_assistant.sql`

Tables:

- `whatsapp_contacts`, `whatsapp_conversations`, `whatsapp_messages`
- `whatsapp_leads`, `ai_knowledge_categories`, `ai_knowledge_entries`
- `ai_settings` (singleton)

## Meta setup (manual)

1. Create Meta app with **WhatsApp Business Platform**.
2. Add a WhatsApp Business phone number.
3. Copy **Phone number ID**, **WABA ID**, and permanent **access token**.
4. Set webhook URL:
   - Production: `https://api.techantum.com/api/webhooks/whatsapp`
   - Or your deployed site: `https://YOUR_DOMAIN/api/webhooks/whatsapp`
5. Subscribe to `messages` field.
6. Set verify token to match `META_WHATSAPP_VERIFY_TOKEN`.
7. Enable app secret and set `META_WHATSAPP_APP_SECRET`.

## OpenAI setup

1. Create API key in OpenAI dashboard.
2. Set `OPENAI_API_KEY` and optional `OPENAI_MODEL`.
3. Populate **Knowledge Base** in admin before going live.
4. Optional later: `OPENAI_VECTOR_STORE_ID` for file-search vector stores.

## Knowledge base

Admin → **WhatsApp AI → Knowledge Base**

Only entries with:

- `status = PUBLISHED`
- `allow_ai = true`

are retrieved for AI responses.

Never put prices, timelines, or policies in the system prompt alone — store them as published knowledge entries.

## Admin usage

| Page | Path |
|------|------|
| Inbox | `/admin/whatsapp/inbox` |
| Knowledge Base | `/admin/whatsapp/knowledge` |
| AI Settings | `/admin/whatsapp/settings` |

### Conversation modes

- **AI** — assistant auto-replies
- **HYBRID** — staff can reply; AI available
- **HUMAN** — AI stopped; staff only

Use **Take over** in inbox to pause AI immediately.

## Website widget

Floating button loads from CMS branding:

- `whatsapp_widget_enabled`
- `whatsapp_href` (digits only, e.g. `919876543210`)
- `whatsapp_widget_message`

Configure under **Site Content → Branding** (widget toggle requires migration column).

## Human handoff

When AI returns `handoff_required: true` (call request, proposal, complaint, missing knowledge):

- Conversation mode switches per `handoff_mode` setting
- Lead stage set to `HUMAN_FOLLOWUP`
- Staff continues in inbox

## Troubleshooting

| Issue | Check |
|-------|--------|
| Webhook verification fails | Verify token matches Meta dashboard |
| 401 on webhook POST | App secret / signature mismatch |
| No AI reply | AI enabled in settings + OpenAI key set |
| Duplicate replies | `whatsapp_message_id` unique constraint (idempotency) |
| Session message blocked | Customer must message within 24h window |
| Generic/wrong answers | Publish more knowledge entries |

## Tests

```bash
npm test
```

Includes webhook signature and inbound payload parsing tests.

## Remaining enhancements (optional)

- Message debounce/queue for rapid multi-message bursts
- OpenAI vector store sync on knowledge publish
- WhatsApp template management UI
- Media download/storage
- Direct ticket creation from qualified leads
- Business-hours auto-replies
- Analytics dashboard
