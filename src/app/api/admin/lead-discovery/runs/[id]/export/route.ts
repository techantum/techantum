import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { buildLeadDiscoveryWorkbook, exportFilename } from '@/lib/places/export';
import { getLeadDiscoveryRun } from '@/lib/places/service';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;

  try {
    const { id } = await context.params;
    const data = await getLeadDiscoveryRun(id);
    if (!data) return NextResponse.json({ error: 'Run not found' }, { status: 404 });

    const buffer = await buildLeadDiscoveryWorkbook(data.run, data.results);
    const filename = exportFilename(data.run);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Export failed' },
      { status: 500 }
    );
  }
}
