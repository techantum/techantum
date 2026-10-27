import { NextResponse } from 'next/server';
import { listPackages } from '@/lib/saas/catalog';

export const dynamic = 'force-dynamic';

export async function GET() {
  const rows = await listPackages({ activeOnly: true });
  return NextResponse.json({
    rows: rows.map((item) => ({
      id: item.id,
      name: item.name,
      slug: item.slug,
      price_monthly: item.price_monthly,
      price_yearly: item.price_yearly,
      highlight: item.highlight,
      short_description: item.short_description,
      description_html: item.description_html,
      features: item.features.map((feature) => ({ name: feature.name, description: feature.description })),
    })),
  });
}
