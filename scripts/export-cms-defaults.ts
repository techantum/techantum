import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { defaultBranding, defaultSeo, defaultCmsEntries } from '../src/lib/cms/default-content';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist-cms');
mkdirSync(outDir, { recursive: true });

writeFileSync(
  join(outDir, 'seed-data.mjs'),
  `export const defaultBranding = ${JSON.stringify(defaultBranding, null, 2)};
export const defaultSeo = ${JSON.stringify(defaultSeo, null, 2)};
export const defaultCmsEntries = ${JSON.stringify(defaultCmsEntries, null, 2)};
`,
  'utf8'
);

console.log('Exported CMS defaults to dist-cms/seed-data.mjs');
