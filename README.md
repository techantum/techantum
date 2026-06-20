# Hollandse FG B.V — Corporate Website

Production website for **Hollandse Facility Group B.V.**, a Netherlands-based supplier of cooking oils, chicken feed, fertilizers, wood pellets, and iron scraps serving clients across Europe, Africa, and the Middle East.

Built and maintained by **Hafiz Ahmad Iftikhar**.

> Live site: https://hollandsefacilitygroup.com

---

## About this project

This is a marketing + lead-generation site for a B2B commodities business. The public pages showcase the product catalogue, company background, certifications and testimonials. The contact page drops leads into a Supabase table and fires a transactional email to the sales inbox via a Supabase Edge Function (Resend).

The code is public because I'm comfortable letting other developers read it — no private business logic lives here, only public marketing content and a hardened contact form. Keys and secrets are read from environment variables and are not committed.

## Stack

- **Next.js 15** (App Router) with React 19 and TypeScript
- **Tailwind CSS 3** + `@tailwindcss/forms` and `@tailwindcss/typography`
- **Supabase** — Postgres + Auth + Edge Functions (contact form persistence and email dispatch)
- **Resend** — transactional email delivery (via a Supabase Edge Function)
- **Recharts**, **React Hook Form**, **Zod** — charts and form validation
- **ESLint 9** + **Prettier** for linting and formatting
- Deployed on **Netlify** (`@netlify/plugin-nextjs`) with canonical-domain redirects

## Features worth calling out

- App Router layout with per-route metadata, OpenGraph, Twitter cards and JSON-LD product schema
- Dynamic `sitemap.ts` and `robots.ts` driven by `NEXT_PUBLIC_SITE_URL`
- Strict security headers in `src/middleware.ts` — CSP, HSTS (production only), X-Content-Type-Options, Referrer-Policy, Permissions-Policy, and `www` → apex redirect
- Contact form with real defences, not just validation theatre:
  - CSRF token issued from `/api/csrf` and verified on submit
  - In-memory rate limiting (5 requests per minute per IP)
  - Honeypot field for bot traps
  - Server-side sanitisation of every field before it touches the DB
  - Postgres RLS enabled on `form_submissions`
- Supabase migration checked into `supabase/migrations/` so the schema is reproducible

## Project layout

```
src/
├── app/                    # App Router pages (about, products, services, blog, contact, ...)
│   ├── api/
│   │   ├── contact/        # POST handler — validates, rate-limits, writes to Supabase
│   │   └── csrf/           # Issues CSRF tokens for the contact form
│   ├── layout.tsx          # Root metadata, fonts, GA, WhatsApp widget
│   ├── robots.ts
│   └── sitemap.ts
├── components/             # Shared UI (header, footer, homepage sections, widgets)
├── contexts/               # React contexts (Auth)
├── lib/
│   ├── supabase/           # Browser + server Supabase clients (SSR cookies)
│   ├── security/           # rate limiter, CSRF, sanitiser
│   ├── analytics.ts        # GA4 helpers
│   └── seo.ts
├── middleware.ts           # Security headers + www→apex redirect
└── styles/                 # Tailwind entry + globals

supabase/
├── functions/
│   └── send-contact-email/ # Edge Function — sends lead email via Resend
└── migrations/             # SQL schema for form_submissions (with RLS)

public/                     # Favicons, manifest, logos, static assets
```

## Getting started

Requirements: Node 18.17+ (Node 20 LTS recommended) and npm.

```bash
# 1. Install
npm install

# 2. Configure environment
cp .env.example .env.local
# then edit .env.local and fill in your Supabase URL/anon key and site URL

# 3. Run the dev server
npm run dev
```

The app listens on [http://localhost:4028](http://localhost:4028).

### Environment variables

All variables live in `.env.local` (ignored by git). See [`.env.example`](./.env.example) for the full list. The minimum you need to run locally is:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (public, protected by RLS) |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL, used for sitemap/robots/OG tags |
| `RESEND_API_KEY` | Set as a Supabase Function secret, not in `.env.local` |

The remaining keys (GA, AdSense, Bing verification, Stripe, AI providers) are optional — leave them blank to disable the corresponding feature.

### Supabase setup

1. Create a Supabase project and copy the URL and anon key into `.env.local`.
2. Apply the schema:
   ```bash
   supabase db push
   ```
   or run `supabase/migrations/20260214134900_form_submissions.sql` manually in the SQL editor.
3. Deploy the Edge Function and set the Resend key as a function secret:
   ```bash
   supabase functions deploy send-contact-email
   supabase secrets set RESEND_API_KEY=your_resend_key
   ```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server on port 4028 |
| `npm run build` | Production build |
| `npm run start` | Start the production server on port 4028 |
| `npm run serve` | Start the production server on the default port |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | ESLint with `--fix` |
| `npm run format` | Format `src/` with Prettier |
| `npm run type-check` | `tsc --noEmit` |

## Deployment

The repo ships with `@netlify/plugin-nextjs` and is currently deployed on Netlify. Any Next.js-compatible platform (Vercel, self-hosted Node) will also work — just make sure to set the same environment variables in the target platform.

## Security notes

- `.env`, `.env.local` and `.env.production` are gitignored. Only `.env.example` is tracked.
- No service-role keys or third-party secrets have ever been committed. The only values that previously sat in `.env` were `NEXT_PUBLIC_*` variables, which are intended to ship to the browser.
- CSP, HSTS and the other security headers are defined in `src/middleware.ts`. If you add an external script or image host, update the CSP there.
- Rate limiting in `src/lib/security/rateLimiter.ts` is in-memory — fine for a single Node instance, but swap it for Redis/Upstash if you scale horizontally.

## License

No open-source licence is attached. The code is public for portfolio and reference purposes; please don't redeploy it as your own business site or reuse the Hollandse FG branding, copy, or imagery.

## Author

**Hafiz Ahmad Iftikhar** — full-stack developer.
GitHub: [@ahmadproweb](https://github.com/ahmadproweb)
