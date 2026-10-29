import { Suspense } from 'react';
import MarketingSeoModule from '@/components/admin/marketing-seo/MarketingSeoModule';

export default function SeoAdsAdminPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Loading SEO workspace…</p>}>
      <MarketingSeoModule />
    </Suspense>
  );
}
