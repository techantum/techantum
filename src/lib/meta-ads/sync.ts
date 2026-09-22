import { createAdminClient } from '@/lib/supabase/admin';
import { adsPaginate, adsRequest } from './client';
import { getMetaAdsConfig } from './config';
import { actPath, mapInsightRow, parseActId } from './normalize';

const INSIGHT_FIELDS = 'impressions,reach,clicks,spend,cpc,cpm,ctr,unique_clicks';
const ACCOUNT_FIELDS = 'id,account_id,name,account_status,currency,timezone_name,amount_spent,balance,disable_reason,business{id,name}';
const CAMPAIGN_FIELDS = 'id,name,status,effective_status,objective,daily_budget,lifetime_budget,start_time,stop_time,created_time,updated_time';
const ADSET_FIELDS = 'id,name,status,effective_status,campaign_id,optimization_goal,daily_budget,created_time';
const AD_FIELDS = 'id,name,status,effective_status,adset_id,campaign_id,created_time';

type SyncStep = { step: string; ok: boolean; count: number; detail?: string };

type GraphAccount = {
  id?: string;
  account_id?: string;
  name?: string;
  account_status?: number;
  currency?: string;
  timezone_name?: string;
  amount_spent?: string;
  balance?: string;
  disable_reason?: string;
  business?: { id?: string; name?: string };
};

type GraphCampaign = {
  id: string;
  name?: string;
  status?: string;
  effective_status?: string;
  objective?: string;
  daily_budget?: string;
  lifetime_budget?: string;
  start_time?: string;
  stop_time?: string;
  created_time?: string;
  updated_time?: string;
};

type GraphAdSet = {
  id: string;
  name?: string;
  status?: string;
  effective_status?: string;
  campaign_id?: string;
  optimization_goal?: string;
  daily_budget?: string;
  created_time?: string;
};

type GraphAd = {
  id: string;
  name?: string;
  status?: string;
  effective_status?: string;
  adset_id?: string;
  campaign_id?: string;
  created_time?: string;
};

export type AdsSyncSummary = {
  runId: string;
  status: 'COMPLETE' | 'FAILED';
  requestCount: number;
  successCount: number;
  errorCount: number;
  accountsSynced: number;
  campaignsSynced: number;
  adsetsSynced: number;
  adsSynced: number;
  insightRows: number;
  steps: SyncStep[];
  errorMessage?: string;
};

