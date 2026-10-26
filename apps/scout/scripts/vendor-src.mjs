import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.join(appDir, '../..');
const src = path.join(root, 'src');
const dest = path.join(appDir, 'src');

function copyFile(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

function copyDir(from, to, skip = []) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    if (skip.includes(entry.name) || entry.name.endsWith('.test.ts')) continue;
    const a = path.join(from, entry.name);
    const b = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(a, b, skip);
    else copyFile(a, b);
  }
}

copyDir(path.join(src, 'lib/youtube'), path.join(dest, 'lib/youtube'));
copyDir(path.join(src, 'lib/places'), path.join(dest, 'lib/places'));
copyDir(path.join(src, 'lib/saas'), path.join(dest, 'lib/saas'));
copyDir(path.join(src, 'lib/ai'), path.join(dest, 'lib/ai'));
copyFile(path.join(src, 'lib/db/postgres.ts'), path.join(dest, 'lib/db/postgres.ts'));
for (const file of ['db.ts', 'errors.ts', 'http.ts', 'excel.ts']) {
  copyFile(path.join(src, 'lib/finance', file), path.join(dest, 'lib/finance', file));
}
copyFile(path.join(src, 'lib/supabase/admin.ts'), path.join(dest, 'lib/supabase/admin.ts'));
copyFile(path.join(src, 'lib/supabase/local-jwt.ts'), path.join(dest, 'lib/supabase/local-jwt.ts'));
copyFile(path.join(src, 'lib/storage/local.ts'), path.join(dest, 'lib/storage/local.ts'));

copyDir(path.join(src, 'components/admin/youtube'), path.join(dest, 'components/admin/youtube'));
copyDir(path.join(src, 'components/admin/lead-discovery'), path.join(dest, 'components/admin/lead-discovery'));
copyDir(path.join(src, 'components/lead-discovery'), path.join(dest, 'components/lead-discovery'));
for (const file of ['AdminAlert.tsx', 'AdminBadge.tsx', 'AdminButton.tsx', 'AdminPageHeader.tsx', 'AdminSection.tsx', 'AdminStatCard.tsx', 'AdminField.tsx', 'AdminFormGrid.tsx']) {
  copyFile(path.join(src, 'components/admin', file), path.join(dest, 'components/admin', file));
}
copyFile(path.join(src, 'components/partner/PartnerUi.tsx'), path.join(dest, 'components/partner/PartnerUi.tsx'));
copyFile(path.join(src, 'components/ui/AppIcon.tsx'), path.join(dest, 'components/ui/AppIcon.tsx'));

const ytPages = path.join(src, 'app/admin/(dashboard)/youtube-research');
const ytDest = path.join(dest, 'app/(app)/youtube');
copyDir(ytPages, ytDest, ['layout.tsx']);

const leadPages = path.join(src, 'app/admin/(dashboard)/lead-discovery');
const leadDest = path.join(dest, 'app/(app)/leads');
copyDir(leadPages, leadDest, ['layout.tsx']);

copyDir(path.join(src, 'app/api/admin/youtube'), path.join(dest, 'app/api/youtube'));
copyDir(path.join(src, 'app/api/admin/lead-discovery'), path.join(dest, 'app/api/leads'));

const gif = path.join(root, 'public/youtube/analysing.gif');
if (fs.existsSync(gif)) {
  copyFile(gif, path.join(appDir, 'public/youtube/analysing.gif'));
}

const migDest = path.join(appDir, 'supabase/migrations');
fs.mkdirSync(migDest, { recursive: true });
const needed = [
  '20260818160000_lead_discovery.sql',
  '20260822120000_lead_discovery_run_name.sql',
  '20260822130000_lead_discovery_location.sql',
  '20260916150000_ai_gateway.sql',
  '20260926121000_ai_provider_organization.sql',
  '20261022120000_youtube_research.sql',
  '20261022133000_youtube_research_projects.sql',
  '20261022162000_youtube_paid_placement.sql',
  '20261023120000_youtube_ai_research.sql',
  '20261023140000_youtube_research_partner.sql',
  '20261024120000_youtube_thumbnail_reading.sql',
  '20261026120000_saas_scout.sql',
];
for (const file of needed) {
  copyFile(path.join(root, 'supabase/migrations', file), path.join(migDest, file));
}

console.log('Vendored YouTube Research, Lead Discovery, and schema into Revealeo.');
