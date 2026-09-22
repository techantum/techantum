import { createAdminClient } from '@/lib/supabase/admin';

const DEMO_CLIENTS = [
  { name: 'ABC Hospitals', legal_name: 'ABC Hospitals Pvt Ltd', contact_name: 'Dr. Mehta', email: 'ops@abchospitals.demo', phone: '+919800000001', health: 'ATTENTION', quality: 'YELLOW' },
  { name: 'XYZ Clinics', legal_name: 'XYZ Clinics LLP', contact_name: 'Anita Rao', email: 'hello@xyzclinics.demo', phone: '+919800000002', health: 'HEALTHY', quality: 'GREEN' },
  { name: 'Northwind Retail', legal_name: 'Northwind Retail India', contact_name: 'Kiran Shah', email: 'it@northwind.demo', phone: '+919800000003', health: 'HEALTHY', quality: 'GREEN' },
  { name: 'Harbor Logistics', legal_name: 'Harbor Logistics Pvt Ltd', contact_name: 'Vikram Iyer', email: 'support@harbor.demo', phone: '+919800000004', health: 'CRITICAL', quality: 'RED' },
  { name: 'Lotus Education', legal_name: 'Lotus Education Trust', contact_name: 'Sneha Nair', email: 'admissions@lotus.demo', phone: '+919800000005', health: 'ATTENTION', quality: 'UNKNOWN' },
];

export async function seedDemoProviderData() {
  if (process.env.NODE_ENV === 'production' && process.env.WA_PROVIDER_SEED_DEMO !== 'true') {
    throw new Error('Demo seed is disabled in production.');
  }
  const supabase = createAdminClient();
  const { count } = await supabase.from('wa_clients').select('*', { count: 'exact', head: true }).eq('is_demo', true);
  if ((count || 0) > 0) return { seeded: false, message: 'Demo records already exist.' };

  for (const [index, client] of DEMO_CLIENTS.entries()) {
    const { data: row } = await supabase
      .from('wa_clients')
      .insert({
        name: client.name,
        legal_name: client.legal_name,
        contact_name: client.contact_name,
        email: client.email,
        phone: client.phone,
        status: client.health === 'CRITICAL' ? 'ATTENTION' : 'ACTIVE',
        onboarding_status: index === 4 ? 'PHONE_PENDING' : 'COMPLETED',
        platform_health: client.health,
        platform_health_reasons: client.health === 'HEALTHY' ? ['All operational checks passed'] : ['Demo: attention required'],
        meta_connection_status: index === 4 ? 'PENDING' : 'CONNECTED',
        meta_business_id: `DEMO_BIZ_${index + 1}`,
        is_demo: true,
      })
      .select('id')
      .single();
    if (!row) continue;

    const { data: waba } = await supabase
      .from('wa_business_accounts')
      .insert({
        client_id: row.id,
        meta_business_id: `DEMO_BIZ_${index + 1}`,
        waba_id: `DEMO_WABA_${index + 1}`,
        name: `${client.name} WABA`,
        account_status: 'APPROVED',
        webhook_subscribed: index !== 4,
        last_synced_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    const { data: phone } = await supabase
      .from('wa_phone_numbers')
      .insert({
        client_id: row.id,
        waba_account_id: waba?.id,
        waba_id: `DEMO_WABA_${index + 1}`,
        phone_number_id: `DEMO_PHONE_${index + 1}`,
        display_phone_number: client.phone,
        verified_name: client.name,
        registration_status: index === 4 ? 'UNREGISTERED' : 'VERIFIED',
        quality_rating: client.quality,
        messaging_status: 'AVAILABLE',
        last_synced_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (phone && client.quality !== 'GREEN') {
      await supabase.from('wa_phone_quality_history').insert({
        phone_number_id: phone.id,
        previous_quality: 'GREEN',
        new_quality: client.quality,
        event: 'DEMO',
      });
    }

    await supabase.from('wa_templates').insert([
      { client_id: row.id, waba_id: `DEMO_WABA_${index + 1}`, name: `${client.name.toLowerCase().replace(/\s+/g, '_')}_welcome`, category: 'UTILITY', language: 'en', body: 'Hello {{1}}, welcome to our WhatsApp updates.', internal_status: 'META_APPROVED', meta_status: 'APPROVED', is_demo: undefined },
      { client_id: row.id, waba_id: `DEMO_WABA_${index + 1}`, name: `${client.name.toLowerCase().replace(/\s+/g, '_')}_pending`, category: 'UTILITY', language: 'en', body: 'Hi {{1}}, your request {{2}} is being reviewed.', internal_status: 'META_PENDING', meta_status: 'PENDING' },
      { client_id: row.id, waba_id: `DEMO_WABA_${index + 1}`, name: `${client.name.toLowerCase().replace(/\s+/g, '_')}_rejected`, category: 'MARKETING', language: 'en', body: 'Special offer for {{1}}', internal_status: 'META_REJECTED', meta_status: 'REJECTED', rejection_reason: 'Demo: promotional language' },
    ]);

    const statuses = ['SENT', 'DELIVERED', 'READ', 'FAILED'] as const;
    const messages = Array.from({ length: 18 }, (_, i) => {
      const status = statuses[i % statuses.length];
      const created = new Date(Date.now() - i * 3600000).toISOString();
      return {
        client_id: row.id,
        waba_id: `DEMO_WABA_${index + 1}`,
        phone_number_id: phone?.id,
        wamid: `wamid.DEMO.${index}.${i}`,
        direction: 'OUTBOUND',
        type: 'template',
        status,
        content_json: { text: 'Demo message' },
        sent_at: created,
        delivered_at: ['DELIVERED', 'READ'].includes(status) ? created : null,
        read_at: status === 'READ' ? created : null,
        failed_at: status === 'FAILED' ? created : null,
      };
    });
    await supabase.from('wa_messages').insert(messages);

    await supabase.from('wa_alerts').insert({
      client_id: row.id,
      type: client.quality === 'RED' ? 'QUALITY_DOWNGRADE' : client.quality === 'YELLOW' ? 'QUALITY_DOWNGRADE' : 'WEBHOOK_FAILED',
      severity: client.health === 'CRITICAL' ? 'CRITICAL' : client.health === 'ATTENTION' ? 'WARNING' : 'INFORMATION',
      title:
        client.quality === 'RED'
          ? 'Phone quality changed GREEN → RED'
          : client.quality === 'YELLOW'
            ? 'Phone quality changed GREEN → YELLOW'
            : index === 4
              ? 'Phone registration incomplete'
              : 'Demo operational notice',
      description: 'Marked demo record. Not a live Meta event.',
      status: 'OPEN',
    });

    await supabase.from('wa_billing_accounts').insert({ client_id: row.id, plan: index > 2 ? 'GROWTH' : 'BASIC', monthly_fee: index > 2 ? 14999 : 4999 });
    await supabase.from('wa_webhook_events').insert({
      client_id: row.id,
      waba_id: `DEMO_WABA_${index + 1}`,
      event_key: `demo-${row.id}`,
      event_type: 'message.delivered',
      payload_json: { demo: true },
      signature_valid: true,
      processing_status: index === 3 ? 'FAILED' : 'PROCESSED',
      error_message: index === 3 ? 'Demo webhook failure' : null,
    });
  }

  return { seeded: true, message: 'Created 5 clearly marked demo clients.' };
}
