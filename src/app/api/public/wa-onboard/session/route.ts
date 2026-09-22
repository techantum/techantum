import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPublicMetaSignupConfig } from '@/lib/whatsapp-provider/config';
import { getSelfServeSession } from '@/lib/whatsapp-provider/services/self-onboard';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const config = getPublicMetaSignupConfig();
  if (!user) {
    return NextResponse.json({ authenticated: false, configured: config.configured, graphVersion: config.graphVersion });
  }
  const session = await getSelfServeSession(user.id);
  if (!session) {
    return NextResponse.json({ authenticated: true, membership: false, email: user.email, configured: config.configured });
  }
  return NextResponse.json({ authenticated: true, membership: true, configured: config.configured, ...session });
}
