import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPublicMetaSignupConfig } from '@/lib/whatsapp-provider/config';
import { readClientCredential } from '@/lib/whatsapp-provider/credentials';
import { computeOnboardingSetup } from '@/lib/whatsapp-provider/onboarding-state';
import { ensurePortalWorkspace, getPortalWhatsAppAssets, getSelfServeSession } from '@/lib/whatsapp-provider/services/self-onboard';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const config = getPublicMetaSignupConfig();
  if (!user) {
    return NextResponse.json({
      authenticated: false,
      membership: false,
      configured: config.configured,
      existingConfigured: config.existingConfigured,
      graphVersion: config.graphVersion,
      appId: config.appId,
      configId: config.configId,
      setup: computeOnboardingSetup({}),
    });
  }
  try {
    await ensurePortalWorkspace(user);
  } catch (err) {
    return NextResponse.json({
      authenticated: true,
      membership: false,
      email: user.email,
      configured: config.configured,
      existingConfigured: config.existingConfigured,
      error: err instanceof Error ? err.message : 'Could not prepare the WhatsApp workspace.',
      setup: computeOnboardingSetup({}),
    });
  }
  const session = await getSelfServeSession(user.id);
  if (!session) {
    return NextResponse.json({
      authenticated: true,
      membership: false,
      email: user.email,
      configured: config.configured,
      existingConfigured: config.existingConfigured,
      appId: config.appId,
      graphVersion: config.graphVersion,
      configId: config.configId,
      setup: computeOnboardingSetup({}),
    });
  }
  const [assets, token] = await Promise.all([
    getPortalWhatsAppAssets(session.clientId),
    readClientCredential(session.clientId, 'user_access_token'),
  ]);
  const { data: adminRow } = await supabase.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle();
  const email = String(session.email || user.email || '').toLowerCase();
  const canImportConfigured = Boolean(config.existingConfigured && (adminRow || email.endsWith('@techantum.com')));
  const setup = computeOnboardingSetup({
    hasToken: Boolean(token?.value),
    businessId: session.metaBusinessId,
    wabas: assets.wabas,
    phones: assets.phones,
    templateCount: assets.templateCount,
  });
  return NextResponse.json({
    authenticated: true,
    membership: true,
    configured: config.configured,
    existingConfigured: config.existingConfigured,
    canImportConfigured,
    appId: config.appId,
    graphVersion: config.graphVersion,
    configId: config.configId,
    ...session,
    ...assets,
    setup,
    connected: setup.ready,
    metaConnectionStatus: setup.connectionStatus,
  });
}
