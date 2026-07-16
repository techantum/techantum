import { NextResponse } from 'next/server';
import { validateInviteToken, completePartnerOnboarding } from '@/lib/partner/service';

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token');

  if (!token) {
    return NextResponse.json({ valid: false, error: 'Token required' }, { status: 400 });
  }

  const invite = await validateInviteToken(token);

  if (!invite) {
    return NextResponse.json({
      valid: false,
      error: 'Invalid or expired invite link.',
    });
  }

  const partner = invite.partners as {
    contact_name: string;
    company_name: string;
    partner_code: string;
    email: string;
  };

  return NextResponse.json({
    valid: true,
    contactName: partner.contact_name,
    companyName: partner.company_name,
    partnerCode: partner.partner_code,
    email: partner.email,
  });
}

export async function POST(request: Request) {
  try {
    const { token, password, confirmPassword } = await request.json();

    if (!token || !password) {
      return NextResponse.json({ error: 'Token and password are required' }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const result = await completePartnerOnboarding(token, password);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      email: result.email,
      message: 'Account activated. You can now sign in.',
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Onboarding failed' },
      { status: 500 }
    );
  }
}
