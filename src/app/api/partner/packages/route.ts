import { NextResponse } from 'next/server';
import { getCatalogWithPackages, getComparisonMatrix } from '@/lib/partner/catalog-service';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const categoryId = url.searchParams.get('categoryId');

  if (categoryId) {
    const matrix = await getComparisonMatrix(categoryId);
    return NextResponse.json(matrix);
  }

  const catalog = await getCatalogWithPackages();
  return NextResponse.json(catalog);
}
