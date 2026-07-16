import { NextResponse } from 'next/server';
import {
  getPartnerComparisonMatrix,
  getPartnerServiceCatalog,
} from '@/lib/partner/service-catalog';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const division = url.searchParams.get('division') ?? url.searchParams.get('categoryId');

  if (division) {
    const matrix = getPartnerComparisonMatrix(division);
    return NextResponse.json({
      packages: matrix.packages,
      rows: matrix.rows,
      divisionSlug: matrix.divisionSlug,
    });
  }

  const catalog = getPartnerServiceCatalog();
  return NextResponse.json(catalog);
}
