import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPublicMetaSignupConfig } from '@/lib/whatsapp-provider/config';
import { ensurePortalWorkspace, getPortalWhatsAppAssets, getSelfServeSession } from '@/lib/whatsapp-provider/services/self-onboard';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const config = getPublicMetaSignupConfig();
  if (!user) {
    return NextResponse.json({ authenticated: false, membership: false, configured: config.configured, existingConfigured: config.existingConfigured, graphVersion: config.graphVersion, appId: config.appId });
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
    });
  }
  const session = await getSelfServeSession(user.id);
  if (!session) {
    return NextResponse.json({ authenticated: true, membership: false, email: user.email, configured: config.configured, existingConfigured: config.existingConfigured, appId: config.appId, graphVersion: config.graphVersion });
  }
  const assets = await getPortalWhatsAppAssets(session.clientId);
  return NextResponse.json({
    authenticated: true,
    membership: true,
    configured: config.configured,
    appId: config.appId,
    graphVersion: config.graphVersion,
    configId: config.configId,
    ...session,
    ...assets,
  });
}
