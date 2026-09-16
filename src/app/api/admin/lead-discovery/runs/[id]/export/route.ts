import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { buildLeadDiscoveryWorkbook, exportFilename } from '@/lib/places/export';
import { getLeadDiscoveryRun } from '@/lib/places/service';
import { buildLeadDiscoveryCsv } from '@/lib/places/sheet-data';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;

  try {
    const { id } = await context.params;
    const data = await getLeadDiscoveryRun(id);
    if (!data) return NextResponse.json({ error: 'Run not found' }, { status: 404 });

    const format = new URL(request.url).searchParams.get('format') || 'xlsx';

    if (format === 'csv' || format === 'sheets') {
      const csv = buildLeadDiscoveryCsv(data.results);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${exportFilename(data.run, 'csv')}"`,
        },
      });
    }

    const buffer = await buildLeadDiscoveryWorkbook(data.run, data.results);
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${exportFilename(data.run)}"`,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Export failed' },
      { status: 500 }
    );
  }
}
