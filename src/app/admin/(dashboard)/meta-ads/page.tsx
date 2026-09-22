'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminStatCard from '@/components/admin/AdminStatCard';
import AdminButton from '@/components/admin/AdminButton';
import AdminAlert from '@/components/admin/AdminAlert';
import { ProviderShell, ProviderTable, StatusPill, Td, when } from '@/components/admin/wa-provider/ProviderUi';

type Dashboard = {
  status: {
    configured: boolean;
    tokenSource: string;
    graphVersion: string;
    appId: string | null;
    hasAdAccountOverride: boolean;
    campaignInsightsLimit: number;
    warnings: string[];
  };
  counts: { accounts: number; campaigns: number; adsets: number; ads: number };
  totals: { impressions: number; reach: number; clicks: number; spend: number };
  currency: string;
  accounts: {
    id: string;
    name: string | null;
    accountStatusLabel: string;
    currency: string | null;
    amount_spent: string | null;
    last_synced_at: string | null;
    business_name: string | null;
  }[];
  lastRun: {
    id: string;
    status: string;
    started_at: string;
    finished_at: string | null;
    request_count: number;
    success_count: number;
    error_count: number;
    accounts_synced: number;
    campaigns_synced: number;
    adsets_synced: number;
    ads_synced: number;
    insight_rows: number;
    error_message: string | null;
    token_source: string | null;
  } | null;
  activity: {
    callsLast15d: number;
    successLast15d: number;
    failedLast15d: number;
    last500: { total: number; success: number; failed: number; rate: number };
  };
  daily: { date: string; impressions: number; clicks: number; spend: number }[];
  topCampaigns: { id: string; name: string | null; status: string | null; objective: string | null; spend: number; impressions: number; clicks: number }[];
  error?: string;
};

function money(value: number, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value || 0);
}

function num(value: number) {
  return (value || 0).toLocaleString('en-IN');
}

