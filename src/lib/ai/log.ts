import { createAdminClient } from '@/lib/supabase/admin';
import type { AIProviderId, ProviderAttempt } from './types';

export async function logProviderEvent(input: {
  purpose?: string;
  primaryProvider?: AIProviderId;
  fallbackProvider?: AIProviderId;
  usedProvider?: AIProviderId | null;
  usedModel?: string | null;
  status: 'success' | 'fallback_success' | 'failed' | 'all_failed';
  reason?: string | null;
  attempts: ProviderAttempt[];
}) {
  try {
    const supabase = createAdminClient();
    await supabase.from('ai_provider_events').insert({
      purpose: input.purpose || null,
      primary_provider: input.primaryProvider || null,
      fallback_provider: input.fallbackProvider || null,
      used_provider: input.usedProvider || null,
      used_model: input.usedModel || null,
      status: input.status,
      reason: input.reason || null,
      attempts: input.attempts,
    });
  } catch (error) {
    console.warn('[ai gateway] failed to persist provider event', error instanceof Error ? error.message : error);
  }
}

export async function listProviderEvents(limit = 20) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('ai_provider_events')
    .select('id, created_at, purpose, used_provider, used_model, status, reason, attempts')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    if (/does not exist|schema cache|could not find the table/i.test(error.message)) return [];
    throw new Error(error.message);
  }
  return (data || []).map((row) => ({
    id: row.id as string,
    createdAt: row.created_at as string,
    purpose: (row.purpose as string | null) || null,
    usedProvider: (row.used_provider as string | null) || null,
    usedModel: (row.used_model as string | null) || null,
    status: row.status as string,
    reason: (row.reason as string | null) || null,
    attempts: Array.isArray(row.attempts) ? row.attempts : [],
  }));
}
