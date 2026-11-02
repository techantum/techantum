import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadAppEnv } from '../scripts/load-env.mjs';

const appDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
loadAppEnv(appDir);

const { processOnce } = await import(pathToFileURL(path.join(appDir, 'src/lib/worker-runner.ts')).href);

console.log('[ai-crm-worker] started');
while (true) {
  try {
    const results = await processOnce(10);
    if (results.length) console.log('[ai-crm-worker]', results);
  } catch (error) {
    console.error('[ai-crm-worker]', error);
  }
  await new Promise((r) => setTimeout(r, 2000));
}
