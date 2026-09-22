import { createAdminClient } from '@/lib/supabase/admin';
import { publicMetaAdsStatus } from './config';
import { accountStatusLabel, rollingSuccessRate, toFiniteNumber } from './normalize';

export async function getMetaAdsDashboard() {
  const supabase = createAdminClient();
  const status = publicMetaAdsStatus();
  const since15d = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();

  const [
    accountsRes,
    campaignsRes,
    adsetsRes,
    adsRes,
    lastRunRes,
    logs15dRes,
    last500Res,
    accountInsightsRes,
    campaignInsightsRes,
    dailyInsightsRes,
  ] = await Promise.all([
    supabase.from('meta_ads_accounts').select('id,name,account_status,currency,amount_spent,last_synced_at,business_name').order('name'),
    supabase.from('meta_ads_campaigns').select('id', { count: 'exact', head: true }),
    supabase.from('meta_ads_adsets').select('id', { count: 'exact', head: true }),
    supabase.from('meta_ads_ads').select('id', { count: 'exact', head: true }),
    supabase.from('meta_ads_sync_runs').select('*').order('started_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('meta_ads_api_logs').select('id,success,http_status,created_at').gte('created_at', since15d),
    supabase.from('meta_ads_api_logs').select('success').order('created_at', { ascending: false }).limit(500),
    supabase
      .from('meta_ads_insights')
      .select('account_id,impressions,reach,clicks,spend,cpc,cpm,ctr,date_start,date_stop')
      .eq('object_type', 'account')
      .order('date_stop', { ascending: false }),
    supabase
      .from('meta_ads_insights')
      .select('object_id,impressions,reach,clicks,spend,ctr,date_start,date_stop')
      .eq('object_type', 'campaign'),
    supabase
      .from('meta_ads_insights')
      .select('date_start,date_stop,impressions,reach,clicks,spend')
      .eq('object_type', 'account')
      .order('date_start', { ascending: true }),
  ]);

  const accounts = accountsRes.data || [];
  const logs15d = logs15dRes.data || [];
  const last500 = rollingSuccessRate(last500Res.data || []);

  const rollupInsights = (accountInsightsRes.data || []).filter((row) => row.date_start !== row.date_stop);
  const latestByAccount = new Map<string, (typeof rollupInsights)[number]>();
  for (const row of rollupInsights) {
    if (!latestByAccount.has(row.account_id)) latestByAccount.set(row.account_id, row);
  }
  const latestAccountInsights = [...latestByAccount.values()];

  const totals = latestAccountInsights.reduce(
    (acc, row) => {
      acc.impressions += toFiniteNumber(row.impressions);
      acc.reach += toFiniteNumber(row.reach);
      acc.clicks += toFiniteNumber(row.clicks);
      acc.spend += toFiniteNumber(row.spend);
      return acc;
    },
    { impressions: 0, reach: 0, clicks: 0, spend: 0 }
  );

  const dailyMap = new Map<string, { date: string; impressions: number; clicks: number; spend: number }>();
  for (const row of dailyInsightsRes.data || []) {
    if (String(row.date_start) !== String(row.date_stop)) continue;
    const date = String(row.date_start);
    const current = dailyMap.get(date) || { date, impressions: 0, clicks: 0, spend: 0 };
    current.impressions += toFiniteNumber(row.impressions);
    current.clicks += toFiniteNumber(row.clicks);
    current.spend += toFiniteNumber(row.spend);
    dailyMap.set(date, current);
  }

  const campaignSpend = new Map<string, { spend: number; impressions: number; clicks: number }>();
  for (const row of campaignInsightsRes.data || []) {
    const current = campaignSpend.get(row.object_id) || { spend: 0, impressions: 0, clicks: 0 };
    current.spend += toFiniteNumber(row.spend);
    current.impressions += toFiniteNumber(row.impressions);
    current.clicks += toFiniteNumber(row.clicks);
    campaignSpend.set(row.object_id, current);
  }

  const topCampaignIds = [...campaignSpend.entries()]
    .sort((a, b) => b[1].spend - a[1].spend)
    .slice(0, 8)
    .map(([id]) => id);

  const { data: topCampaignRows } = topCampaignIds.length
    ? await supabase.from('meta_ads_campaigns').select('id,name,status,objective,account_id').in('id', topCampaignIds)
    : { data: [] as { id: string; name: string | null; status: string | null; objective: string | null; account_id: string }[] };

  const topCampaigns = (topCampaignRows || [])
    .map((row) => ({
      ...row,
      spend: campaignSpend.get(row.id)?.spend || 0,
      impressions: campaignSpend.get(row.id)?.impressions || 0,
      clicks: campaignSpend.get(row.id)?.clicks || 0,
    }))
    .sort((a, b) => b.spend - a.spend);

  const currency = accounts.find((row) => row.currency)?.currency || 'INR';

  return {
    status,
    counts: {
      accounts: accounts.length,
      campaigns: campaignsRes.count || 0,
      adsets: adsetsRes.count || 0,
      ads: adsRes.count || 0,
    },
    totals,
    currency,
    accounts: accounts.map((row) => ({
      ...row,
      accountStatusLabel: accountStatusLabel(row.account_status),
    })),
    lastRun: lastRunRes.data || null,
    activity: {
      callsLast15d: logs15d.length,
      successLast15d: logs15d.filter((row) => row.success).length,
      failedLast15d: logs15d.filter((row) => !row.success).length,
      last500,
    },
    daily: [...dailyMap.values()],
    topCampaigns,
  };
}

export async function listMetaAdsCampaigns(q = '', page = 1, pageSize = 50) {
  const supabase = createAdminClient();
  const from = (page - 1) * pageSize;
  const safeQ = q.replace(/[%(),]/g, '').slice(0, 80);
  let query = supabase
    .from('meta_ads_campaigns')
    .select('id,account_id,name,status,effective_status,objective,created_time,updated_time,last_synced_at', { count: 'exact' })
    .order('updated_time', { ascending: false, nullsFirst: false })
    .range(from, from + pageSize - 1);
  if (safeQ) query = query.or(`name.ilike.%${safeQ}%,id.ilike.%${safeQ}%,status.ilike.%${safeQ}%`);
  const { data, count, error } = await query;
  if (error) throw new Error(error.message);

  const ids = (data || []).map((row) => row.id);
  const { data: insights } = ids.length
    ? await supabase.from('meta_ads_insights').select('object_id,spend,impressions,clicks,ctr').eq('object_type', 'campaign').in('object_id', ids)
    : { data: [] as { object_id: string; spend: number; impressions: number; clicks: number; ctr: number }[] };

  const byCampaign = new Map<string, { spend: number; impressions: number; clicks: number; ctr: number }>();
  for (const row of insights || []) {
    const current = byCampaign.get(row.object_id) || { spend: 0, impressions: 0, clicks: 0, ctr: 0 };
    current.spend += toFiniteNumber(row.spend);
    current.impressions += toFiniteNumber(row.impressions);
    current.clicks += toFiniteNumber(row.clicks);
    current.ctr = toFiniteNumber(row.ctr) || current.ctr;
    byCampaign.set(row.object_id, current);
  }

  return {
    rows: (data || []).map((row) => ({ ...row, ...(byCampaign.get(row.id) || { spend: 0, impressions: 0, clicks: 0, ctr: 0 }) })),
    total: count || 0,
    page,
    pageSize,
  };
}

export async function listMetaAdsLogs(q = '', page = 1, pageSize = 50) {
  const supabase = createAdminClient();
  const from = (page - 1) * pageSize;
  const safeQ = q.replace(/[%(),]/g, '').slice(0, 80);
  let query = supabase
    .from('meta_ads_api_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + pageSize - 1);
  if (safeQ) query = query.or(`endpoint.ilike.%${safeQ}%,operation.ilike.%${safeQ}%,ad_account_id.ilike.%${safeQ}%,meta_error_code.ilike.%${safeQ}%`);
  const { data, count, error } = await query;
  if (error) throw new Error(error.message);
  return { rows: data || [], total: count || 0, page, pageSize };
}
