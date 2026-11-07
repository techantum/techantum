const base = process.env.CRM_WEB_URL || 'https://aicrm.techantum.info';
const concurrent = Number(process.env.CRM_LOAD_CONCURRENCY || 20);
const targetMs = Number(process.env.CRM_LOAD_P95_MS || 800);

const started = await Promise.all(
  Array.from({ length: concurrent }, async () => {
    const t0 = Date.now();
    const res = await fetch(`${base}/api/health`);
    return { ok: res.ok, ms: Date.now() - t0 };
  }),
);
const times = started.map((row) => row.ms).sort((a, b) => a - b);
const p95 = times[Math.min(times.length - 1, Math.ceil(times.length * 0.95) - 1)];
const failed = started.filter((row) => !row.ok).length;
const pass = failed === 0 && p95 <= targetMs;
console.log(JSON.stringify({ base, concurrent, p95, targetMs, failed, pass }));
process.exit(pass ? 0 : 1);
