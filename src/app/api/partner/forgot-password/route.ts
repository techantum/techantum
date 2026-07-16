import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendPartnerPasswordResetEmail } from '@/lib/email/partner-emails';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const supabase = createAdminClient();

    const { data: partner } = await supabase
      .from('partners')
      .select('id, contact_name, email, status')
      .eq('email', normalizedEmail)
      .maybeSingle();

    // Always return success to prevent email enumeration
    if (!partner || partner.status !== 'active') {
      return NextResponse.json({
        success: true,
        message: 'If an account exists, a reset link has been sent.',
      });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3005';
    const redirectTo = `${siteUrl.replace(/\/$/, '')}/partner/reset-password`;

    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: normalizedEmail,
      options: { redirectTo },
    });

    if (error || !data.properties?.action_link) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists, a reset link has been sent.',
      });
    }

    await sendPartnerPasswordResetEmail(
      normalizedEmail,
      partner.contact_name,
      data.properties.action_link
    );

    await supabase.from('partner_email_logs').insert({
      partner_id: partner.id,
      email_type: 'password_reset',
      recipient: normalizedEmail,
      subject: 'Reset your TechAntum Partner Portal password',
      status: 'sent',
    });

    return NextResponse.json({
      success: true,
      message: 'If an account exists, a reset link has been sent.',
    });
  } catch {
    return NextResponse.json({
      success: true,
      message: 'If an account exists, a reset link has been sent.',
    });
  }
}
