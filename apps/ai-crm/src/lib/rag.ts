import { query } from './db';
import { ensureEnv } from './env';

function cosine(a: number[], b: number[]) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function chunkText(text: string, size = 700) {
  const parts = text.replace(/\r/g, '').split(/\n{2,}/);
  const chunks: string[] = [];
  let buf = '';
  for (const part of parts) {
    if ((buf + '\n\n' + part).length > size) {
      if (buf) chunks.push(buf.trim());
      buf = part;
    } else {
      buf = buf ? `${buf}\n\n${part}` : part;
    }
  }
  if (buf.trim()) chunks.push(buf.trim());
  return chunks.length ? chunks : [text.slice(0, size)];
}

async function embed(texts: string[]) {
  ensureEnv();
  const apiKey = process.env.CRM_LLM_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) return texts.map((t) => hashEmbed(t));
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: texts }),
  });
  const json = await res.json();
  if (!res.ok || !Array.isArray(json.data)) {
    return texts.map((t) => hashEmbed(t));
  }
  return (json.data || []).map((d: any) => d.embedding as number[]);
}

function hashEmbed(t: string) {
  const v = new Array(32).fill(0);
  for (let i = 0; i < t.length; i += 1) v[i % 32] += t.charCodeAt(i) / 255;
  return v;
}

export async function indexKnowledgeDocument(workspaceId: string, documentId: string, agentId: string | null, content: string) {
  await query(`DELETE FROM crm.knowledge_chunks WHERE document_id=$1`, [documentId]);
  const chunks = chunkText(content);
  const vectors = await embed(chunks);
  for (let i = 0; i < chunks.length; i += 1) {
    await query(
      `INSERT INTO crm.knowledge_chunks (workspace_id, document_id, agent_id, chunk_index, content, embedding, token_estimate)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7)`,
      [workspaceId, documentId, agentId, i, chunks[i], JSON.stringify(vectors[i] || []), Math.ceil(chunks[i].length / 4)],
    );
  }
  return { chunks: chunks.length };
}

export async function retrieveKnowledge(workspaceId: string, agentId: string | null, question: string, k = 4) {
  const { rows } = await query(
    `SELECT id, content, embedding FROM crm.knowledge_chunks
     WHERE workspace_id=$1 AND ($2::uuid IS NULL OR agent_id=$2 OR agent_id IS NULL)
     ORDER BY created_at DESC LIMIT 200`,
    [workspaceId, agentId],
  );
  if (!rows.length) return [] as Array<{ content: string; score: number }>;
  const [qVec] = await embed([question]);
  return rows
    .map((row: any) => ({
      content: row.content as string,
      score: cosine(qVec, Array.isArray(row.embedding) ? row.embedding : []),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .filter((r) => r.score > 0.05 || r.content.length > 0);
}
