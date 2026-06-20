import { NextRequest, NextResponse } from 'next/server';
import { setCSRFToken } from '@/lib/security/csrf';

export async function GET(request: NextRequest) {
  try {
    // Generate and set CSRF token in cookie
    const token = await setCSRFToken();
    
    return NextResponse.json({ token });
  } catch (error) {
    console.error('CSRF token generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate security token' },
      { status: 500 }
    );
  }
}