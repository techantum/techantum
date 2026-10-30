import { createAdminClient } from '@/lib/supabase/admin';
import { getAllStaticPublicRoutes } from '@/lib/seo/public-routes';
import { flattenAdminPages, CMS_SITE_PAGES } from '@/lib/cms/site-pages';
import { revalidatePublicPaths } from '@/lib/seo/revalidation';
import { adsTextValid, validateCampaignDraft } from './ads-limits';
import { runTechnicalAudit } from './audit';
import { toCsv, parseCsv } from './csv';
import { adsIntegrationStatus, gscStatus, latestGscSnapshot } from './gsc';
import { CALLOUT_SEEDS, DESCRIPTION_SEEDS, HEADLINE_SEEDS, KEYWORD_SEEDS, NEGATIVE_KEYWORD_SEEDS, SITELINK_SEEDS } from './seeds';
import { seoHealthScore } from './scoring';

function db(): any {
  return createAdminClient();
}

function normKeyword(value: string) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export async function ensureMarketingDefaults() {
  const supabase = db();
  const { count } = await supabase.from('marketing_seo_keywords').select('id', { count: 'exact', head: true });
  if (!count) {
    const rows = [
      ...KEYWORD_SEEDS.map((item) => ({
        ...item,
        keyword_norm: normKeyword(item.keyword),
        is_negative: false,
        source: 'seed',
        target_url: 'https://techantum.com/',
        target_location: 'Hyderabad',
      })),
      ...NEGATIVE_KEYWORD_SEEDS.map((keyword) => ({
        keyword,
        keyword_norm: normKeyword(keyword),
        usage_type: 'ads',
        is_negative: true,
        service_category: 'general',
        search_intent: 'exclude',
        priority: 'medium',
        source: 'seed',
        status: 'active',
        target_location: '',
        target_url: '',
      })),
    ];
    await supabase.from('marketing_seo_keywords').insert(rows);
  }

  const { count: assetCount } = await supabase.from('marketing_ads_assets').select('id', { count: 'exact', head: true });
  if (!assetCount) {
    await supabase.from('marketing_ads_assets').insert([
      ...HEADLINE_SEEDS.map((text) => ({ asset_type: 'headline', text, service_category: 'general', status: 'approved', notes: 'Starter copy. Not a performance claim.' })),
      ...DESCRIPTION_SEEDS.map((text) => ({ asset_type: 'description', text, service_category: 'general', status: 'approved', notes: 'Starter copy. Not a performance claim.' })),
      ...CALLOUT_SEEDS.map((text) => ({ asset_type: 'callout', text, service_category: 'general', status: 'approved', notes: 'Starter copy. Not a performance claim.' })),
      ...SITELINK_SEEDS.map((item) => ({ asset_type: 'sitelink', text: item.text, url: item.url, description: item.description, service_category: 'general', status: 'approved' })),
    ]);
  }

  const { count: draftCount } = await supabase.from('marketing_campaign_drafts').select('id', { count: 'exact', head: true });
  if (!draftCount) {
    const { data: keywords } = await supabase.from('marketing_seo_keywords').select('id').eq('is_negative', false).limit(8);
    const { data: negatives } = await supabase.from('marketing_seo_keywords').select('id').eq('is_negative', true);
    const { data: headlines } = await supabase.from('marketing_ads_assets').select('id').eq('asset_type', 'headline').limit(8);
    const { data: descriptions } = await supabase.from('marketing_ads_assets').select('id').eq('asset_type', 'description').limit(4);
    const { data: callouts } = await supabase.from('marketing_ads_assets').select('id').eq('asset_type', 'callout').limit(6);
    const { data: sitelinks } = await supabase.from('marketing_ads_assets').select('id').eq('asset_type', 'sitelink');
    await supabase.from('marketing_campaign_drafts').insert({
      name: 'Leads-Search-1',
      objective: 'leads',
      service_category: 'website-development',
      target_location: 'Hyderabad, India',
      landing_page: 'https://techantum.com/services/website-development',
      notes: 'Internal planning draft. Not synced to a live Google Ads account. Covers website, ERP/CRM, mobile, and custom software themes.',
      budget_estimate: '',
      status: 'draft',
      keyword_ids: (keywords || []).map((row: { id: string }) => row.id),
      negative_keyword_ids: (negatives || []).map((row: { id: string }) => row.id),
      headline_ids: (headlines || []).map((row: { id: string }) => row.id),
      description_ids: (descriptions || []).map((row: { id: string }) => row.id),
      callout_ids: (callouts || []).map((row: { id: string }) => row.id),
      sitelink_ids: (sitelinks || []).map((row: { id: string }) => row.id),
    });
  }
}