export default function MetaAdsDashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/meta-ads/dashboard', { cache: 'no-store' });
      const body = (await res.json()) as Dashboard & { error?: string };
      if (!res.ok) throw new Error(body.error || 'Failed to load Meta Ads dashboard');
      setData(body);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Meta Ads dashboard');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sync = async () => {
    setSyncing(true);
    setNotice('');
    setError('');
    try {
      const res = await fetch('/api/admin/meta-ads/sync', { method: 'POST' });
      const body = await res.json();
      if (!res.ok && !body.runId) throw new Error(body.error || 'Sync failed');
      if (body.status === 'FAILED') {
        setError(body.errorMessage || body.error || 'Sync finished with errors.');
      } else {
        setNotice(
          `Synced ${body.accountsSynced || 0} ad accounts, ${body.campaignsSynced || 0} campaigns, ${body.adsetsSynced || 0} ad sets, ${body.adsSynced || 0} ads. Marketing API calls this run: ${body.requestCount || 0} (${body.successCount || 0} succeeded).`
        );
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const activity = data?.activity;
  const last500 = activity?.last500;
  const metaProgress = Math.min(activity?.callsLast15d || 0, 500);

  return (
    <ProviderShell>
      <AdminPageHeader
        title="Meta Ads"
        description="Sync ad accounts, campaigns, ad sets, ads and insights from the Marketing API. Meta counts these calls on the same app — WhatsApp Graph traffic does not qualify."
        action={
          <AdminButton variant="primary" onClick={sync} disabled={syncing || !data?.status.configured}>
            {syncing ? 'Syncing…' : 'Sync from Meta'}
          </AdminButton>
        }
      />

      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}
      {notice ? <AdminAlert variant="success">{notice}</AdminAlert> : null}
      {(data?.status.warnings || []).map((warning) => (
        <AdminAlert key={warning} variant="info">
          {warning}
        </AdminAlert>
      ))}
      {!data?.status.configured ? (
        <AdminAlert variant="info">
          Set META_ADS_ACCESS_TOKEN for this Meta App with ads_read, then use an ad account the app admin or test user can access. Do not reuse a WhatsApp-only token.
        </AdminAlert>
      ) : null}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <AdminStatCard label="Ad accounts" value={data?.counts.accounts ?? 0} icon="BuildingOffice2Icon" />
        <AdminStatCard label="Campaigns" value={data?.counts.campaigns ?? 0} accent="violet" icon="MegaphoneIcon" />
        <AdminStatCard label="Ad sets / ads" value={`${data?.counts.adsets ?? 0} / ${data?.counts.ads ?? 0}`} accent="blue" icon="Squares2X2Icon" />
        <AdminStatCard
          label="Spend (last 30d)"
          value={money(data?.totals.spend || 0, data?.currency)}
          hint={`${num(data?.totals.impressions || 0)} impressions`}
          accent="green"
          icon="BanknotesIcon"
        />
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <AdminStatCard
          label="Local calls (15 days)"
          value={`${metaProgress} / 500`}
          hint="Meta App Dashboard is the source of truth. This is Techantum’s own Marketing API log."
          accent="amber"
          icon="SignalIcon"
        />
        <AdminStatCard
          label="Last 500 success"
          value={`${(last500?.rate || 0).toFixed(1)}%`}
          hint={`${last500?.failed || 0} failed of ${last500?.total || 0}`}
          accent={(last500?.rate || 0) >= 85 ? 'green' : 'rose'}
          icon="ShieldCheckIcon"
        />
        <AdminStatCard label="Reach" value={num(data?.totals.reach || 0)} accent="blue" icon="UserGroupIcon" />
        <AdminStatCard label="Clicks" value={num(data?.totals.clicks || 0)} icon="CursorArrowRaysIcon" />
      </div>

      <AdminSection
        title="How Meta counts these calls"
        description={`Token source: ${data?.status.tokenSource || 'none'} · Graph ${data?.status.graphVersion || '—'} · App ID ${data?.status.appId || 'not set'}`}
        accent="sky"
      >
        <ol className="list-decimal pl-5 text-sm text-slate-600 space-y-1">
          <li>Use a token generated for this same Meta App, with ads_read, on an authorized ad account.</li>
          <li>Press Sync from Meta. Techantum walks Ad Accounts → Campaigns → Ad Sets → Ads → Account Insights → Campaign Insights, then stores the result.</li>
          <li>Repeat genuine syncs during development. Do not loop a single endpoint. Meta’s App Dashboard should move from 0 of 500 toward 500 of 500 on its own.</li>
          <li>WhatsApp Business API calls never count toward Marketing API Access Tier.</li>
        </ol>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link href="/admin/meta-ads/campaigns" className="text-sm font-semibold text-indigo-700 hover:underline">
            Campaigns
          </Link>
          <Link href="/admin/meta-ads/logs" className="text-sm font-semibold text-indigo-700 hover:underline">
            API logs
          </Link>
        </div>
      </AdminSection>

      <AdminSection title="Daily performance" description="From GET /act_{id}/insights with last_7d and time_increment=1." accent="emerald">
        {data?.daily.length ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="spend" name="Spend" stroke="#7c3aed" fill="#c4b5fd" />
                <Area type="monotone" dataKey="clicks" name="Clicks" stroke="#0284c7" fill="#bae6fd" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-slate-500">No daily insights stored yet. Run a successful sync.</p>
        )}
      </AdminSection>

      <AdminSection title="Last sync" accent="violet">
        {data?.lastRun ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-xs uppercase text-slate-500">Status</p>
              <StatusPill value={data.lastRun.status} />
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Started</p>
              <p>{when(data.lastRun.started_at)}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Marketing API calls</p>
              <p>
                {data.lastRun.request_count} ({data.lastRun.success_count} ok / {data.lastRun.error_count} failed)
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Objects</p>
              <p>
                {data.lastRun.accounts_synced} accounts · {data.lastRun.campaigns_synced} campaigns · {data.lastRun.adsets_synced} ad
                sets · {data.lastRun.ads_synced} ads
              </p>
            </div>
            {data.lastRun.error_message ? <p className="md:col-span-4 text-rose-700">{data.lastRun.error_message}</p> : null}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No sync has run yet.</p>
        )}
      </AdminSection>

      <AdminSection title="Ad accounts">
        <ProviderTable
          columns={['Account', 'Status', 'Currency', 'Amount spent', 'Last synced']}
          empty="No ad accounts stored. Sync after configuring META_ADS_ACCESS_TOKEN."
          rows={(data?.accounts || []).map((row) => (
            <tr key={row.id}>
              <Td>
                <div className="font-medium">{row.name || row.id}</div>
                <div className="text-xs text-slate-500">
                  {row.id}
                  {row.business_name ? ` · ${row.business_name}` : ''}
                </div>
              </Td>
              <Td>
                <StatusPill value={row.accountStatusLabel} />
              </Td>
              <Td>{row.currency || '—'}</Td>
              <Td>{row.amount_spent || '—'}</Td>
              <Td>{when(row.last_synced_at)}</Td>
            </tr>
          ))}
        />
      </AdminSection>

      <AdminSection title="Top campaigns by spend" action={<Link href="/admin/meta-ads/campaigns" className="text-sm font-semibold text-indigo-700">View all</Link>}>
        <ProviderTable
          columns={['Campaign', 'Status', 'Objective', 'Spend', 'Impressions', 'Clicks']}
          empty="Campaign insights appear after a successful sync."
          rows={(data?.topCampaigns || []).map((row) => (
            <tr key={row.id}>
              <Td>
                <div className="font-medium">{row.name || row.id}</div>
                <div className="text-xs text-slate-500">{row.id}</div>
              </Td>
              <Td>
                <StatusPill value={row.status} />
              </Td>
              <Td>{row.objective || '—'}</Td>
              <Td>{money(row.spend, data?.currency)}</Td>
              <Td>{num(row.impressions)}</Td>
              <Td>{num(row.clicks)}</Td>
            </tr>
          ))}
        />
      </AdminSection>
    </ProviderShell>
  );
}
