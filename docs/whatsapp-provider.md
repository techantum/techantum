# WhatsApp Business Tech Provider Console

Enterprise multi-tenant console for Techantum as a Meta WhatsApp Tech Provider. Super Admin only.

## Client self-onboarding

Public sign-in: `/login` (Google, Facebook, or WhatsApp OTP). `/connect-whatsapp` redirects there.

Footer / header: **Sign in**

Flow:

1. Client signs in on the website (Google, Facebook, or a WhatsApp OTP). This creates their TechAntum workspace.
2. From `/portal/wa/connect` they click **Continue with Facebook** for Meta Embedded Signup.
3. Meta returns the authorization code plus WABA / phone / business IDs.
4. The server exchanges the code, stores the token encrypted, subscribes webhooks and syncs templates.
5. Client stays in `/portal/wa`.

Public APIs:

- `GET /api/public/wa-onboard/config`
- `GET /api/public/wa-onboard/session`
- `POST /api/public/auth/otp/send`
- `POST /api/public/auth/otp/verify`
- `POST /api/public/wa-onboard/connect`

Enable Google and Facebook under Supabase Authentication → Providers. Redirect URL: `https://YOUR_DOMAIN/auth/callback`.

For WhatsApp OTP, create an authentication template (`WHATSAPP_LOGIN_OTP_TEMPLATE`) on the TechAntum WABA. Session text is used as a fallback only inside the 24-hour customer-care window.

Allow `techantum.com` in the Meta app domain settings. The app must be **Live** for real customers.

Website Facebook login redirect URI (Facebook Login → Settings → Valid OAuth Redirect URIs):

`https://techantum.com/auth/facebook`

Google website login uses the same Web OAuth client as Maps / GBP. Authorized redirect URI:

`https://techantum.com/api/admin/gbp-analytics/oauth/callback`


| Role | WhatsApp Provider | WhatsApp AI | Recruitment | Partner Portal | Rest of Admin |
| --- | --- | --- | --- | --- | --- |
| `SUPER_ADMIN` | Yes | Yes | Yes | Yes | Yes |
| `ADMIN` | No | No | No | No | Yes |

Client organizations use `/portal/wa` and only see their own `client_id` data.

## Apply the migration

In the Supabase SQL editor, run:

`supabase/migrations/20260922120000_wa_provider.sql`

This adds `admin_users.role` and all `wa_*` tables. Credentials live in `wa_integration_credentials` (encrypted), never on business tables.

Optional demo records (clearly `is_demo = true`, never for production):

```
POST /api/admin/wa-provider/seed
```

or set `WA_PROVIDER_SEED_DEMO=true` only in development.

## Environment

```
META_GRAPH_API_VERSION=v21.0
META_APP_ID=
NEXT_PUBLIC_META_APP_ID=
META_APP_SECRET=
META_EMBEDDED_SIGNUP_CONFIG_ID=
META_SYSTEM_USER_ACCESS_TOKEN=
META_BUSINESS_ID=
META_WEBHOOK_VERIFY_TOKEN=
META_WEBHOOK_CALLBACK_URL=https://YOUR_DOMAIN/api/webhooks/meta/whatsapp
META_CREDIT_LINE_ID=
FEATURE_META_CREDIT_SHARING=false
AI_SECRETS_ENCRYPTION_KEY=
```

`META_GRAPH_API_VERSION` is required. No Graph version is hard-coded.

## Meta app setup

1. Create a Meta app with WhatsApp product and Tech Provider / Embedded Signup.
2. Add permissions: `whatsapp_business_management`, `whatsapp_business_messaging`, `business_management`.
3. Create an Embedded Signup configuration and copy `META_EMBEDDED_SIGNUP_CONFIG_ID`.
4. Webhook callback: `https://YOUR_DOMAIN/api/webhooks/meta/whatsapp`
5. Verify token: same value as `META_WEBHOOK_VERIFY_TOKEN`
6. Subscribe WABA webhooks after each client connects (the onboarding flow calls `POST /{WABA_ID}/subscribed_apps`).
7. System user token is used only on the server. The browser never receives it.

## Architecture

```
UI → /api/admin/wa-provider → MetaWhatsAppService → Graph API
Meta → /api/webhooks/meta/whatsapp → persist raw event → after() processor → DB / alerts / UI
```

Privileged Meta calls are server-side only.

## Template workflow

`DRAFT → CLIENT_SUBMITTED → INTERNAL_REVIEW → INTERNAL_APPROVED → SUBMITTED_TO_META → META_PENDING → META_APPROVED | META_REJECTED`

**Approve** in the UI is internal Tech Provider approval, not Meta approval.

## Deploy

1. Apply the SQL migration.
2. Set environment variables on the host.
3. Create admin users (`node scripts/create-admin-users.mjs`).
4. Promote the intended operator to `SUPER_ADMIN`.
5. Confirm `/admin/wa-provider` and webhook verification.

## Tests

```
npm test
```

Includes mapper, webhook, template validation, permissions, health, analytics and tenant isolation checks.
