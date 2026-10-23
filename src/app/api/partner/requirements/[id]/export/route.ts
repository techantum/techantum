import { NextResponse } from 'next/server';
import { requirePartnerNavAny } from '@/lib/partner/auth';
import { getRequirementDocuments } from '@/lib/partner/requirements';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateDocxBuffer, generatePdfBuffer } from '@/lib/partner/document-export';
import { stripVendorBranding } from '@/lib/partner/document-branding';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePartnerNavAny(['requirements', 'documents']);
  if ('error' in auth) return auth.error;

  const { id: requirementId } = await params;
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') || 'markdown';

  const { data: req } = await createAdminClient()
    .from('partner_requirements')
    .select('id, reference_id, partner_id')
    .eq('id', requirementId)
    .eq('partner_id', auth.partner.id)
    .maybeSingle();

  if (!req) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const documents = await getRequirementDocuments(requirementId);
  const latestVersion = Math.max(...documents.map((d) => d.version ?? 1), 1);

  const sowMarkdown = documents.find(
    (d) => d.format === 'markdown' && d.doc_type === 'sow' && (d.version ?? 1) === latestVersion
  );

  if (!sowMarkdown?.content && format === 'markdown') {
    return NextResponse.json({ error: 'SOW not found' }, { status: 404 });
  }

  const ref = req.reference_id;
  const title = 'Scope of Work';
  const sowContent = sowMarkdown?.content ? stripVendorBranding(sowMarkdown.content) : '';

  if (format === 'markdown' && sowContent) {
    return new NextResponse(sowContent, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${ref}-SOW.md"`,
      },
    });
  }

  if (!sowContent) {
    return NextResponse.json({ error: 'SOW not found' }, { status: 404 });
  }

  if (format === 'pdf') {
    const buffer = await generatePdfBuffer(sowContent, title);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${ref}-SOW.pdf"`,
      },
    });
  }

  if (format === 'docx') {
    const buffer = await generateDocxBuffer(sowContent, title);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${ref}-SOW.docx"`,
      },
    });
  }

  return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });
}
