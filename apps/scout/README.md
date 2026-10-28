# Hookooh

Standalone SaaS for **YouTube Research** and **Lead Discovery**. It does not import Techantum source. You can copy this folder out of the Techantum repo and run it on its own.

## Move the folder

Copy `apps/scout` (this directory) anywhere, for example `D:\Projects\revealeo`. Do not copy the Techantum `src` tree.

## First run

```bash
cd revealeo
cp .env.example .env   # or: npm run env:copy  while this folder still sits inside Techantum
# fill DATABASE_URL, DIRECT_URL, Supabase, Places, and AI keys
npm install
npm run db:migrate
npm run dev
```

Open [http://localhost:3010](http://localhost:3010). Sign up, then use `/youtube` and `/leads`.

`npm run env:copy` copies the parent Techantum `.env` into this folder when Revealeo is still nested. After you move the folder, keep that `.env` with the app.

## Database

`db:migrate` applies every file in `supabase/migrations` (YouTube, leads, AI gateway, Revealeo accounts). Safe to re-run on an existing Techantum database: Revealeo rows are isolated with `saas_account_id`. A brand-new database does not need Techantum’s other tables.

## Product

- Public site, signup, login
- 14-day Growth trial (YouTube + leads)
- Plans: Starter (leads), Growth, Scale
- Billing updates the plan in the database (Stripe checkout is not wired yet)
- YouTube Research: `/youtube`
- Lead Discovery: `/leads`

## Hosting

Point the host at this folder (not the Techantum app). Set the same env vars as `.env.example`, plus:

```
NEXT_PUBLIC_REVEALEO_URL=https://your-revealeo-domain
NEXT_PUBLIC_SITE_URL=https://your-revealeo-domain
```

Keep API keys on the server. Do not put YouTube or Places keys in `NEXT_PUBLIC_*` variables.