export async function runMetaAdsSync(triggeredBy?: string | null): Promise<AdsSyncSummary> {
  const cfg = getMetaAdsConfig();
  const supabase = createAdminClient();

  if (!cfg.configured) {
    throw new Error('Set META_ADS_ACCESS_TOKEN (same Meta App, ads_read) before syncing.');
  }

  const { data: active } = await supabase
    .from('meta_ads_sync_runs')
    .select('id, started_at')
    .eq('status', 'IN_PROGRESS')
    .gt('started_at', new Date(Date.now() - 12 * 60 * 1000).toISOString())
    .limit(1)
    .maybeSingle();

  if (active?.id) {
    throw new Error('A Meta Ads sync is already running. Wait for it to finish, then try again.');
  }

  const { data: run, error: runError } = await supabase
    .from('meta_ads_sync_runs')
    .insert({
      status: 'IN_PROGRESS',
      token_source: cfg.tokenSource,
      triggered_by: triggeredBy || null,
    })
    .select('id')
    .single();

  if (runError || !run?.id) {
    throw new Error(runError?.message || 'Could not start a sync run.');
  }

  const runId = run.id as string;
  const steps: SyncStep[] = [];
  let accountsSynced = 0;
  let campaignsSynced = 0;
  let adsetsSynced = 0;
  let adsSynced = 0;
  let insightRows = 0;
  const now = new Date().toISOString();

  const recount = async () => {
    const { data } = await supabase.from('meta_ads_api_logs').select('success').eq('sync_run_id', runId);
    const rows = data || [];
    return {
      requestCount: rows.length,
      successCount: rows.filter((row) => row.success).length,
      errorCount: rows.filter((row) => !row.success).length,
    };
  };

  try {
    const listed = await adsRequest<{ data?: GraphAccount[] }>({
      path: '/me/adaccounts',
      operation: 'list_ad_accounts',
      syncRunId: runId,
      query: { fields: ACCOUNT_FIELDS, limit: 50 },
    });

    if (!listed.ok) {
      throw new Error(listed.errorMessage || 'GET /me/adaccounts failed. Check ads_read and that the token belongs to this Meta App.');
    }

    let accounts = listed.data?.data || [];
    if (!accounts.length && cfg.adAccountId) {
      const one = await adsRequest<GraphAccount>({
        path: actPath(cfg.adAccountId),
        operation: 'get_ad_account',
        adAccountId: cfg.adAccountId,
        syncRunId: runId,
        query: { fields: ACCOUNT_FIELDS },
      });
      if (one.ok && one.data) accounts = [one.data];
    }

    steps.push({ step: 'ad_accounts', ok: true, count: accounts.length });

    for (const listedAccount of accounts.slice(0, 10)) {
      const accountId = parseActId(listedAccount.account_id || listedAccount.id);
      if (!accountId) continue;

      const detail = await adsRequest<GraphAccount>({
        path: actPath(accountId),
        operation: 'get_ad_account',
        adAccountId: accountId,
        syncRunId: runId,
        query: { fields: ACCOUNT_FIELDS },
      });
      const account = detail.ok && detail.data ? detail.data : listedAccount;
      const syncedAccountId = parseActId(account.account_id || account.id) || accountId;

      const { error: accountError } = await supabase.from('meta_ads_accounts').upsert({
        id: syncedAccountId,
        name: account.name || null,
        account_status: account.account_status ?? null,
        currency: account.currency || null,
        timezone_name: account.timezone_name || null,
        amount_spent: account.amount_spent || null,
        balance: account.balance || null,
        disable_reason: account.disable_reason || null,
        business_id: account.business?.id || null,
        business_name: account.business?.name || null,
        raw_json: account,
        last_synced_at: now,
      });
      if (accountError) throw new Error(accountError.message);
      accountsSynced += 1;

      const campaignsPage = await adsPaginate<GraphCampaign>(
        {
          path: `${actPath(syncedAccountId)}/campaigns`,
          operation: 'list_campaigns',
          adAccountId: syncedAccountId,
          syncRunId: runId,
          query: { fields: CAMPAIGN_FIELDS },
        },
        { maxItems: 200, maxPages: 4, pageSize: 50 }
      );
      const campaigns = campaignsPage.data || [];
      if (campaigns.length) {
        const { error } = await supabase.from('meta_ads_campaigns').upsert(
          campaigns.map((row) => ({
            id: row.id,
            account_id: syncedAccountId,
            name: row.name || null,
            status: row.status || null,
            effective_status: row.effective_status || null,
            objective: row.objective || null,
            daily_budget: row.daily_budget || null,
            lifetime_budget: row.lifetime_budget || null,
            start_time: row.start_time || null,
            stop_time: row.stop_time || null,
            created_time: row.created_time || null,
            updated_time: row.updated_time || null,
            raw_json: row,
            last_synced_at: now,
          }))
        );
        if (error) throw new Error(error.message);
      }
      campaignsSynced += campaigns.length;
      steps.push({
        step: 'campaigns',
        ok: campaignsPage.ok,
        count: campaigns.length,
        detail: campaignsPage.ok ? syncedAccountId : campaignsPage.errorMessage,
      });

      const adsetsPage = await adsPaginate<GraphAdSet>(
        {
          path: `${actPath(syncedAccountId)}/adsets`,
          operation: 'list_adsets',
          adAccountId: syncedAccountId,
          syncRunId: runId,
          query: { fields: ADSET_FIELDS },
        },
        { maxItems: 250, maxPages: 4, pageSize: 50 }
      );
      const adsets = adsetsPage.data || [];
      if (adsets.length) {
        const { error } = await supabase.from('meta_ads_adsets').upsert(
          adsets.map((row) => ({
            id: row.id,
            account_id: syncedAccountId,
            campaign_id: row.campaign_id || null,
            name: row.name || null,
            status: row.status || null,
            effective_status: row.effective_status || null,
            optimization_goal: row.optimization_goal || null,
            daily_budget: row.daily_budget || null,
            created_time: row.created_time || null,
            raw_json: row,
            last_synced_at: now,
          }))
        );
        if (error) throw new Error(error.message);
      }
      adsetsSynced += adsets.length;
      steps.push({
        step: 'adsets',
        ok: adsetsPage.ok,
        count: adsets.length,
        detail: adsetsPage.ok ? syncedAccountId : adsetsPage.errorMessage,
      });

      const adsPage = await adsPaginate<GraphAd>(
        {
          path: `${actPath(syncedAccountId)}/ads`,
          operation: 'list_ads',
          adAccountId: syncedAccountId,
          syncRunId: runId,
          query: { fields: AD_FIELDS },
        },
        { maxItems: 250, maxPages: 4, pageSize: 50 }
      );
      const ads = adsPage.data || [];
      if (ads.length) {
        const { error } = await supabase.from('meta_ads_ads').upsert(
          ads.map((row) => ({
            id: row.id,
            account_id: syncedAccountId,
            campaign_id: row.campaign_id || null,
            adset_id: row.adset_id || null,
            name: row.name || null,
            status: row.status || null,
            effective_status: row.effective_status || null,
            created_time: row.created_time || null,
            raw_json: row,
            last_synced_at: now,
          }))
        );
        if (error) throw new Error(error.message);
      }
      adsSynced += ads.length;
      steps.push({
        step: 'ads',
        ok: adsPage.ok,
        count: ads.length,
        detail: adsPage.ok ? syncedAccountId : adsPage.errorMessage,
      });

      insightRows += await syncAccountInsights(syncedAccountId, runId, supabase);
      insightRows += await syncCampaignInsights(syncedAccountId, campaigns, runId, cfg.campaignInsightsLimit, supabase);
    }

    const counts = await recount();
    const summary: AdsSyncSummary = {
      runId,
      status: 'COMPLETE',
      ...counts,
      accountsSynced,
      campaignsSynced,
      adsetsSynced,
      adsSynced,
      insightRows,
      steps,
    };

    await supabase
      .from('meta_ads_sync_runs')
      .update({
        status: 'COMPLETE',
        finished_at: new Date().toISOString(),
        request_count: counts.requestCount,
        success_count: counts.successCount,
        error_count: counts.errorCount,
        accounts_synced: accountsSynced,
        campaigns_synced: campaignsSynced,
        adsets_synced: adsetsSynced,
        ads_synced: adsSynced,
        insight_rows: insightRows,
        steps,
      })
      .eq('id', runId);

    return summary;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Meta Ads sync failed.';
    const counts = await recount();
    await supabase
      .from('meta_ads_sync_runs')
      .update({
        status: 'FAILED',
        finished_at: new Date().toISOString(),
        request_count: counts.requestCount,
        success_count: counts.successCount,
        error_count: counts.errorCount,
        accounts_synced: accountsSynced,
        campaigns_synced: campaignsSynced,
        adsets_synced: adsetsSynced,
        ads_synced: adsSynced,
        insight_rows: insightRows,
        steps,
        error_message: errorMessage,
      })
      .eq('id', runId);

    return {
      runId,
      status: 'FAILED',
      ...counts,
      accountsSynced,
      campaignsSynced,
      adsetsSynced,
      adsSynced,
      insightRows,
      steps,
      errorMessage,
    };
  }
}

