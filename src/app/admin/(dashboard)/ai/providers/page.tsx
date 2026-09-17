'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminButton from '@/components/admin/AdminButton';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminBadge from '@/components/admin/AdminBadge';
import AdminField, { adminInputClass, adminSelectClass } from '@/components/admin/AdminField';
import AdminStatCard from '@/components/admin/AdminStatCard';
import { OpsOverviewField, OpsPageShell } from '@/components/admin/ops/OpsUi';
import Icon from '@/components/ui/AppIcon';
import {
  MODEL_OPTIONS,
  PROVIDER_LABELS,
  groupedModelOptions,
  type AIProviderId,
  type GatewaySettingsPublic,
  type ProviderEventPublic,
} from '@/lib/ai/types';

type ProviderDraft = {
  apiKey: string;
  model: string;
  enabled: boolean;
  clearKey: boolean;
};

const EMPTY_DRAFT: Record<AIProviderId, ProviderDraft> = {
  openai: { apiKey: '', model: 'gpt-4o-mini', enabled: true, clearKey: false },
  gemini: { apiKey: '', model: 'gemini-3.6-flash', enabled: true, clearKey: false },
  claude: { apiKey: '', model: 'claude-3-5-haiku-latest', enabled: false, clearKey: false },
};

function statusBadge(status: string) {
  if (status === 'success') return <AdminBadge variant="green">Success</AdminBadge>;
  if (status === 'fallback_success') return <AdminBadge variant="amber">Fallback success</AdminBadge>;
  return <AdminBadge variant="rose">Failed</AdminBadge>;
}

