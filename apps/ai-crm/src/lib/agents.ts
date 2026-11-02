import { query } from './db';
import { generateAssistantReply } from './llm';

export async function getOrCreateWhatsAppAgent(workspaceId: string) {
  const existing = await query(
    `SELECT * FROM crm.ai_agents WHERE workspace_id=$1 AND channel='whatsapp' AND status<>'archived' ORDER BY updated_at DESC LIMIT 1`,
    [workspaceId],
  );
  if (existing.rows[0]) return existing.rows[0];
  const { rows } = await query(
    `INSERT INTO crm.ai_agents (workspace_id, name, agent_type, channel, description, instructions, languages, status)
     VALUES ($1,'Lead Qualification Agent','whatsapp_qualification','whatsapp','Qualify inbound leads','Qualify leads after customer replies. Respect STOP.',ARRAY['en'],'published')
     RETURNING *`,
    [workspaceId],
  );
  return rows[0];
}

export async function listAgents(workspaceId: string) {
  const { rows } = await query(
    `SELECT * FROM crm.ai_agents WHERE workspace_id=$1 AND status<>'archived' ORDER BY updated_at DESC`,
    [workspaceId],
  );
  return rows;
}

export async function updateAgent(workspaceId: string, id: string, patch: Record<string, any>) {
  const fields: string[] = [];
  const params: unknown[] = [workspaceId, id];
  const map: Record<string, string> = {
    name: 'name',
    description: 'description',
    instructions: 'instructions',
    agentType: 'agent_type',
    channel: 'channel',
    status: 'status',
  };
  for (const [k, col] of Object.entries(map)) {
    if (k in patch) {
      params.push(patch[k]);
      fields.push(`${col}=$${params.length}`);
    }
  }
  if ('languages' in patch) {
    params.push(patch.languages || []);
    fields.push(`languages=$${params.length}`);
  }
  if ('scoringRules' in patch) {
    params.push(JSON.stringify(patch.scoringRules || []));
    fields.push(`scoring_rules=$${params.length}::jsonb`);
  }
  if ('voiceSettings' in patch) {
    params.push(JSON.stringify(patch.voiceSettings || {}));
    fields.push(`voice_settings=$${params.length}::jsonb`);
  }
  if (!fields.length) {
    const { rows } = await query(`SELECT * FROM crm.ai_agents WHERE workspace_id=$1 AND id=$2`, [workspaceId, id]);
    return rows[0] || null;
  }
  fields.push('updated_at=NOW()', 'version=version+1');
  const { rows } = await query(
    `UPDATE crm.ai_agents SET ${fields.join(', ')} WHERE workspace_id=$1 AND id=$2 RETURNING *`,
    params,
  );
  return rows[0] || null;
}

export async function listKnowledge(workspaceId: string, agentId?: string) {
  const params: unknown[] = [workspaceId];
  let sql = `SELECT * FROM crm.knowledge_documents WHERE workspace_id=$1`;
  if (agentId) {
    params.push(agentId);
    sql += ` AND (agent_id=$${params.length} OR agent_id IS NULL)`;
  }
  sql += ` ORDER BY updated_at DESC`;
  const { rows } = await query(sql, params);
  return rows;
}

export async function upsertKnowledge(workspaceId: string, input: { id?: string; agentId?: string; title: string; docType?: string; content: string }) {
  if (input.id) {
    const { rows } = await query(
      `UPDATE crm.knowledge_documents SET title=$3, doc_type=$4, content=$5, version=version+1, updated_at=NOW()
       WHERE workspace_id=$1 AND id=$2 RETURNING *`,
      [workspaceId, input.id, input.title, input.docType || 'faq', input.content],
    );
    const doc = rows[0];
    if (doc) {
      const { indexKnowledgeDocument } = await import('./rag');
      await indexKnowledgeDocument(workspaceId, doc.id, input.agentId || doc.agent_id || null, input.content);
    }
    return doc;
  }
  const { rows } = await query(
    `INSERT INTO crm.knowledge_documents (workspace_id, agent_id, title, doc_type, content, status)
     VALUES ($1,$2,$3,$4,$5,'indexed') RETURNING *`,
    [workspaceId, input.agentId || null, input.title, input.docType || 'faq', input.content],
  );
  const doc = rows[0];
  const { indexKnowledgeDocument } = await import('./rag');
  await indexKnowledgeDocument(workspaceId, doc.id, input.agentId || null, input.content);
  return doc;
}

export async function listTestMessages(workspaceId: string, agentId: string) {
  const { rows } = await query(
    `SELECT * FROM crm.agent_test_messages WHERE workspace_id=$1 AND agent_id=$2 ORDER BY created_at ASC LIMIT 100`,
    [workspaceId, agentId],
  );
  return rows;
}

export async function runAgentTest(workspaceId: string, agentId: string, userText: string) {
  const agent = (await query(`SELECT * FROM crm.ai_agents WHERE workspace_id=$1 AND id=$2`, [workspaceId, agentId])).rows[0];
  if (!agent) throw new Error('Agent not found');
  const knowledge = await listKnowledge(workspaceId, agentId);
  const history = await listTestMessages(workspaceId, agentId);

  await query(
    `INSERT INTO crm.agent_test_messages (workspace_id, agent_id, role, body) VALUES ($1,$2,'user',$3)`,
    [workspaceId, agentId, userText],
  );

  const reply = await generateAssistantReply({
    instructions: agent.instructions,
    knowledge: knowledge.map((k) => `# ${k.title}\n${k.content}`).join('\n\n').slice(0, 8000),
    messages: [
      ...history.map((m) => ({
        role: (m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user') as 'user' | 'assistant' | 'system',
        content: m.body,
      })),
      { role: 'user', content: userText },
    ],
  });

  const { rows } = await query(
    `INSERT INTO crm.agent_test_messages (workspace_id, agent_id, role, body) VALUES ($1,$2,'assistant',$3) RETURNING *`,
    [workspaceId, agentId, reply.text],
  );
  return { reply: rows[0], provider: reply.provider, mode: reply.mode };
}
