'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminButton from '@/components/admin/AdminButton';
import AdminField, { adminInputClass, adminSelectClass } from '@/components/admin/AdminField';
import { MODEL_OPTIONS, PROVIDER_LABELS, type AIProviderId, type GatewaySettingsPublic } from '@/lib/ai/types';

type ProviderDraft = { apiKey: string; model: string; organizationId: string; enabled: boolean; clearKey: boolean };

const EMPTY: Record<AIProviderId, ProviderDraft> = {
  openai: { apiKey: '', model: 'gpt-4o-mini', organizationId: '', enabled: true, clearKey: false },
  gemini: { apiKey: '', model: 'gemini-3.6-flash', organizationId: '', enabled: true, clearKey: false },
  claude: { apiKey: '', model: 'claude-3-5-haiku-latest', organizationId: '', enabled: false, clearKey: false },
};

const META: Record<AIProviderId, { subtitle: string; role: string }> = {
  openai: { subtitle: 'GPT models', role: 'Primary' },
  gemini: { subtitle: 'Gemini Flash', role: 'Fallback' },
  claude: { subtitle: 'Claude', role: 'Optional' },
};

export default function AIProviderPanel() {
  const [settings, setSettings] = useState<GatewaySettingsPublic | null>(null);
  const [drafts, setDrafts] = useState(EMPTY);
  const [primaryProvider, setPrimaryProvider] = useState<AIProviderId>('openai');
  const [fallbackProvider, setFallbackProvider] = useState<AIProviderId>('gemini');
  const [active, setActive] = useState<AIProviderId>('openai');
  const [maxResponseLength, setMaxResponseLength] = useState(800);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    const res = await fetch('/api/admin/ai/providers', { cache: 'no-store' });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Failed to load AI providers');
    const next = body.settings as GatewaySettingsPublic;
    setSettings(next);
    setPrimaryProvider(next.primaryProvider);
    setFallbackProvider(next.fallbackProvider);
    setDrafts({
      openai: { apiKey: '', model: next.providers.find((p) => p.provider === 'openai')?.model || 'gpt-4o-mini', organizationId: next.providers.find((p) => p.provider === 'openai')?.organizationId || '', enabled: next.providers.find((p) => p.provider === 'openai')?.enabled !== false, clearKey: false },
      gemini: { apiKey: '', model: next.providers.find((p) => p.provider === 'gemini')?.model || 'gemini-3.6-flash', organizationId: next.providers.find((p) => p.provider === 'gemini')?.organizationId || '', enabled: next.providers.find((p) => p.provider === 'gemini')?.enabled !== false, clearKey: false },
      claude: { apiKey: '', model: next.providers.find((p) => p.provider === 'claude')?.model || 'claude-3-5-haiku-latest', organizationId: next.providers.find((p) => p.provider === 'claude')?.organizationId || '', enabled: next.providers.find((p) => p.provider === 'claude')?.enabled === true, clearKey: false },
    });
    const settingsRes = await fetch('/api/admin/ai/settings', { cache: 'no-store' });
    if (settingsRes.ok) {
      const settingsBody = await settingsRes.json();
      const length = Number(settingsBody.settings?.max_response_length);
      if (Number.isFinite(length) && length > 0) setMaxResponseLength(length);
    }
  };

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'));
  }, []);

  const providerMap = useMemo(() => new Map(settings?.providers.map((item) => [item.provider, item])), [settings]);
  const info = providerMap.get(active);
  const draft = drafts[active];

  const save = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/admin/ai/providers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primaryProvider, fallbackProvider, providers: drafts }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Save failed');
      const settingsRes = await fetch('/api/admin/ai/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ max_response_length: maxResponseLength }),
      });
      if (!settingsRes.ok) {
        const settingsBody = await settingsRes.json().catch(() => ({}));
        throw new Error(settingsBody.error || 'Saved providers, but response length failed');
      }
      setSettings(body.settings);
      setDrafts((prev) => ({
        openai: { ...prev.openai, apiKey: '', clearKey: false },
        gemini: { ...prev.gemini, apiKey: '', clearKey: false },
        claude: { ...prev.claude, apiKey: '', clearKey: false },
      }));
      setMessage('Provider settings saved. Keys stay encrypted and are never shown again.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const testProvider = async () => {
    setTesting(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/admin/ai/providers/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: active, apiKey: draft.apiKey || undefined, model: draft.model, organizationId: draft.organizationId || undefined }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) throw new Error(body.error || 'Connection test failed');
      setMessage(`${PROVIDER_LABELS[active]} connected using ${body.model}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  if (!settings) return <p className="text-sm text-slate-500">{error || 'Loading providers…'}</p>;

  return (
    <div className="space-y-4">
      {message && <AdminAlert>{message}</AdminAlert>}
      {error && <AdminAlert variant="error">{error}</AdminAlert>}
      {!settings.encryptionReady && (
        <AdminAlert variant="error">
          Server encryption key is missing. Set <code>AI_SECRETS_ENCRYPTION_KEY</code> before saving API keys.
        </AdminAlert>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-slate-900">AI Provider Configuration</h2>
          <p className="mt-1 text-xs text-slate-500">Connect and manage AI providers. Primary is used for all conversations.</p>
          <div className="mt-4 space-y-2">
            {(['openai', 'gemini', 'claude'] as AIProviderId[]).map((provider) => {
              const item = providerMap.get(provider);
              const selected = active === provider;
              const role = provider === primaryProvider ? 'Primary' : provider === fallbackProvider ? 'Fallback' : META[provider].role;
              return (
                <button
                  key={provider}
                  type="button"
                  onClick={() => setActive(provider)}
                  className={`flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left ${
                    selected ? 'border-violet-200 bg-violet-50' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{PROVIDER_LABELS[provider]}</p>
                    <p className="text-xs text-slate-500">{item?.model || META[provider].subtitle}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    item?.configured ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {item?.configured ? role : 'Not configured'}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <AdminField label="Primary">
              <select className={adminSelectClass} value={primaryProvider} onChange={(e) => setPrimaryProvider(e.target.value as AIProviderId)}>
                <option value="openai">OpenAI</option>
                <option value="gemini">Google Gemini</option>
                <option value="claude">Anthropic Claude</option>
              </select>
            </AdminField>
            <AdminField label="Fallback">
              <select className={adminSelectClass} value={fallbackProvider} onChange={(e) => setFallbackProvider(e.target.value as AIProviderId)}>
                <option value="gemini">Google Gemini</option>
                <option value="openai">OpenAI</option>
                <option value="claude">Anthropic Claude</option>
              </select>
            </AdminField>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-900">{PROVIDER_LABELS[active]}</h2>
              <p className="text-xs text-slate-500">{active === primaryProvider ? 'Primary provider' : active === fallbackProvider ? 'Fallback provider' : 'Optional provider'}</p>
            </div>
            <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-600">
              <input
                type="checkbox"
                checked={draft.enabled}
                onChange={(e) => setDrafts((prev) => ({ ...prev, [active]: { ...prev[active], enabled: e.target.checked } }))}
              />
              Enabled
            </label>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <AdminField label="API Key" hint="Your API key is encrypted and never stored in plain text.">
              <input
                type="password"
                autoComplete="new-password"
                className={adminInputClass}
                placeholder={info?.configured ? '••••••••••••' : 'Paste API key'}
                value={draft.apiKey}
                onChange={(e) => setDrafts((prev) => ({ ...prev, [active]: { ...prev[active], apiKey: e.target.value, clearKey: false } }))}
              />
            </AdminField>
            <AdminField label="Organization (optional)" hint="Required only for enterprise accounts.">
              <input
                className={adminInputClass}
                placeholder="Enter organization ID"
                value={draft.organizationId}
                onChange={(e) => setDrafts((prev) => ({ ...prev, [active]: { ...prev[active], organizationId: e.target.value } }))}
              />
            </AdminField>
            <AdminField label="Model">
              <select className={adminSelectClass} value={draft.model} onChange={(e) => setDrafts((prev) => ({ ...prev, [active]: { ...prev[active], model: e.target.value } }))}>
                {MODEL_OPTIONS[active].map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </AdminField>
            <AdminField label="Max Response Length" hint="Limit response length to control costs.">
              <input
                type="number"
                min={100}
                max={4000}
                className={adminInputClass}
                value={maxResponseLength}
                onChange={(e) => setMaxResponseLength(Number(e.target.value))}
              />
            </AdminField>
          </div>

          {info?.configured && info.source === 'admin' && (
            <label className="mt-3 flex items-center gap-2 text-sm text-rose-700">
              <input
                type="checkbox"
                checked={draft.clearKey}
                onChange={(e) =>
                  setDrafts((prev) => ({
                    ...prev,
                    [active]: { ...prev[active], clearKey: e.target.checked, apiKey: e.target.checked ? '' : prev[active].apiKey },
                  }))
                }
              />
              Remove stored key
            </label>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <AdminButton onClick={testProvider} disabled={testing}>
              {testing ? 'Testing…' : 'Test Connection'}
            </AdminButton>
            <AdminButton variant="primary" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save providers'}
            </AdminButton>
            {message && /connected/i.test(message) && <span className="text-sm font-medium text-emerald-700">Connected successfully</span>}
          </div>
        </section>
      </div>
    </div>
  );
}
