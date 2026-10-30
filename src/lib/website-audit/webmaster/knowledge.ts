import { q } from '@/lib/finance/db';
import { SEED_CHUNKS, SEED_RULES, TECHANTUM_STANDARD_SECTIONS, type SeedChunk } from './knowledge-seed';

type Row = Record<string, unknown>;

export async function ensureKnowledgeSeed() {
  const existing = await q<{ c: string }>(undefined, `SELECT COUNT(*)::text AS c FROM web_standard_sources`);
  if (Number(existing.rows[0]?.c || 0) > 0) return;
  const grouped = new Map<string, SeedChunk[]>();
  for (const chunk of SEED_CHUNKS) {
    const key = `${chunk.source_name}|${chunk.version || ''}|${chunk.authority_level}`;
    grouped.set(key, [...(grouped.get(key) || []), chunk]);
  }
  for (const [key, chunks] of grouped) {
    const sample = chunks[0];
    const source = await q<Row>(
      undefined,
      `INSERT INTO web_standard_sources (source_name, source_type, source_url, version, category, authority_level, last_verified_at, active)
       VALUES ($1,'document',$2,$3,$4,$5,NOW(),TRUE) RETURNING id`,
      [sample.source_name, sample.source_url || null, sample.version || null, sample.category, sample.authority_level]
    );
    const sourceId = source.rows[0].id;
    const title = sample.source_name === 'Techantum Web Quality Standard'
      ? 'Techantum Web Quality Standard v1.0'
      : sample.source_name;
    const body = sample.source_name === 'Techantum Web Quality Standard'
      ? TECHANTUM_STANDARD_SECTIONS.map((item) => `${item.title}\n${item.body}`).join('\n\n')
      : chunks.map((item) => item.content).join('\n');
    const doc = await q<Row>(
      undefined,
      `INSERT INTO web_standard_documents (source_id, title, version, content, active) VALUES ($1,$2,$3,$4,TRUE) RETURNING id`,
      [sourceId, title, sample.version || '1.0', body]
    );
    let index = 0;
    for (const chunk of chunks) {
      await q(
        undefined,
        `INSERT INTO web_standard_chunks (document_id, category, chunk_index, content, rule_reference, active) VALUES ($1,$2,$3,$4,$5,TRUE)`,
        [doc.rows[0].id, chunk.category, index, chunk.content, chunk.rule_reference || null]
      );
      index += 1;
    }
    void key;
  }
  for (const rule of SEED_RULES) {
    await q(
      undefined,
      `INSERT INTO web_standard_rules (rule_code, category, rule_name, description, authority_level, severity_default, evaluation_type, source_reference, version, active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'1.0',TRUE) ON CONFLICT (rule_code) DO NOTHING`,
      [rule.rule_code, rule.category, rule.rule_name, rule.description, rule.authority_level, rule.severity_default, rule.evaluation_type, rule.source_reference]
    );
  }
}

export async function listSources() {
  await ensureKnowledgeSeed();
  const { rows } = await q<Row>(undefined, `SELECT * FROM web_standard_sources ORDER BY authority_level, source_name`);
  return rows;
}

export async function listRules() {
  await ensureKnowledgeSeed();
  const { rows } = await q<Row>(undefined, `SELECT * FROM web_standard_rules ORDER BY rule_code`);
  return rows;
}

export async function listChunks(category?: string): Promise<SeedChunk[]> {
  await ensureKnowledgeSeed();
  const { rows } = await q<Row>(
    undefined,
    category
      ? `SELECT c.content, c.category, c.rule_reference, s.source_name, s.version, s.source_url, s.authority_level
         FROM web_standard_chunks c JOIN web_standard_documents d ON d.id=c.document_id
         JOIN web_standard_sources s ON s.id=d.source_id
         WHERE c.active AND d.active AND s.active AND c.category=$1`
      : `SELECT c.content, c.category, c.rule_reference, s.source_name, s.version, s.source_url, s.authority_level
         FROM web_standard_chunks c JOIN web_standard_documents d ON d.id=c.document_id
         JOIN web_standard_sources s ON s.id=d.source_id
         WHERE c.active AND d.active AND s.active`,
    category ? [category] : []
  );
  return rows.map((row) => ({
    category: String(row.category),
    content: String(row.content),
    rule_reference: row.rule_reference ? String(row.rule_reference) : undefined,
    source_name: String(row.source_name),
    version: row.version ? String(row.version) : undefined,
    source_url: row.source_url ? String(row.source_url) : undefined,
    authority_level: Number(row.authority_level),
  }));
}

