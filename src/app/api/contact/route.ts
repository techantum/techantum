import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getRateLimitIdentifier } from '@/lib/security/rateLimiter';
import { validateCSRFToken } from '@/lib/security/csrf';
import { verifyRecaptchaToken } from '@/lib/security/captcha';
import { sanitizeString, sanitizeEmail, sanitizePhone } from '@/lib/security/sanitize';
import { createClient } from '@/lib/supabase/server';
import { sendContactConfirmation, sendContactNotification } from '@/lib/email/resend';

export async function POST(request: NextRequest) {
  try {
    const identifier = getRateLimitIdentifier(request);
    const rateLimit = checkRateLimit(`contact_form:${identifier}`, {
      maxRequests: 5,
      windowMs: 60000,
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

    const body = await request.json();
    const {
      name,
      country,
      email,
      phone,
      productCategory,
      quantity,
      message,
      source,
      csrfToken,
      honeypot,
      captchaToken,
    } = body;

    if (honeypot) {
      return NextResponse.json({ success: true });
    }

    if (!csrfToken || !(await validateCSRFToken(csrfToken))) {
      return NextResponse.json(
        { success: false, error: 'Invalid security token. Please refresh the page.' },
        { status: 403 }
      );
    }

    const captcha = await verifyRecaptchaToken(captchaToken, 'contact', identifier);
    if (!captcha.ok) {
      return NextResponse.json({ success: false, error: captcha.error }, { status: 403 });
    }

    const formSource = source === 'homepage_hero' ? 'homepage_hero' : 'contact_page';
    const isHeroForm = formSource === 'homepage_hero';

    if (isHeroForm) {
      if (!name || !phone || !productCategory) {
        return NextResponse.json(
          { success: false, error: 'Name, phone, and service are required.' },
          { status: 400 }
        );
      }
    } else if (!name || !country || !email || !phone || !productCategory || !quantity) {
      return NextResponse.json(
        { success: false, error: 'All required fields must be filled.' },
        { status: 400 }
      );
    }

    const sanitizedData = {
      name: sanitizeString(name),
      country: country ? sanitizeString(country) : '—',
      email: email ? sanitizeEmail(email) : '',
      phone: sanitizePhone(phone),
      productCategory: sanitizeString(productCategory),
      quantity: quantity ? sanitizeString(quantity) : '—',
      message: message ? sanitizeString(message) : '',
      source: formSource,
    };

    if (sanitizedData.name.length < 2 || sanitizedData.name.length > 100) {
      return NextResponse.json({ success: false, error: 'Invalid name length.' }, { status: 400 });
    }

    if (!isHeroForm && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedData.email)) {
      return NextResponse.json({ success: false, error: 'Invalid email format.' }, { status: 400 });
    }

    const supabase = await createClient();
    const { error: dbError } = await supabase.from('form_submissions').insert({
      name: sanitizedData.name,
      country: sanitizedData.country,
      email: sanitizedData.email || '—',
      phone: sanitizedData.phone,
      product_category: sanitizedData.productCategory,
      quantity: sanitizedData.quantity,
      message: sanitizedData.message,
      source: sanitizedData.source,
      status: 'pending',
    });

    if (dbError) {
      console.error('Database error:', dbError);
      if (dbError.message.includes('source')) {
        const { error: retryError } = await supabase.from('form_submissions').insert({
          name: sanitizedData.name,
          country: sanitizedData.country,
          email: sanitizedData.email || '—',
          phone: sanitizedData.phone,
          product_category: sanitizedData.productCategory,
          quantity: sanitizedData.quantity,
          message: sanitizedData.message,
          status: 'pending',
        });
        if (retryError) {
          return NextResponse.json({ success: false, error: 'Failed to save submission.' }, { status: 500 });
        }
      } else {
        return NextResponse.json({ success: false, error: 'Failed to save submission.' }, { status: 500 });
      }
    }

    const emailData = {
      name: sanitizedData.name,
      country: sanitizedData.country,
      email: sanitizedData.email,
      phone: sanitizedData.phone,
      productCategory: sanitizedData.productCategory,
      quantity: sanitizedData.quantity,
      message: sanitizedData.message,
      source: sanitizedData.source,
    };

    const [notifyResult, confirmResult] = await Promise.all([
      sendContactNotification(emailData),
      sendContactConfirmation(emailData),
    ]);

    if (!notifyResult.ok) {
      console.error('Notification email error:', notifyResult.error);
    }
    if (!confirmResult.ok) {
      console.error('Confirmation email error:', confirmResult.error);
    }

    return NextResponse.json({
      success: true,
      message: 'Form submitted successfully.',
      remaining: rateLimit.remaining,
    });
  } catch (error: unknown) {
    console.error('Contact form API error:', error);
    return NextResponse.json({ success: false, error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
