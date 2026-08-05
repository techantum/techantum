/**
 * Reseed CMS database with current default content from source.
 * Run: npx tsx scripts/reseed-cms.ts
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { defaultBranding, defaultSeo, defaultCmsEntries } from '../src/lib/cms/default-content';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv() {
  const envPath = join(root, '.env');
  const text = readFileSync(envPath, 'utf8');
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    let value = trimmed.slice(eq + 1);
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !secretKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(url, secretKey);

async function main() {
  console.log('Updating site_branding...');
  const brandingRes = await supabase.from('site_branding').upsert({ id: 1, ...defaultBranding });
  if (brandingRes.error) throw brandingRes.error;

  console.log('Updating site_seo...');
  const seoRes = await supabase.from('site_seo').upsert({ id: 1, ...defaultSeo });
  if (seoRes.error) throw seoRes.error;

  console.log(`Updating ${defaultCmsEntries.length} CMS entries...`);
  for (const entry of defaultCmsEntries) {
    const { error } = await supabase.from('cms_content').upsert({
      entry_key: entry.entry_key,
      entry_group: entry.entry_group,
      label: entry.label,
      content: entry.content,
    });
    if (error) throw new Error(`${entry.entry_key}: ${error.message}`);
  }

  const { data: overview } = await supabase
    .from('cms_content')
    .select('content')
    .eq('entry_key', 'about.overview')
    .maybeSingle();

  console.log('Verified about.overview introTitle:', (overview?.content as { introTitle?: string })?.introTitle);
  console.log('CMS reseed complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