async function persistInsights(
  supabase: ReturnType<typeof createAdminClient>,
  rows: Record<string, unknown>[]
) {
  if (!rows.length) return;
  const { error } = await supabase.from('meta_ads_insights').upsert(rows, {
    onConflict: 'object_type,object_id,date_start,date_stop',
  });
  if (error) throw new Error(error.message);
}

async function syncAccountInsights(
  accountId: string,
  runId: string,
  supabase: ReturnType<typeof createAdminClient>
) {
  let stored = 0;
  const rollup = await adsRequest<{ data?: Record<string, unknown>[] }>({
    path: `${actPath(accountId)}/insights`,
    operation: 'account_insights',
    adAccountId: accountId,
    syncRunId: runId,
    query: { fields: INSIGHT_FIELDS, date_preset: 'last_30d' },
  });
  stored += await storeInsightPayload(supabase, accountId, 'account', accountId, rollup.data?.data);

  const daily = await adsRequest<{ data?: Record<string, unknown>[] }>({
    path: `${actPath(accountId)}/insights`,
    operation: 'account_insights_daily',
    adAccountId: accountId,
    syncRunId: runId,
    query: { fields: INSIGHT_FIELDS, date_preset: 'last_7d', time_increment: 1 },
  });
  stored += await storeInsightPayload(supabase, accountId, 'account', accountId, daily.data?.data);
  return stored;
}

async function syncCampaignInsights(
  accountId: string,
  campaigns: GraphCampaign[],
  runId: string,
  limit: number,
  supabase: ReturnType<typeof createAdminClient>
) {
  const targets = [...campaigns]
    .sort((a, b) => statusRank(a.effective_status || a.status) - statusRank(b.effective_status || b.status))
    .slice(0, limit);

  let stored = 0;
  for (const campaign of targets) {
    const result = await adsRequest<{ data?: Record<string, unknown>[] }>({
      path: `/${campaign.id}/insights`,
      operation: 'campaign_insights',
      adAccountId: accountId,
      syncRunId: runId,
      query: { fields: INSIGHT_FIELDS, date_preset: 'last_30d' },
    });
    stored += await storeInsightPayload(supabase, accountId, 'campaign', campaign.id, result.data?.data);
  }
  return stored;
}

async function storeInsightPayload(
  supabase: ReturnType<typeof createAdminClient>,
  accountId: string,
  objectType: 'account' | 'campaign' | 'adset' | 'ad',
  objectId: string,
  rows?: Record<string, unknown>[]
) {
  const mapped = (rows || [])
    .map((row) => {
      const metrics = mapInsightRow(row);
      if (!metrics.dateStart || !metrics.dateStop) return null;
      return {
        account_id: accountId,
        object_type: objectType,
        object_id: objectId,
        date_start: metrics.dateStart,
        date_stop: metrics.dateStop,
        impressions: metrics.impressions,
        reach: metrics.reach,
        clicks: metrics.clicks,
        unique_clicks: metrics.uniqueClicks,
        spend: metrics.spend,
        cpc: metrics.cpc,
        cpm: metrics.cpm,
        ctr: metrics.ctr,
        raw_json: row,
        synced_at: new Date().toISOString(),
      };
    })
    .filter(Boolean) as Record<string, unknown>[];

  await persistInsights(supabase, mapped);
  return mapped.length;
}

function statusRank(status?: string) {
  const key = (status || '').toUpperCase();
  if (key === 'ACTIVE') return 0;
  if (key === 'PAUSED') return 1;
  if (key.includes('ACTIVE')) return 2;
  return 9;
}
