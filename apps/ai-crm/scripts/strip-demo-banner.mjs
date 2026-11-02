import fs from 'node:fs';
import path from 'node:path';

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (full.endsWith('.tsx')) transform(full);
  }
}

function transform(file) {
  let text = fs.readFileSync(file, 'utf8');
  if (!text.includes('DemoBanner')) return;
  if (!text.includes("from '@/components/StatusBanner'")) {
    text = text.replace(
      /from '@\/components\/ui';/,
      "from '@/components/ui';\nimport { StatusBanner } from '@/components/StatusBanner';",
    );
  }
  text = text.replace(/\bDemoBanner\b/g, 'StatusBanner');
  text = text.replace(/\{\s*StatusBanner\s*,/g, '{');
  text = text.replace(/,\s*StatusBanner(?=\s*[,}])/g, '');
  text = text.replace(/\{\s*,/g, '{');
  text = text.replace(/,\s*\}/g, '}');
  fs.writeFileSync(file, text);
  console.log('updated', file);
}

walk(path.join(process.cwd(), 'src/app'));