function ModelSelect({
  provider,
  value,
  onChange,
}: {
  provider: AIProviderId;
  value: string;
  onChange: (model: string) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = MODEL_OPTIONS[provider].find((option) => option.value === value);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const groups = groupedModelOptions(provider)
    .map((group) => ({
      ...group,
      options: query.trim()
        ? group.options.filter((option) => `${option.label} ${option.value}`.toLowerCase().includes(query.trim().toLowerCase()))
        : group.options,
    }))
    .filter((group) => group.options.length);

  return (
    <div ref={rootRef} className="relative z-20 space-y-2">
      <button
        type="button"
        className={`${adminSelectClass} flex items-center justify-between gap-2 text-left`}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <span className="truncate">{selected?.label || value || 'Select a model'}</span>
        <Icon name="ChevronDownIcon" size={16} className={open ? 'rotate-180 transition-transform shrink-0' : 'transition-transform shrink-0'} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 z-30 mt-1 overflow-hidden rounded-xl border border-indigo-100 bg-white shadow-xl shadow-slate-900/10">
          <div className="border-b border-indigo-50 p-2">
            <input
              autoFocus
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className={`${adminInputClass} py-2`}
              placeholder={`Search ${MODEL_OPTIONS[provider].length} models`}
            />
          </div>
          <div className="max-h-80 overflow-y-auto py-1">
            {groups.length === 0 && <p className="px-3 py-2 text-sm text-muted-foreground">No matching models</p>}
            {groups.map((group) => (
              <div key={group.name}>
                <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{group.name}</p>
                {group.options.map((option) => {
                  const active = option.value === value;
                  return (
                    <button
                      type="button"
                      key={option.value}
                      className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-indigo-50 ${
                        active ? 'bg-indigo-50 font-medium text-indigo-800' : 'text-slate-700'
                      }`}
                      onClick={() => {
                        onChange(option.value);
                        setQuery('');
                        setOpen(false);
                      }}
                    >
                      <span>{option.label}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
      <input
        type="text"
        autoComplete="off"
        spellCheck={false}
        className={`${adminInputClass} font-mono text-xs`}
        placeholder="Or paste a custom model ID"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export default function AIProvidersPage() {
  const [settings, setSettings] = useState<GatewaySettingsPublic | null>(null);
  const [events, setEvents] = useState<ProviderEventPublic[]>([]);
  const [drafts, setDrafts] = useState(EMPTY_DRAFT);
  const [primaryProvider, setPrimaryProvider] = useState<AIProviderId>('openai');
  const [fallbackProvider, setFallbackProvider] = useState<AIProviderId>('gemini');
  const [secondFallbackProvider, setSecondFallbackProvider] = useState<AIProviderId | ''>('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<AIProviderId | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    const res = await fetch('/api/admin/ai/providers', { cache: 'no-store' });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Failed to load AI providers');
    const next = body.settings as GatewaySettingsPublic;
    setSettings(next);
    setEvents(body.events || []);
    setPrimaryProvider(next.primaryProvider);
    setFallbackProvider(next.fallbackProvider);
    setSecondFallbackProvider(next.secondFallbackProvider || '');
    setDrafts({
      openai: {
        apiKey: '',
        model: next.providers.find((p) => p.provider === 'openai')?.model || 'gpt-4o-mini',
        enabled: next.providers.find((p) => p.provider === 'openai')?.enabled !== false,
        clearKey: false,
      },
      gemini: {
        apiKey: '',
        model: next.providers.find((p) => p.provider === 'gemini')?.model || 'gemini-3.6-flash',
        enabled: next.providers.find((p) => p.provider === 'gemini')?.enabled !== false,
        clearKey: false,
      },
      claude: {
        apiKey: '',
        model: next.providers.find((p) => p.provider === 'claude')?.model || 'claude-3-5-haiku-latest',
        enabled: next.providers.find((p) => p.provider === 'claude')?.enabled === true,
        clearKey: false,
      },
    });
  };

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'));
  }, []);

  const providerMap = useMemo(() => {
    const map = new Map(settings?.providers.map((item) => [item.provider, item]));
    return map;
  }, [settings]);

  const save = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/admin/ai/providers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryProvider,
          fallbackProvider,
          secondFallbackProvider: secondFallbackProvider || null,
          providers: drafts,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Save failed');
      setSettings(body.settings);
      setEvents(body.events || []);
      setDrafts((prev) => ({
        openai: { ...prev.openai, apiKey: '', clearKey: false },
        gemini: { ...prev.gemini, apiKey: '', clearKey: false },
        claude: { ...prev.claude, apiKey: '', clearKey: false },
      }));
      setMessage('AI provider settings saved. Keys are encrypted at rest and are never shown again.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const testProvider = async (provider: AIProviderId) => {
    setTesting(provider);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/admin/ai/providers/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          apiKey: drafts[provider].apiKey || undefined,
          model: drafts[provider].model,
        }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) throw new Error(body.error || 'Connection test failed');
      setMessage(`${PROVIDER_LABELS[provider]} responded using ${body.model}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection test failed');
    } finally {
      setTesting(null);
    }
  };

  if (!settings) {
    return <p className="text-sm text-muted-foreground p-6">{error || 'Loading…'}</p>;
  }

  const openai = providerMap.get('openai');
  const gemini = providerMap.get('gemini');

  return (
    <OpsPageShell>
      <AdminPageHeader
        title="AI Gateway"
        description="OpenAI is primary. Gemini is the automatic backup when credits run out or the provider is unavailable. Keys are encrypted on the server and never returned to the browser."
      />
      {message && <AdminAlert>{message}</AdminAlert>}
      {error && <AdminAlert variant="error">{error}</AdminAlert>}
      {!settings.encryptionReady && (
        <AdminAlert variant="error">
          Server encryption key is missing. Set <code>AI_SECRETS_ENCRYPTION_KEY</code> and restart before saving API keys.
        </AdminAlert>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <AdminStatCard
          label="Primary"
          value={PROVIDER_LABELS[primaryProvider]}
          hint={openai?.configured ? openai.keyHint || 'Configured' : 'Not configured'}
          accent="blue"
          icon="BoltIcon"
        />
        <AdminStatCard
          label="Fallback"
          value={PROVIDER_LABELS[fallbackProvider]}
          hint={gemini?.configured ? gemini.keyHint || 'Configured' : 'Add Gemini key'}
          accent="green"
          icon="ShieldCheckIcon"
        />
        <AdminStatCard
          label="Encryption"
          value={settings.encryptionReady ? 'On' : 'Off'}
          hint="AES-256-GCM at rest"
          accent={settings.encryptionReady ? 'violet' : 'rose'}
          icon="KeyIcon"
        />
      </div>

      <AdminSection title="Routing" description="Failover runs only for exhausted credits, quota/billing limits, or provider unavailability — not ordinary 429 rate limits.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <AdminField label="Primary provider">
            <select className={adminSelectClass} value={primaryProvider} onChange={(e) => setPrimaryProvider(e.target.value as AIProviderId)}>
              <option value="openai">OpenAI</option>
              <option value="gemini">Google Gemini</option>
              <option value="claude">Anthropic Claude</option>
            </select>
          </AdminField>
          <AdminField label="Fallback provider">
            <select className={adminSelectClass} value={fallbackProvider} onChange={(e) => setFallbackProvider(e.target.value as AIProviderId)}>
              <option value="gemini">Google Gemini</option>
              <option value="openai">OpenAI</option>
              <option value="claude">Anthropic Claude</option>
            </select>
          </AdminField>
          <AdminField label="Second fallback" hint="Leave empty for now. Add Claude later.">
            <select
              className={adminSelectClass}
              value={secondFallbackProvider}
              onChange={(e) => setSecondFallbackProvider((e.target.value || '') as AIProviderId | '')}
            >
              <option value="">None</option>
              <option value="claude">Anthropic Claude</option>
              <option value="gemini">Google Gemini</option>
              <option value="openai">OpenAI</option>
            </select>
          </AdminField>
        </div>
      </AdminSection>

      {(['openai', 'gemini', 'claude'] as AIProviderId[]).map((provider) => {
        const info = providerMap.get(provider);
        const draft = drafts[provider];
        return (
          <AdminSection
            key={provider}
            title={PROVIDER_LABELS[provider]}
            accent={provider === 'openai' ? 'indigo' : provider === 'gemini' ? 'emerald' : 'violet'}
            description={
              provider === 'claude'
                ? 'Ready for later. Saving a key here will enable Claude as an optional second fallback.'
                : 'Paste a new key to replace the stored value. Existing keys are never displayed.'
            }
            action={
              info?.configured ? (
                <AdminBadge variant="green">{info.source === 'admin' ? 'Encrypted in admin' : 'Configured via env'}</AdminBadge>
              ) : (
                <AdminBadge>Not configured</AdminBadge>
              )
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <OpsOverviewField label="Current key">{info?.keyHint || 'None stored'}</OpsOverviewField>
              <OpsOverviewField label="Source">{info?.source === 'admin' ? 'Encrypted database' : info?.source === 'env' ? 'Server environment' : 'Not set'}</OpsOverviewField>
              <AdminField label="API key" hint="Leave blank to keep the current key. The value is encrypted immediately and never sent back.">
                <input
                  type="password"
                  autoComplete="new-password"
                  className={adminInputClass}
                  placeholder={info?.configured ? '•••••••• (hidden)' : 'Paste API key'}
                  value={draft.apiKey}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [provider]: { ...prev[provider], apiKey: e.target.value, clearKey: false } }))}
                />
              </AdminField>
              <AdminField label="Model" hint="Full current catalog. Search, scroll, or paste any model ID.">
                <ModelSelect
                  provider={provider}
                  value={draft.model}
                  onChange={(model) => setDrafts((prev) => ({ ...prev, [provider]: { ...prev[provider], model } }))}
                />
              </AdminField>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.enabled}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [provider]: { ...prev[provider], enabled: e.target.checked } }))}
                />
                Enabled
              </label>
              {info?.configured && info.source === 'admin' && (
                <label className="flex items-center gap-2 text-sm text-rose-700">
                  <input
                    type="checkbox"
                    checked={draft.clearKey}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [provider]: { ...prev[provider], clearKey: e.target.checked, apiKey: e.target.checked ? '' : prev[provider].apiKey },
                      }))
                    }
                  />
                  Remove stored key
                </label>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <AdminButton variant="secondary" disabled={testing === provider} onClick={() => testProvider(provider)}>
                {testing === provider ? 'Testing…' : 'Test connection'}
              </AdminButton>
            </div>
          </AdminSection>
        );
      })}

      <div className="flex justify-end">
        <AdminButton variant="primary" disabled={saving} onClick={save}>
          {saving ? 'Saving…' : 'Save encrypted keys'}
        </AdminButton>
      </div>

      <AdminSection title="Recent provider events" description="Shows which model answered, and why a fallback ran.">
        {!events.length && <p className="text-sm text-muted-foreground">No AI calls logged yet.</p>}
        {events.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-indigo-50">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 bg-indigo-50/60">
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2">Purpose</th>
                  <th className="px-3 py-2">Provider</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Reason</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} className="border-t border-indigo-50">
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(event.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                    <td className="px-3 py-2">{event.purpose || '—'}</td>
                    <td className="px-3 py-2">
                      {event.usedProvider ? PROVIDER_LABELS[event.usedProvider as AIProviderId] || event.usedProvider : '—'}
                      {event.usedModel ? <span className="block text-[11px] text-muted-foreground">{event.usedModel}</span> : null}
                    </td>
                    <td className="px-3 py-2">{statusBadge(event.status)}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{event.reason || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminSection>
    </OpsPageShell>
  );
}