export async function saveSource(body: Record<string, unknown>) {
  const name = String(body.source_name || '').trim();
  if (!name) throw new Error('Source name is required');
  const level = Number(body.authority_level || 3);
  if (level < 1 || level > 4) throw new Error('Authority level must be 1–4');
  if (body.id) {
    const { rows } = await q<Row>(
      undefined,
      `UPDATE web_standard_sources SET source_name=$2, source_type=$3, source_url=$4, version=$5, category=$6, authority_level=$7, active=$8, last_verified_at=NOW(), notes=$9
       WHERE id=$1 RETURNING *`,
      [body.id, name, body.source_type || 'document', body.source_url || null, body.version || null, body.category || 'techantum', level, body.active !== false, body.notes || null]
    );
    return rows[0];
  }
  const { rows } = await q<Row>(
    undefined,
    `INSERT INTO web_standard_sources (source_name, source_type, source_url, version, category, authority_level, last_verified_at, active, notes)
     VALUES ($1,$2,$3,$4,$5,$6,NOW(),$7,$8) RETURNING *`,
    [name, body.source_type || 'document', body.source_url || null, body.version || null, body.category || 'techantum', level, body.active !== false, body.notes || null]
  );
  if (body.content) {
    const doc = await q<Row>(undefined, `INSERT INTO web_standard_documents (source_id, title, version, content) VALUES ($1,$2,$3,$4) RETURNING id`, [rows[0].id, name, body.version || '1.0', String(body.content)]);
    const parts = String(body.content).split(/\n{2,}/).filter(Boolean).slice(0, 20);
    let i = 0;
    for (const part of parts) {
      await q(undefined, `INSERT INTO web_standard_chunks (document_id, category, chunk_index, content) VALUES ($1,$2,$3,$4)`, [doc.rows[0].id, body.category || 'techantum', i, part.slice(0, 4000)]);
      i += 1;
    }
  }
  return rows[0];
}

export async function saveRule(body: Record<string, unknown>) {
  const code = String(body.rule_code || '').trim();
  if (!code) throw new Error('Rule code is required');
  const { rows } = await q<Row>(
    undefined,
    `INSERT INTO web_standard_rules (rule_code, category, rule_name, description, authority_level, severity_default, evaluation_type, source_reference, version, active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (rule_code) DO UPDATE SET category=EXCLUDED.category, rule_name=EXCLUDED.rule_name, description=EXCLUDED.description,
       authority_level=EXCLUDED.authority_level, severity_default=EXCLUDED.severity_default, evaluation_type=EXCLUDED.evaluation_type,
       source_reference=EXCLUDED.source_reference, version=EXCLUDED.version, active=EXCLUDED.active
     RETURNING *`,
    [code, body.category || 'ui', body.rule_name || code, body.description || '', Number(body.authority_level || 3), body.severity_default || 'medium', body.evaluation_type || 'AI_REVIEW', body.source_reference || null, body.version || '1.0', body.active !== false]
  );
  return rows[0];
}

export async function getAgentSettings() {
  const { rows } = await q<Row>(undefined, `SELECT * FROM web_master_agent_settings WHERE id='default'`);
  return rows[0] || null;
}

export async function saveAgentSettings(body: Record<string, unknown>) {
  const current = await getAgentSettings();
  const next = { ...(current || {}), ...body };
  await q(
    undefined,
    `INSERT INTO web_master_agent_settings (
      id, agent_enabled, ai_model, max_ai_pages, confidence_threshold, content_character_limit, screenshot_resolution,
      review_uiux, review_content, review_images, review_seo_interpretation, standards_version, techantum_standard_version, prompt_version, updated_at
    ) VALUES ('default',$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())
    ON CONFLICT (id) DO UPDATE SET
      agent_enabled=EXCLUDED.agent_enabled, ai_model=EXCLUDED.ai_model, max_ai_pages=EXCLUDED.max_ai_pages,
      confidence_threshold=EXCLUDED.confidence_threshold, content_character_limit=EXCLUDED.content_character_limit,
      screenshot_resolution=EXCLUDED.screenshot_resolution, review_uiux=EXCLUDED.review_uiux, review_content=EXCLUDED.review_content,
      review_images=EXCLUDED.review_images, review_seo_interpretation=EXCLUDED.review_seo_interpretation,
      standards_version=EXCLUDED.standards_version, techantum_standard_version=EXCLUDED.techantum_standard_version,
      prompt_version=EXCLUDED.prompt_version, updated_at=NOW()`,
    [
      next.agent_enabled !== false, next.ai_model || null, Number(next.max_ai_pages || 5), Number(next.confidence_threshold || 0.6),
      Number(next.content_character_limit || 2000), next.screenshot_resolution || 'compressed',
      next.review_uiux !== false, next.review_content !== false, next.review_images !== false, next.review_seo_interpretation !== false,
      next.standards_version || '1.0.0', next.techantum_standard_version || '1.0', next.prompt_version || '1.0.0',
    ]
  );
  return getAgentSettings();
}
