import { createAdminClient } from '@/lib/supabase/admin';
import type { AISettings, KnowledgeEntry } from './types';
import { DEFAULT_AI_SETTINGS } from './config';
import { isGreetingOnly } from './greeting';

export async function getAISettings(): Promise<AISettings> {
  const supabase = createAdminClient();
  const { data } = await supabase.from('ai_settings').select('*').eq('id', 1).maybeSingle();
  if (!data) return { id: 1, ...DEFAULT_AI_SETTINGS, updated_at: new Date().toISOString() };
  const settings = { ...DEFAULT_AI_SETTINGS, ...(data as AISettings) };
  if (/don['’]?t have that information confirmed|how can we help you today\??\s*we build websites/i.test(settings.fallback_message || '')) {
    settings.fallback_message = DEFAULT_AI_SETTINGS.fallback_message;
  }
  settings.followup_enabled = settings.followup_enabled !== false;
  settings.followup_first_hours = Number(settings.followup_first_hours) === 24 ? 24 : 12;
  settings.followup_second_hours = Number.isFinite(Number(settings.followup_second_hours))
    ? Number(settings.followup_second_hours)
    : 20;
  settings.followup_max = Math.min(2, Math.max(1, Number(settings.followup_max) || 2));
  settings.followup_start_hour = Number(settings.followup_start_hour) || 9;
  settings.followup_end_hour = Number(settings.followup_end_hour) || 20;
  return settings;
}

export async function searchKnowledge(query: string, limit = 8): Promise<KnowledgeEntry[]> {
  const supabase = createAdminClient();
  const q = isGreetingOnly(query) ? '' : query.trim();

  const published = () =>
    supabase
      .from('ai_knowledge_entries')
      .select('*, ai_knowledge_categories(name, slug)')
      .eq('status', 'PUBLISHED')
      .eq('allow_ai', true);

  const [{ data: recent }, matchedResult] = await Promise.all([
    published().order('updated_at', { ascending: false }).limit(limit),
    q
      ? (async () => {
          const terms = q
            .toLowerCase()
            .split(/\s+/)
            .filter((t) => t.length > 2)
            .slice(0, 8);
          let builder = published();
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
          return builder.limit(limit);
        })()
      : Promise.resolve({ data: [] as KnowledgeEntry[] | null }),
  ]);

  const matched = (matchedResult as { data?: KnowledgeEntry[] | null }).data || [];
  const byId = new Map<string, KnowledgeEntry>();
  for (const row of [...matched, ...((recent || []) as KnowledgeEntry[])]) {
    if (row?.id && !byId.has(row.id)) byId.set(row.id, row);
  }
  return [...byId.values()].slice(0, limit);
}

export function formatKnowledgeContext(entries: KnowledgeEntry[]): string {
  if (entries.length === 0) return 'No matching Techantum knowledge entries were found. Use the website service catalog above.';
  return `Use these published knowledge entries, including website and PDF imports:\n\n${entries
    .map((entry, index) => {
      const category = entry.ai_knowledge_categories?.name || 'General';
      const source = entry.source_url || entry.source_file_url;
      const sourceLine = source ? `\nSource: ${source}` : '';
      return `[${index + 1}] ${category} — ${entry.title}${sourceLine}\n${entry.content}`;
    })
    .join('\n\n---\n\n')}`;
}
