'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';

interface HeroContactFormProps {
  title?: string;
  serviceOptions?: string[];
}

export default function HeroContactForm({
  title = 'How can we help you?',
  serviceOptions = ['Websites', 'Web Applications', 'Mobile Applications', 'Other'],
}: HeroContactFormProps) {
  const router = useRouter();
  const [csrfToken, setCsrfToken] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetch('/api/csrf')
      .then((r) => r.json())
      .then((data) => setCsrfToken(data.token))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setStatus('idle');
    setErrorMessage('');

    const form = e.currentTarget;
    const fd = new FormData(form);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fd.get('name'),
          phone: fd.get('phone'),
          productCategory: fd.get('service'),
          source: 'homepage_hero',
          csrfToken,
          honeypot,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Submission failed');
      form.reset();
      router.push('/thank-you');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/20 bg-black/40 backdrop-blur-md p-5 sm:p-6 shadow-xl">
      <h3 className="font-bricolage font-semibold text-lg sm:text-xl text-white mb-4">{title}</h3>

      {status === 'error' && (
        <p className="mb-4 text-sm text-white bg-red-600/90 rounded-lg px-3 py-2">{errorMessage}</p>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          name="website"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          className="hidden"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden
        />

        <input
          name="name"
          required
          placeholder="Enter your full name"
          className="w-full px-3 py-2.5 rounded-lg border border-white/20 bg-white/10 text-white placeholder:text-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
        />
        <input
          name="phone"
          type="tel"
          required
          placeholder="Enter your phone number"
          className="w-full px-3 py-2.5 rounded-lg border border-white/20 bg-white/10 text-white placeholder:text-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
        />
        <select
          name="service"
          required
          defaultValue=""
          className="w-full px-3 py-2.5 rounded-lg border border-white/20 bg-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-secondary [&>option]:text-foreground"
        >
          <option value="" disabled>
            Select a service
          </option>
          {serviceOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={submitting || !csrfToken}
          className="w-full bg-secondary text-white px-4 py-3 rounded-lg font-inter font-semibold text-sm hover:bg-secondary/90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <Icon name="ArrowPathIcon" size={18} className="animate-spin" />
              Sending…
            </>
          ) : (
            <>
              Send
              <Icon name="PaperAirplaneIcon" size={18} />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
