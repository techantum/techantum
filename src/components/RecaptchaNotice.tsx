/** Required disclosure when using Google reCAPTCHA v3 */
export default function RecaptchaNotice({ className = '' }: { className?: string }) {
  if (!process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim()) return null;

  return (
    <p className={`text-xs text-muted-foreground ${className}`}>
      This site is protected by reCAPTCHA and the Google{' '}
      <a
        href="https://policies.google.com/privacy"
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:text-foreground"
      >
        Privacy Policy
      </a>{' '}
      and{' '}
      <a
        href="https://policies.google.com/terms"
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:text-foreground"
      >
        Terms of Service
      </a>{' '}
      apply.
    </p>
  );
}
