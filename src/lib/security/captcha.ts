const VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

interface RecaptchaVerifyResponse {
  success: boolean;
  score?: number;
  action?: string;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
}

export function getRecaptchaSiteKey(): string | null {
  const key = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim();
  return key || null;
}

export function isRecaptchaConfigured(): boolean {
  return Boolean(getRecaptchaSiteKey() && process.env.RECAPTCHA_SECRET_KEY?.trim());
}

export function getRecaptchaMinScore(): number {
  const parsed = Number(process.env.RECAPTCHA_MIN_SCORE ?? 0.5);
  return Number.isFinite(parsed) ? parsed : 0.5;
}

export async function verifyRecaptchaToken(
  token: string | undefined | null,
  expectedAction: string,
  remoteIp?: string | null
): Promise<{ ok: true; score?: number; skipped?: boolean } | { ok: false; error: string }> {
  if (!isRecaptchaConfigured()) {
    if (process.env.NODE_ENV !== 'production') {
      return { ok: true, skipped: true };
    }
    return { ok: false, error: 'Spam protection is not configured. Please contact the site administrator.' };
  }

  if (!token?.trim()) {
    return { ok: false, error: 'Please complete the spam protection check and try again.' };
  }

  const secret = process.env.RECAPTCHA_SECRET_KEY!.trim();
  const params = new URLSearchParams({
    secret,
    response: token,
  });
  if (remoteIp) params.set('remoteip', remoteIp);

  try {
    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });

    const data = (await res.json()) as RecaptchaVerifyResponse;

    if (!data.success) {
      return { ok: false, error: 'Captcha verification failed. Please refresh and try again.' };
    }

    if (data.action && data.action !== expectedAction) {
      return { ok: false, error: 'Invalid captcha action.' };
    }

    const minScore = getRecaptchaMinScore();
    if (typeof data.score === 'number' && data.score < minScore) {
      return { ok: false, error: 'Your submission was flagged as suspicious. Please try again later.' };
    }

    return { ok: true, score: data.score };
  } catch {
    return { ok: false, error: 'Unable to verify captcha. Please try again.' };
  }
}
