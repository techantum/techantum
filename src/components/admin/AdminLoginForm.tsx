'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AdminLoginForm({ needsSetup }: { needsSetup?: boolean }) {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [setupMode, setSetupMode] = useState(needsSetup ?? false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (setupMode) {
        const res = await fetch('/api/admin/setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Setup failed');
      }

      const localRes = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (localRes.ok) {
        router.push('/admin');
        router.refresh();
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        const localPayload = (await localRes.json().catch(() => null)) as { error?: string } | null;
        throw new Error(localPayload?.error || signInError.message);
      }

      router.push('/admin');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-border shadow-sm p-8">
        <h1 className="font-bricolage text-2xl font-bold text-foreground mb-1">
          {setupMode ? 'Create admin account' : 'Admin sign in'}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          {setupMode
            ? 'Set up the first administrator for TechAntum CMS.'
            : 'Sign in to manage branding, content, and SEO.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-60"
          >
            {loading ? 'Please wait…' : setupMode ? 'Create & sign in' : 'Sign in'}
          </button>
        </form>

        {!needsSetup && (
          <button
            type="button"
            onClick={() => setSetupMode((v) => !v)}
            className="mt-4 text-xs text-muted-foreground hover:text-primary"
          >
            {setupMode ? 'Already have an account? Sign in' : 'First time? Create admin account'}
          </button>
        )}
      </div>
    </div>
  );
}