export async function marketingOverview() {
  await ensureMarketingDefaults();
  const supabase = db();
  const [keywords, assets, drafts, latestRun, issues, pages, gsc, snapshot, ads, categories] = await Promise.all([
    supabase.from('marketing_seo_keywords').select('id, usage_type, is_negative, status'),
    supabase.from('marketing_ads_assets').select('id, asset_type, status'),
    supabase.from('marketing_campaign_drafts').select('id, status'),
    supabase.from('marketing_audit_runs').select('*').order('started_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('marketing_audit_issues').select('id, status, priority, fix_status, run_id'),
    supabase.from('page_seo').select('path'),
    gscStatus(),
    latestGscSnapshot(),
    Promise.resolve(adsIntegrationStatus()),
    supabase.from('marketing_service_categories').select('*').order('sort_order'),
  ]);

  const runId = latestRun.data?.id;
  const runIssues = (issues.data || []).filter((row: any) => row.run_id === runId);
  const pending = runIssues.filter((row: any) => row.status !== 'passed' && row.status !== 'not_tested' && row.fix_status !== 'verified');

  return {
    healthScore: latestRun.data?.health_score ?? null,
    lastAuditAt: latestRun.data?.finished_at || latestRun.data?.started_at || null,
    indexedPages: snapshot?.indexed_pages ?? (gsc.connected ? '—' : 'Not Connected'),
    issuesPending: pending.length,
    organicClicks: gsc.connected && snapshot?.clicks != null ? Math.round(Number(snapshot.clicks)) : 'Not Connected',
    seoKeywords: (keywords.data || []).filter((row: any) => !row.is_negative && row.usage_type !== 'ads').length,
    adsKeywords: (keywords.data || []).filter((row: any) => !row.is_negative && row.usage_type !== 'seo').length,
    adAssets: (assets.data || []).filter((row: any) => row.status !== 'archived').length,
    campaignDrafts: (drafts.data || []).filter((row: any) => row.status !== 'archived').length,
    gsc,
    ads,
    snapshot,
    categories: categories.data || [],
    pendingIssues: pending.slice(0, 8),
    pagesTracked: (pages.data || []).length || getAllStaticPublicRoutes().length,
  };
}

export async function listKeywords() {
  await ensureMarketingDefaults();
  const { data, error } = await db().from('marketing_seo_keywords').select('*').order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function saveKeyword(body: Record<string, unknown>, userId?: string) {
  const keyword = String(body.keyword || '').trim();
  if (keyword.length < 2) throw new Error('Enter a keyword.');
  const payload = {
    keyword,
    keyword_norm: normKeyword(keyword),
    usage_type: body.usage_type || 'seo',
    is_negative: Boolean(body.is_negative),
    service_category: body.service_category || 'general',
    search_intent: body.search_intent || '',
    target_location: body.target_location || 'Hyderabad',
    priority: body.priority || 'medium',
    match_type: body.match_type || 'phrase',
    target_url: body.target_url || '',
    campaign_draft_id: body.campaign_draft_id || null,
    source: body.source || 'manual',
    notes: body.notes || '',
    status: body.status || 'active',
    is_favorite: Boolean(body.is_favorite),
    impressions_manual: body.impressions_manual ?? null,
    clicks_manual: body.clicks_manual ?? null,
    created_by: userId || null,
  };
  if (body.id) {
    const { data, error } = await db().from('marketing_seo_keywords').update(payload).eq('id', body.id).select('*').single();
    if (error) throw new Error(error.message);
    return data;
  }
  const { data, error } = await db().from('marketing_seo_keywords').insert(payload).select('*').single();
  if (error) {
    if (/unique/i.test(error.message)) throw new Error('That keyword already exists for this type.');
    throw new Error(error.message);
  }
  return data;
}

export async function deleteKeyword(id: string) {
  const { error } = await db().from('marketing_seo_keywords').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function bulkKeywordAction(ids: string[], action: string) {
  if (!ids.length) return;
  if (action === 'delete') {
    await db().from('marketing_seo_keywords').delete().in('id', ids);
    return;
  }
  const patch: Record<string, unknown> = {};
  if (action === 'archive') patch.status = 'archived';
  if (action === 'activate') patch.status = 'active';
  if (action === 'favorite') patch.is_favorite = true;
  if (action === 'unfavorite') patch.is_favorite = false;
  if (Object.keys(patch).length) await db().from('marketing_seo_keywords').update(patch).in('id', ids);
}

export function exportKeywordsCsv(rows: Array<Record<string, unknown>>) {
  return toCsv(
    ['keyword', 'usage_type', 'is_negative', 'service_category', 'search_intent', 'target_location', 'priority', 'match_type', 'target_url', 'status', 'notes'],
    rows,
  );
}

export async function importKeywordsCsv(text: string, userId?: string) {
  const { rows } = parseCsv(text);
  let created = 0;
  let skipped = 0;
  for (const row of rows) {
    const keyword = row.keyword || row.term || '';
    if (!keyword) continue;
    try {
      await saveKeyword({
        keyword,
        usage_type: row.usage_type || row.type || 'seo',
        is_negative: row.is_negative === 'true' || row.negative === 'true',
        service_category: row.service_category || row.category || 'general',
        search_intent: row.search_intent || '',
        target_location: row.target_location || 'Hyderabad',
        priority: row.priority || 'medium',
        match_type: row.match_type || 'phrase',
        target_url: row.target_url || '',
        notes: row.notes || '',
        source: 'csv',
      }, userId);
      created += 1;
    } catch {
      skipped += 1;
    }
  }
  return { created, skipped };
}

export async function listAssets() {
  await ensureMarketingDefaults();
  const { data, error } = await db().from('marketing_ads_assets').select('*').order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function saveAsset(body: Record<string, unknown>, userId?: string) {
  const assetType = String(body.asset_type || 'headline');
  const text = String(body.text || '').trim();
  const check = adsTextValid(assetType, text);
  if (!check.ok && ['headline', 'description', 'callout'].includes(assetType)) throw new Error(check.message);
  const payload = {
    asset_type: assetType,
    text,
    description: body.description || '',
    url: body.url || '',
    service_category: body.service_category || 'general',
    campaign_draft_id: body.campaign_draft_id || null,
    status: body.status || 'approved',
    is_favorite: Boolean(body.is_favorite),
    tags: Array.isArray(body.tags) ? body.tags : String(body.tags || '').split(',').map((item) => item.trim()).filter(Boolean),
    notes: body.notes || '',
    created_by: userId || null,
  };
  if (body.id) {
    const current = await db().from('marketing_ads_assets').select('*').eq('id', body.id).maybeSingle();
    if (current.data) {
      await db().from('marketing_ads_asset_versions').insert({ asset_id: body.id, snapshot: current.data, created_by: userId || null });
    }
    const { data, error } = await db().from('marketing_ads_assets').update(payload).eq('id', body.id).select('*').single();
    if (error) throw new Error(error.message);
    return data;
  }
  const { data, error } = await db().from('marketing_ads_assets').insert(payload).select('*').single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteAsset(id: string) {
  const { error } = await db().from('marketing_ads_assets').update({ status: 'archived' }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function listCampaigns() {
  await ensureMarketingDefaults();
  const { data, error } = await db().from('marketing_campaign_drafts').select('*').order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export function validateCampaign(draft: Record<string, unknown>) {
  return validateCampaignDraft(draft);
}

export async function saveCampaign(body: Record<string, unknown>, userId?: string) {
  const payload = {
    name: String(body.name || '').trim() || 'Untitled draft',
    objective: body.objective || 'leads',
    service_category: body.service_category || 'website-development',
    target_location: body.target_location || 'Hyderabad, India',
    landing_page: body.landing_page || 'https://techantum.com/',
    notes: body.notes || '',
    budget_estimate: body.budget_estimate || '',
    status: body.status === 'ready' ? 'ready' : body.status === 'archived' ? 'archived' : 'draft',
    keyword_ids: body.keyword_ids || [],
    negative_keyword_ids: body.negative_keyword_ids || [],
    headline_ids: body.headline_ids || [],
    description_ids: body.description_ids || [],
    callout_ids: body.callout_ids || [],
    sitelink_ids: body.sitelink_ids || [],
    created_by: userId || null,
  };
  const warnings = validateCampaign(payload);
  if (payload.status === 'ready' && warnings.length) {
    throw new Error(`Draft is not ready: ${warnings.join(' ')}`);
  }
  if (body.id) {
    const { data, error } = await db().from('marketing_campaign_drafts').update(payload).eq('id', body.id).select('*').single();
    if (error) throw new Error(error.message);
    return { ...data, warnings };
  }
  const { data, error } = await db().from('marketing_campaign_drafts').insert(payload).select('*').single();
  if (error) throw new Error(error.message);
  return { ...data, warnings };
}

export async function duplicateCampaign(id: string, userId?: string) {
  const { data, error } = await db().from('marketing_campaign_drafts').select('*').eq('id', id).single();
  if (error || !data) throw new Error(error?.message || 'Draft not found.');
  const copy = { ...data, id: undefined, name: `${data.name} copy`, status: 'draft', created_by: userId || null };
  delete (copy as { id?: string }).id;
  const saved = await db().from('marketing_campaign_drafts').insert(copy).select('*').single();
  if (saved.error) throw new Error(saved.error.message);
  return saved.data;
}

export async function listPages() {
  const routes = getAllStaticPublicRoutes();
  const cms = flattenAdminPages(CMS_SITE_PAGES).map((page) => page.route).filter(Boolean);
  const { data } = await db().from('page_seo').select('*');
  const byPath = new Map((data || []).map((row: any) => [row.path, row]));
  const paths = [...new Set([...routes, ...cms, ...(data || []).map((row: any) => row.path)])].filter((path) => path && path !== '/404-preview');
  return paths.sort().map((path) => ({
    path,
    name: flattenAdminPages(CMS_SITE_PAGES).find((page) => page.route === path)?.label || path,
    ...(byPath.get(path) || { index_enabled: true, follow_enabled: true, publish_state: 'published' }),
  }));
}

export async function savePage(body: Record<string, unknown>, userId?: string) {
  const path = String(body.path || '').startsWith('/') ? String(body.path) : `/${body.path}`;
  const current = await db().from('page_seo').select('*').eq('path', path).maybeSingle();
  if (current.data) {
    await db().from('marketing_page_seo_history').insert({ path, snapshot: current.data, changed_by: userId || null });
  }
  const payload = {
    path,
    index_enabled: body.index_enabled !== false,
    follow_enabled: body.follow_enabled !== false,
    title: body.title || null,
    description: body.description || null,
    og_image_url: body.og_image_url || null,
    og_title: body.og_title || null,
    og_description: body.og_description || null,
    canonical_url: body.canonical_url || null,
    primary_keyword: body.primary_keyword || '',
    secondary_keywords: Array.isArray(body.secondary_keywords)
      ? body.secondary_keywords
      : String(body.secondary_keywords || '').split(',').map((item) => item.trim()).filter(Boolean),
    publish_state: body.publish_state === 'draft' ? 'draft' : 'published',
    header_scripts: body.header_scripts ?? current.data?.header_scripts ?? '',
    footer_scripts: body.footer_scripts ?? current.data?.footer_scripts ?? '',
  };
  const { data, error } = await db().from('page_seo').upsert(payload).select('*').single();
  if (error) throw new Error(error.message);
  if (payload.publish_state === 'published') revalidatePublicPaths([path]);
  return data;
}

export async function pageHistory(path: string) {
  const { data } = await db().from('marketing_page_seo_history').select('*').eq('path', path).order('created_at', { ascending: false }).limit(20);
  return data || [];
}

export async function latestAudit() {
  const run = await db().from('marketing_audit_runs').select('*').order('started_at', { ascending: false }).limit(1).maybeSingle();
  if (!run.data) return { run: null, issues: [] as unknown[] };
  const issues = await db().from('marketing_audit_issues').select('*').eq('run_id', run.data.id).order('priority');
  return { run: run.data, issues: issues.data || [] };
}

export async function persistAudit(userId?: string) {
  const started = await db().from('marketing_audit_runs').insert({ status: 'running', created_by: userId || null }).select('*').single();
  if (started.error || !started.data) throw new Error(started.error?.message || 'Could not start audit.');
  try {
    const result = await runTechnicalAudit();
    const score = seoHealthScore(result.issues.map((item) => ({ ...item, fix_status: 'open' })));
    await db().from('marketing_audit_issues').insert(
      result.issues.map((item) => ({ ...item, run_id: started.data.id, fix_status: 'open' })),
    );
    await db().from('marketing_audit_runs').update({
      status: 'complete',
      health_score: score,
      summary: result.summary,
      finished_at: new Date().toISOString(),
    }).eq('id', started.data.id);
    return latestAudit();
  } catch (error) {
    await db().from('marketing_audit_runs').update({
      status: 'failed',
      error: error instanceof Error ? error.message : 'Audit failed',
      finished_at: new Date().toISOString(),
    }).eq('id', started.data.id);
    throw error;
  }
}

export async function updateIssue(id: string, fixStatus: string) {
  if (!['open', 'in_progress', 'completed_manual'].includes(fixStatus)) throw new Error('Invalid task status.');
  const { data, error } = await db().from('marketing_audit_issues').update({ fix_status: fixStatus }).eq('id', id).select('*').single();
  if (error) throw new Error(error.message);
  return data;
}

export async function listLocalSeoChecks() {
  const { data } = await db().from('marketing_local_seo_checks').select('*').order('id');
  return data || [];
}

export async function saveLocalSeoCheck(id: string, status: string, notes?: string) {
  const { data, error } = await db().from('marketing_local_seo_checks').update({ status, notes: notes || '', updated_at: new Date().toISOString() }).eq('id', id).select('*').single();
  if (error) throw new Error(error.message);
  return data;
}

export function campaignBrief(draft: Record<string, unknown>, assets: Array<Record<string, unknown>>, keywords: Array<Record<string, unknown>>) {
  const pick = (ids: unknown, type?: string) => {
    const set = new Set(Array.isArray(ids) ? ids.map(String) : []);
    return (type ? assets.filter((row) => row.asset_type === type) : keywords).filter((row) => set.has(String(row.id)));
  };
  const headlines = pick(draft.headline_ids, 'headline');
  const descriptions = pick(draft.description_ids, 'description');
  const callouts = pick(draft.callout_ids, 'callout');
  const positives = pick(draft.keyword_ids).filter((row) => !row.is_negative);
  const negatives = pick(draft.negative_keyword_ids);
  return [
    `Campaign: ${draft.name}`,
    `Objective: ${draft.objective}`,
    `Location: ${draft.target_location}`,
    `Landing page: ${draft.landing_page}`,
    `Budget estimate: ${draft.budget_estimate || 'not set'}`,
    '',
    'Headlines:',
    ...headlines.map((row) => `- ${row.text}`),
    '',
    'Descriptions:',
    ...descriptions.map((row) => `- ${row.text}`),
    '',
    'Callouts:',
    ...callouts.map((row) => `- ${row.text}`),
    '',
    'Keywords:',
    ...positives.map((row) => `- ${row.keyword} [${row.match_type || 'phrase'}]`),
    '',
    'Negative keywords:',
    ...negatives.map((row) => `- ${row.keyword}`),
    '',
    'This package is for manual entry into Google Ads. It does not publish ads.',
  ].join('\n');
}
