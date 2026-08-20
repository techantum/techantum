import { createAdminClient } from '@/lib/supabase/admin';
import type { AISettings, KnowledgeEntry } from './types';
import { DEFAULT_AI_SETTINGS } from './config';

export async function getAISettings(): Promise<AISettings> {
  const supabase = createAdminClient();
  const { data } = await supabase.from('ai_settings').select('*').eq('id', 1).maybeSingle();
  if (!data) return { id: 1, ...DEFAULT_AI_SETTINGS, updated_at: new Date().toISOString() };
  return data as AISettings;
}

export async function searchKnowledge(query: string, limit = 6): Promise<KnowledgeEntry[]> {
  const supabase = createAdminClient();
  const q = query.trim();
  if (!q) {
    const { data } = await supabase
      .from('ai_knowledge_entries')
      .select('*, ai_knowledge_categories(name, slug)')
      .eq('status', 'PUBLISHED')
      .eq('allow_ai', true)
      .order('updated_at', { ascending: false })
      .limit(limit);
    return (data || []) as KnowledgeEntry[];
  }

  const terms = q
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2)
    .slice(0, 8);

  let builder = supabase
    .from('ai_knowledge_entries')
    .select('*, ai_knowledge_categories(name, slug)')
    .eq('status', 'PUBLISHED')
    .eq('allow_ai', true);

  if (terms.length > 0) {
    const orFilter = terms
      .flatMap((term) => [
        `title.ilike.%${term}%`,
        `content.ilike.%${term}%`,
        `keywords.ilike.%${term}%`,
        `source_url.ilike.%${term}%`,
      ])
      .join(',');
    builder = builder.or(orFilter);
  }

  const { data } = await builder.limit(limit);
  return (data || []) as KnowledgeEntry[];
}

export function formatKnowledgeContext(entries: KnowledgeEntry[]): string {
  if (entries.length === 0) return 'No matching Techantum knowledge entries were found.';
  return entries
    .map((entry, index) => {
      const category = entry.ai_knowledge_categories?.name || 'General';
      const source = entry.source_url ? `\nSource: ${entry.source_url}` : '';
      return `[${index + 1}] ${category} — ${entry.title}${source}\n${entry.content}`;
    })
    .join('\n\n---\n\n');
}
