'use client';

import ResourcePage, { cellStatus, cellWhen } from '@/components/admin/wa-provider/ResourcePage';

function num(value: unknown) {
  return Number(value || 0).toLocaleString('en-IN');
}

export default function MetaAdsCampaignsPage() {
  return (
    <ResourcePage
      title="Meta Ads campaigns"
      description="Campaign objects synced from GET /act_{id}/campaigns, with last_30d insights when available."
      endpoint="/api/admin/meta-ads/campaigns"
      searchHint="Search name, id or status"
      columns={['Campaign', 'Status', 'Objective', 'Spend', 'Impressions', 'Clicks', 'Updated']}
      render={(row) => [
        <div key="name">
          <div className="font-medium">{String(row.name || row.id)}</div>
          <div className="text-xs text-slate-500">{String(row.id)}</div>
        </div>,
        cellStatus(row.effective_status || row.status),
        String(row.objective || '—'),
        num(row.spend),
        num(row.impressions),
        num(row.clicks),
        cellWhen(row.updated_time || row.last_synced_at),
      ]}
    />
  );
}
