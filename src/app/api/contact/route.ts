import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getRateLimitIdentifier } from '@/lib/security/rateLimiter';
import { validateCSRFToken } from '@/lib/security/csrf';
import { sanitizeString, sanitizeEmail, sanitizePhone } from '@/lib/security/sanitize';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - 5 submissions per minute per IP
    const identifier = getRateLimitIdentifier(request);
    const rateLimit = checkRateLimit(`contact_form:${identifier}`, {
      maxRequests: 5,
      windowMs: 60000, // 1 minute
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000),
        },
        { status: 429 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { name, country, email, phone, productCategory, quantity, message, csrfToken, honeypot } = body;

    // Honeypot check - if filled, it's a bot
    if (honeypot) {
      console.log('Bot detected via honeypot');
      // Return success to fool the bot
      return NextResponse.json({ success: true });
    }

    // CSRF validation
    if (!csrfToken || !(await validateCSRFToken(csrfToken))) {
      return NextResponse.json(
        { success: false, error: 'Invalid security token. Please refresh the page.' },
        { status: 403 }
      );
    }

    // Input validation
    if (!name || !country || !email || !phone || !productCategory || !quantity) {
      return NextResponse.json(
        { success: false, error: 'All required fields must be filled.' },
        { status: 400 }
      );
    }

    // Sanitize inputs
    const sanitizedData = {
      name: sanitizeString(name),
      country: sanitizeString(country),
      email: sanitizeEmail(email),
      phone: sanitizePhone(phone),
      productCategory: sanitizeString(productCategory),
      quantity: sanitizeString(quantity),
      message: message ? sanitizeString(message) : '',
    };

    // Additional validation after sanitization
    if (sanitizedData.name.length < 2 || sanitizedData.name.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Invalid name length.' },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedData.email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format.' },
        { status: 400 }
      );
    }

    // Save to Supabase using parameterized query (prevents SQL injection)
    const supabase = await createClient();
    const { error: dbError } = await supabase.from('form_submissions').insert({
      name: sanitizedData.name,
      country: sanitizedData.country,
      email: sanitizedData.email,
      phone: sanitizedData.phone,
      product_category: sanitizedData.productCategory,
      quantity: sanitizedData.quantity,
      message: sanitizedData.message,
      status: 'pending',
    });

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { success: false, error: 'Failed to save submission.' },
        { status: 500 }
      );
    }

    // Send email via Edge Function
    const { error: emailError } = await supabase.functions.invoke('send-contact-email', {
      body: sanitizedData,
    });

    if (emailError) {
      console.error('Email error:', emailError);
      // Don't fail the request - form was saved
    }

    return NextResponse.json({
      success: true,
      message: 'Form submitted successfully.',
      remaining: rateLimit.remaining,
    });
  } catch (error: any) {
    console.error('Contact form API error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}