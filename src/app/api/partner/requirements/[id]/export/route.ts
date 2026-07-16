import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { requirePartner } from '@/lib/partner/auth';
import { getRequirementDocuments } from '@/lib/partner/requirements';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUploadRoot } from '@/lib/storage/local';
import { generateDocxBuffer, generatePdfBuffer } from '@/lib/partner/document-export';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePartner();
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
  const title = `Scope of Work — ${ref}`;

  if (format === 'markdown' && sowMarkdown?.content) {
    return new NextResponse(sowMarkdown.content, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${ref}-SOW.md"`,
      },
    });
  }

  const fileDoc = documents.find(
    (d) => d.format === format && d.doc_type === 'sow' && (d.version ?? 1) === latestVersion
  );

  if (fileDoc?.file_url) {
    const urlPath = fileDoc.file_url.includes('/uploads/')
      ? fileDoc.file_url.split('/uploads/')[1]
      : null;
    if (urlPath) {
      try {
        const buffer = await readFile(path.join(getUploadRoot(), urlPath));
        const contentType = format === 'pdf'
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        return new NextResponse(new Uint8Array(buffer), {
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${ref}-SOW-v${latestVersion}.${format}"`,
          },
        });
      } catch {
        // fall through to on-the-fly generation
      }
    }
  }

  if (!sowMarkdown?.content) {
    return NextResponse.json({ error: 'SOW not found' }, { status: 404 });
  }

  if (format === 'pdf') {
    const buffer = await generatePdfBuffer(sowMarkdown.content, title);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${ref}-SOW.pdf"`,
      },
    });
  }

  if (format === 'docx') {
    const buffer = await generateDocxBuffer(sowMarkdown.content, title);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${ref}-SOW.docx"`,
      },
    });
  }

  return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });
}
