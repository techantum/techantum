import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { getAISettings } from '@/lib/whatsapp/knowledge';
import { createAdminClient } from '@/lib/supabase/admin';
import { getWhatsAppAiConfig } from '@/lib/whatsapp/config';
import { getGatewayConfig } from '@/lib/ai/config';
import { getWhatsAppDeliveryInfo } from '@/lib/ops/whatsapp';
import { getWhatsAppReceiveHealth } from '@/lib/whatsapp/meta';

export async function GET() {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;

  const [settings, waConfig, gateway, delivery, receiveHealth] = await Promise.all([
    getAISettings(),
    Promise.resolve(getWhatsAppAiConfig()),
    getGatewayConfig(),
    getWhatsAppDeliveryInfo().catch(() => null),
    getWhatsAppReceiveHealth().catch(() => null),
  ]);

  const openai = gateway.public.providers.find((p) => p.provider === 'openai');
  const gemini = gateway.public.providers.find((p) => p.provider === 'gemini');

  return NextResponse.json({
    settings,
    whatsapp: {
      configured: waConfig.configured,
      phone_number_id: waConfig.phoneNumberId ? `${waConfig.phoneNumberId.slice(0, 4)}…` : null,
      business_account_id: waConfig.businessAccountId ? `${waConfig.businessAccountId.slice(0, 4)}…` : null,
      display_number: receiveHealth?.display_number || delivery?.from_number || null,
      template_status: delivery?.template_status || null,
      receiving: receiveHealth?.receiving ?? false,
      webhook_url: receiveHealth?.webhook_url || 'https://techantum.com/api/webhooks/whatsapp',
      issues: receiveHealth?.issues || [],
    },
    openai: {
      configured: Boolean(openai?.configured),
      model: openai?.model || null,
      source: openai?.source || 'none',
    },
    gateway: {
      primary: gateway.public.primaryProvider,
      fallback: gateway.public.fallbackProvider,
      geminiConfigured: Boolean(gemini?.configured),
    },
  });
}

export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  const body = (await request.json()) as Record<string, unknown>;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('ai_settings')
    .update({
      ai_enabled: body.ai_enabled,
      default_mode: body.default_mode,
      auto_handoff: body.auto_handoff,
      auto_lead_creation: body.auto_lead_creation,
      auto_conversation_summary: body.auto_conversation_summary,
      knowledge_retrieval_limit: body.knowledge_retrieval_limit,
      max_response_length: body.max_response_length,
      fallback_message: body.fallback_message,
      out_of_scope_message: body.out_of_scope_message,
      business_hours: body.business_hours,
      after_hours_message: body.after_hours_message,
      handoff_mode: body.handoff_mode,
      followup_enabled: body.followup_enabled,
      followup_first_hours: body.followup_first_hours,
      followup_second_hours: body.followup_second_hours,
      followup_max: body.followup_max,
      followup_start_hour: body.followup_start_hour,
      followup_end_hour: body.followup_end_hour,
    })
    .eq('id', 1)
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supabase.from('whatsapp_audit_log').insert({
    user_id: auth.user.id,
    action: 'ai_settings_updated',
    entity_type: 'ai_settings',
    entity_id: '1',
    metadata: body,
  });
  return NextResponse.json(data);
}
