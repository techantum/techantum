'use client';

import { useEffect, useMemo, useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import { embeddedSignupStartPath } from '@/lib/whatsapp-provider/embedded-signup';
import { canEnterOnboardingStep, computeOnboardingSetup, nextOnboardingStep, type OnboardingSetup } from '@/lib/whatsapp-provider/onboarding-state';
import { resolveMetaPhoneState } from '@/lib/whatsapp-provider/phone-status';

type PathMode = 'new' | 'existing';
type Waba = { waba_id?: string; name?: string; verification_status?: string; account_status?: string; webhook_subscribed?: boolean };
type Phone = {
  phone_number_id?: string;
  display_phone_number?: string;
  verified_name?: string;
  quality_rating?: string;
  registration_status?: string;
  status?: string;
  raw_json?: Record<string, unknown>;
};

type Session = {
  authenticated?: boolean;
  configured?: boolean;
  appId?: string;
  configId?: string;
  graphVersion?: string;
  companyName?: string;
  email?: string;
  website?: string;
  address?: string;
  businessCategory?: string;
  businessType?: string;
  metaBusinessId?: string;
  wabas?: Waba[];
  phones?: Phone[];
  templateCount?: number;
  setup?: OnboardingSetup;
  existingConfigured?: boolean;
  canImportConfigured?: boolean;
  error?: string;
};

const STEPS = [
  { id: 1, title: 'Business Details', hint: 'Tell us about your business' },
  { id: 2, title: 'Connect Meta', hint: 'Link your Facebook account' },
  { id: 3, title: 'WhatsApp Number', hint: 'Add or import a number' },
  { id: 4, title: 'Business Portfolio', hint: 'Select or create portfolio' },
  { id: 5, title: 'Review & Submit', hint: 'Verify and complete' },
];

const INDUSTRIES = ['IT Services', 'Healthcare', 'Education', 'Retail', 'Hospitality', 'Real Estate', 'Finance', 'Manufacturing', 'Other'];
const COUNTRIES = [
  { value: 'India (+91)', label: 'India (+91)' },
  { value: 'United States (+1)', label: 'United States (+1)' },
  { value: 'United Kingdom (+44)', label: 'United Kingdom (+44)' },
  { value: 'United Arab Emirates (+971)', label: 'United Arab Emirates (+971)' },
  { value: 'Germany (+49)', label: 'Germany (+49)' },
];
const TIMEZONES = ['Asia/Kolkata (GMT+5:30)', 'Asia/Dubai (GMT+4)', 'Europe/London (GMT+0)', 'America/New_York (GMT-5)', 'America/Los_Angeles (GMT-8)'];
const PATH_KEY = 'wa_onboard_path';
const fieldClass =
  'mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-secondary/40 focus:ring-2 focus:ring-secondary/15';

export default function OnboardingWizard({ compact = false }: { compact?: boolean }) {
  const [session, setSession] = useState<Session | null>(null);
  const [path, setPath] = useState<PathMode | ''>('');
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [detailsSaved, setDetailsSaved] = useState(false);
  const [form, setForm] = useState({
    companyName: '',
    website: '',
    industry: '',
    country: 'India (+91)',
    timezone: 'Asia/Kolkata (GMT+5:30)',
    description: '',
  });

  const setup = useMemo(
    () => session?.setup || computeOnboardingSetup({ wabas: session?.wabas, phones: session?.phones, templateCount: session?.templateCount, businessId: session?.metaBusinessId }),
    [session],
  );

  const load = async (opts?: { keepStep?: boolean }) => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('error')) setError(params.get('error') || '');
    if (params.get('meta') === '1') setMessage('Existing WhatsApp Business API data was imported from Meta.');
    const stored = (window.sessionStorage.getItem(PATH_KEY) as PathMode | null) || '';
    if (stored === 'new' || stored === 'existing') setPath(stored);
    const res = await fetch('/api/public/wa-onboard/session', { cache: 'no-store' });
    const body = await res.json();
    setSession(body);
    if (body?.error) setError(body.error);
    const [country, timezone] = String(body.businessType || '').split('::');
    const nextForm = {
      companyName: body.companyName || '',
      website: body.website || '',
      industry: body.businessCategory || '',
      country: country || 'India (+91)',
      timezone: timezone || 'Asia/Kolkata (GMT+5:30)',
      description: body.address || '',
    };
    setForm(nextForm);
    const saved = Boolean(nextForm.companyName && nextForm.industry && nextForm.description);
    setDetailsSaved(saved);
    const nextSetup = body.setup || computeOnboardingSetup({ wabas: body.wabas, phones: body.phones, templateCount: body.templateCount, businessId: body.metaBusinessId });
    if (!opts?.keepStep) setStep(nextOnboardingStep(nextSetup, saved));
  };

  useEffect(() => {
    void load().catch(() => setError('Could not load your WhatsApp setup.'));
  }, []);

  const goTo = (next: number) => {
    if (!canEnterOnboardingStep(next, setup, detailsSaved)) return;
    setStep(next);
  };

  const saveDetails = async () => {
    if (!form.companyName.trim() || !form.industry || !form.country || !form.timezone || !form.description.trim()) {
      setError('Please complete the required business details.');
      return false;
    }
    setBusy('save');
    setError('');
    try {
      const res = await fetch('/api/public/wa-onboard/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: form.companyName,
          website: form.website,
          businessCategory: form.industry,
          country: form.country,
          timezone: form.timezone,
          description: form.description,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Could not save details');
      setDetailsSaved(true);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save details');
      return false;
    } finally {
      setBusy('');
    }
  };

  const startMeta = (mode: PathMode, flow: 'hosted' | 'zero' = 'hosted') => {
    if (!session?.authenticated) {
      window.location.assign('/login?next=/portal/wa/onboard');
      return;
    }
    setPath(mode);
    window.sessionStorage.setItem(PATH_KEY, mode);
    window.location.assign(embeddedSignupStartPath(mode, flow));
  };

  const importConfigured = async () => {
    if (!session?.authenticated) {
      window.location.assign('/login?next=/portal/wa/onboard');
      return;
    }
    setBusy('meta');
    setError('');
    setMessage('');
    setPath('existing');
    window.sessionStorage.setItem(PATH_KEY, 'existing');
    try {
      const res = await fetch('/api/public/wa-onboard/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'existing', source: 'provider' }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Could not import the configured WhatsApp account.');
      setMessage('Existing WhatsApp Business API imported from the Techantum server configuration.');
      await load({ keepStep: true });
      setStep(body.ready || body.phoneCount ? 5 : 3);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not import the configured WhatsApp account.');
    } finally {
      setBusy('');
    }
  };

  const importExisting = async () => {
    if (!session?.authenticated) {
      window.location.assign('/login?next=/portal/wa/onboard');
      return;
    }
    setBusy('meta');
    setError('');
    setMessage('');
    setPath('existing');
    window.sessionStorage.setItem(PATH_KEY, 'existing');
    try {
      const existing = await fetch('/api/public/wa-onboard/sync', { method: 'POST' });
      const existingBody = await existing.json().catch(() => ({}));
      if (existing.ok && (existingBody.hasWaba || existingBody.wabaId || (existingBody.wabas || []).length)) {
        setMessage('Existing WhatsApp Business API imported from Meta.');
        await load({ keepStep: true });
        setStep(existingBody.hasPhone || existingBody.ready ? 5 : 3);
        return;
      }
      if (session.canImportConfigured) {
        const res = await fetch('/api/public/wa-onboard/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'existing', source: 'provider' }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || 'Could not import the configured WhatsApp account.');
        setMessage('Existing WhatsApp Business API imported from the Techantum server configuration.');
        await load({ keepStep: true });
        setStep(body.ready || body.phoneCount ? 5 : 3);
        return;
      }
      window.location.assign(embeddedSignupStartPath('existing', 'hosted'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not import the existing WhatsApp Business API.');
      setBusy('');
    }
  };

  const createNew = () => startMeta('new', 'hosted');
  const startZeroIntegration = () => startMeta('new', 'zero');

  const refreshMeta = async () => {
    setBusy('sync');
    setError('');
    try {
      const res = await fetch('/api/public/wa-onboard/sync', { method: 'POST' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Could not refresh Meta data.');
      setMessage('Latest WhatsApp Business API data loaded from Meta.');
      await load({ keepStep: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not refresh Meta data.');
    } finally {
      setBusy('');
    }
  };

  const continueNext = async () => {
    if (step === 1) {
      const ok = await saveDetails();
      if (!ok) return;
      setStep(2);
      return;
    }
    if (step === 2 && !setup.hasWaba) {
      setError('Import or create the WhatsApp Business API in Meta before continuing.');
      return;
    }
    if (step === 3 && !setup.hasPhone) {
      setError('Meta has not returned a WhatsApp number yet. Import the existing account, or create one only if you are new.');
      return;
    }
    if (step === 4 && !setup.hasWaba) {
      setError('No WhatsApp Business Account has been returned by Meta.');
      return;
    }
    goTo(Math.min(5, step + 1));
  };

  if (!session) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading your WhatsApp setup…</div>;
  }

  if (compact && setup.ready) {
    return (
      <section className="rounded-3xl border border-emerald-100 bg-emerald-50/70 px-5 py-4 text-sm text-slate-700">
        WhatsApp Business API is connected · {setup.phoneCount} numbers · {setup.templateCount} templates
      </section>
    );
  }

  const phones = session.phones || [];
  const wabas = session.wabas || [];

  return (
    <div className="space-y-8">
      <section className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">WhatsApp Business API</p>
          <h1 className="mt-2 font-bricolage text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Get Your Business on <span className="text-secondary">WhatsApp</span>
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-500 sm:text-base">
            Set up your WhatsApp Business API in a few easy steps. Connect your Meta account, import or add a number, and start messaging your customers.
          </p>
        </div>
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center lg:flex-col lg:items-end">
          <div className="flex items-center gap-3">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-sm">
              <WhatsAppMark />
            </span>
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-[#0668E1] shadow-sm ring-1 ring-slate-100">
              <MetaMark />
            </span>
          </div>
          <ul className="space-y-1.5 text-sm text-slate-600">
            <CheckLine done={setup.hasWaba} label="Business Connected" />
            <CheckLine done={setup.hasPhone} label="Number Added" />
            <CheckLine done={setup.templateCount > 0} label="Templates Synced" />
            <CheckLine done={setup.ready} label="Ready to Message" />
          </ul>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.04)]">
        <div className="grid lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="border-b border-slate-100 p-4 lg:border-b-0 lg:border-r">
            <ol className="space-y-1">
              {STEPS.map((item) => {
                const active = step === item.id;
                const reachable = canEnterOnboardingStep(item.id, setup, detailsSaved);
                const done = item.id < step && reachable;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      disabled={!reachable}
                      onClick={() => goTo(item.id)}
                      className={`flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left disabled:cursor-not-allowed ${
                        active ? 'bg-orange-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${active || done ? 'bg-secondary text-white' : 'bg-slate-100 text-slate-500'}`}>
                        {done && !active ? '✓' : item.id}
                      </span>
                      <span>
                        <span className={`block text-sm font-semibold ${active ? 'text-secondary' : 'text-slate-800'}`}>{item.title}</span>
                        <span className="mt-0.5 block text-[11px] text-slate-400">{item.hint}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </aside>

          <div className="p-5 sm:p-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Step {step} of 5</p>
            {error && <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
            {message && <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>}

            {step === 1 && (
              <div className="mt-4">
                <h2 className="font-bricolage text-2xl font-bold text-slate-900">Business Details</h2>
                <p className="mt-1 text-sm text-slate-500">Let’s start with some basic information about your business.</p>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <Field label="Business Name *">
                    <input className={fieldClass} placeholder="Enter your business name" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
                  </Field>
                  <Field label="Website (Optional)">
                    <input className={fieldClass} placeholder="https://yourwebsite.com" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
                  </Field>
                  <Field label="Industry *">
                    <select className={fieldClass} value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })}>
                      <option value="">Select your industry</option>
                      {INDUSTRIES.map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Country *">
                    <select className={fieldClass} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}>
                      {COUNTRIES.map((item) => (
                        <option key={item.value}>{item.label}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Business Timezone *">
                    <select className={fieldClass} value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })}>
                      {TIMEZONES.map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </Field>
                  <div className="md:col-span-2">
                    <Field label="Business Description *">
                      <textarea
                        className={`${fieldClass} min-h-[110px]`}
                        maxLength={300}
                        placeholder="Briefly describe your business and how you plan to use WhatsApp (e.g. customer support, notifications, sales etc.)"
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                      />
                      <p className="mt-1 text-right text-[11px] text-slate-400">{form.description.length}/300</p>
                    </Field>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="mt-4 space-y-4">
                <h2 className="font-bricolage text-2xl font-bold text-slate-900">Connect Meta</h2>
                <p className="text-sm text-slate-500">
                  Techantum is a Meta Tech Provider. Clients can finish WhatsApp setup on Meta, then return here so we can import the Business account.
                </p>
                <div className="grid gap-3">
                  <button type="button" onClick={() => void createNew()} className="rounded-2xl border border-secondary bg-orange-50 p-5 text-left">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary">Recommended</p>
                    <p className="mt-1 font-semibold text-slate-900">Meta-hosted Embedded Signup</p>
                    <p className="mt-2 text-sm text-slate-500">
                      Opens Meta’s official WhatsApp onboarding, then returns to Techantum at /auth/facebook so we can import the WABA and phone numbers.
                    </p>
                  </button>
                  <button type="button" onClick={() => void startZeroIntegration()} className="rounded-2xl border border-slate-200 bg-white p-5 text-left hover:border-secondary/40">
                    <p className="font-semibold text-slate-900">Zero integration onboarding</p>
                    <p className="mt-2 text-sm text-slate-500">
                      Complete WhatsApp Business app setup entirely on Meta. After you finish, come back and use Import existing from Meta.
                    </p>
                  </button>
                  <button type="button" onClick={() => void importExisting()} className="rounded-2xl border border-slate-200 bg-white p-5 text-left hover:border-secondary/40">
                    <p className="font-semibold text-slate-900">I already have WhatsApp Business API</p>
                    <p className="mt-2 text-sm text-slate-500">Import the existing WABA and phone numbers from Meta. This does not ask you to create a new number.</p>
                  </button>
                </div>
                <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Use the Facebook login that owns the client Business portfolio. If you are testing with Techantum’s own Facebook login, import the account already configured on this server instead of creating a new number.
                </p>
                {session.canImportConfigured && (
                  <button type="button" disabled={Boolean(busy)} onClick={() => void importConfigured()} className="rounded-full border border-secondary px-5 py-3 text-sm font-semibold text-secondary disabled:opacity-60">
                    {busy === 'meta' ? 'Importing…' : 'Import Techantum’s configured WhatsApp number'}
                  </button>
                )}
                <button type="button" disabled={Boolean(busy)} onClick={() => void (path === 'new' ? createNew() : importExisting())} className="rounded-full bg-secondary px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
                  {busy === 'meta' ? 'Opening Meta…' : path === 'new' ? 'Continue with Meta-hosted signup' : 'Import existing from Meta'}
                </button>
                {setup.hasWaba && <p className="text-sm font-medium text-emerald-700">Meta returned a WhatsApp Business Account. Continue to your numbers.</p>}
              </div>
            )}

            {step === 3 && (
              <div className="mt-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-bricolage text-2xl font-bold text-slate-900">WhatsApp Number</h2>
                    <p className="text-sm text-slate-500">Numbers shown here are loaded from Meta. Existing Cloud API numbers appear after import.</p>
                  </div>
                  <button type="button" onClick={() => void refreshMeta()} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold">
                    {busy === 'sync' ? 'Refreshing…' : 'Refresh from Meta'}
                  </button>
                </div>
                {phones.length === 0 && (
                  <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                    No Cloud API number was returned for this Facebook login. Use Import existing from Meta with the account that owns the WABA. Do not create a new number if you already have one.
                  </p>
                )}
                {phones.map((phone) => (
                  <div key={phone.phone_number_id || phone.display_phone_number} className="rounded-2xl border border-slate-200 px-4 py-4">
                    <p className="font-semibold text-slate-900">{phone.display_phone_number}</p>
                    <p className="mt-1 text-sm text-slate-500">{[phone.verified_name, phone.quality_rating, resolveMetaPhoneState(phone).label].filter(Boolean).join(' · ')}</p>
                  </div>
                ))}
              </div>
            )}

            {step === 4 && (
              <div className="mt-4 space-y-4">
                <h2 className="font-bricolage text-2xl font-bold text-slate-900">Business Portfolio</h2>
                <p className="text-sm text-slate-500">Your WhatsApp Business Account from Meta.</p>
                {wabas.map((waba) => (
                  <div key={waba.waba_id || waba.name} className="rounded-2xl border border-slate-200 px-4 py-4">
                    <p className="font-semibold text-slate-900">{waba.name || 'WhatsApp Business Account'}</p>
                    <p className="mt-1 text-sm text-slate-500">{[waba.waba_id, waba.verification_status, waba.account_status].filter(Boolean).join(' · ')}</p>
                  </div>
                ))}
              </div>
            )}

            {step === 5 && (
              <div className="mt-4 space-y-4">
                <h2 className="font-bricolage text-2xl font-bold text-slate-900">Review & Submit</h2>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 p-4 text-sm">
                    <p className="font-semibold text-slate-900">{form.companyName || session.companyName}</p>
                    <p className="text-slate-500">{[form.industry, form.country].filter(Boolean).join(' · ')}</p>
                    <p className="text-slate-500">{form.website}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4 text-sm">
                    <p className="font-semibold text-slate-900">{setup.ready ? 'Ready to message' : 'Waiting on Meta'}</p>
                    <p className="text-slate-500">{setup.phoneCount} numbers · {setup.wabaCount} accounts · {setup.templateCount} templates</p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => (step === 1 ? (window.location.href = '/portal/wa') : setStep((prev) => Math.max(1, prev - 1)))}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600"
              >
                <Icon name="ArrowDownTrayIcon" size={16} />
                {step === 1 ? 'Save and Exit' : 'Back'}
              </button>
              {step < 5 ? (
                <button
                  type="button"
                  disabled={busy === 'save' || (step === 2 && !setup.hasWaba) || (step === 3 && !setup.hasPhone) || (step === 4 && !setup.hasWaba)}
                  onClick={() => void continueNext()}
                  className="inline-flex items-center gap-2 rounded-full bg-secondary px-5 py-2.5 text-sm font-semibold text-white hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy === 'save' ? 'Saving…' : step === 1 ? 'Next: Connect Meta' : 'Next'}
                  <Icon name="ArrowRightIcon" size={16} />
                </button>
              ) : (
                <button type="button" disabled={!setup.ready} onClick={() => { window.location.href = '/portal/wa'; }} className="rounded-full bg-secondary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">
                  Go to dashboard
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white px-5 py-6 sm:px-8">
        <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center">
          <div>
            <p className="font-bricolage text-lg font-bold text-slate-900">Why WhatsApp Business API?</p>
            <p className="mt-1 text-sm text-slate-500">Connect directly with your customers, automate conversations, and grow your business with the world’s most popular messaging platform.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { icon: 'ChatBubbleLeftRightIcon', title: 'Higher Engagement', text: 'Reach customers where they are' },
              { icon: 'ShieldCheckIcon', title: 'Official & Secure', text: 'Verified business identity by Meta' },
              { icon: 'BoltIcon', title: 'Automation Ready', text: 'Use templates, chatbots & more' },
              { icon: 'ChartBarIcon', title: 'Scalable for Growth', text: 'Ideal for businesses of all sizes' },
            ].map((item) => (
              <div key={item.title}>
                <Icon name={item.icon} size={20} className="text-secondary" />
                <p className="mt-2 text-sm font-semibold text-slate-900">{item.title}</p>
                <p className="text-sm text-slate-500">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-full border border-emerald-100 bg-emerald-50 px-5 py-3 text-sm text-slate-600">
        <p className="inline-flex items-center gap-2">
          <Icon name="CheckCircleIcon" size={18} className="text-emerald-600" />
          Your data is safe and secure. We use official Meta APIs and follow all security guidelines.
        </p>
        <a href="https://developers.facebook.com/docs/whatsapp/cloud-api" className="font-semibold text-secondary hover:underline">
          Learn more about WhatsApp API
        </a>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      {children}
    </label>
  );
}

function CheckLine({ done, label }: { done: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <Icon name="CheckCircleIcon" size={16} className={done ? 'text-emerald-500' : 'text-slate-300'} />
      {label}
    </li>
  );
}

function WhatsAppMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M19.05 4.91A9.82 9.82 0 0 0 12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.27-1.38a9.86 9.86 0 0 0 4.77 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.91-7.01z" />
    </svg>
  );
}

function MetaMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 36 24" aria-hidden="true">
      <path fill="currentColor" d="M13.5 3.2c2.3 0 4.2 1.8 6.3 5.3 1.3-2.2 2.3-3.6 3.2-4.4C24.2 3.3 25.3 3 26.6 3 31 3 34.5 6.8 34.5 12.2S31 21.4 26.6 21.4c-1.4 0-2.6-.5-3.8-1.6-1-.9-2-2.4-3.3-4.8-1.4 2.5-2.4 4-3.3 4.9-1.1 1-2.3 1.5-3.7 1.5C7.2 21.4 4 17.6 4 12.2 4 6.9 7.3 3.2 12 3.2h1.5zm-.8 4.4c-1.8 0-3.2 2-3.2 4.6 0 2.6 1.3 4.5 3.1 4.5.7 0 1.4-.4 2.3-1.4.8-.9 1.7-2.4 2.8-4.6-1-2-1.9-3.1-2.7-3.7-.8-.6-1.5-.9-2.3-.9zm10.7.1c-.8 0-1.5.3-2.3.9-.8.6-1.7 1.8-2.7 3.7 1.1 2.2 2 3.7 2.8 4.6.9 1 1.6 1.4 2.3 1.4 1.8 0 3.2-1.9 3.2-4.5 0-2.6-1.4-4.6-3.3-4.6z" />
    </svg>
  );
}
