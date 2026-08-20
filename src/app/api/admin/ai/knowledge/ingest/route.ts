import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { saveUploadedFile } from '@/lib/storage/local';
import {
  MAX_INGEST_URLS,
  MAX_PDF_BYTES,
  assertSafeHttpUrl,
  buildChunkTitle,
  chunkText,
  extractPdfText,
  fetchRemoteSource,
  parseUrlList,
  sourceKeywords,
} from '@/lib/whatsapp/ingest';

type CreatedEntry = {
  id: string;
  title: string;
  source_type: string;
};

async function insertChunks(input: {
  categoryId: string;
  userId: string;
  baseTitle: string;
  text: string;
  keywords: string | null;
  allowAi: boolean;
  status: string;
  sourceType: 'URL' | 'PDF';
  sourceUrl: string | null;
  sourceFileUrl: string | null;
}): Promise<CreatedEntry[]> {
  const chunks = chunkText(input.text);
  if (chunks.length === 0) {
    throw new Error('No readable text was found to train the assistant.');
  }

  const supabase = createAdminClient();
  const created: CreatedEntry[] = [];
  for (const [index, content] of chunks.entries()) {
    const { data, error } = await supabase
      .from('ai_knowledge_entries')
      .insert({
        category_id: input.categoryId,
        title: buildChunkTitle(input.baseTitle, index, chunks.length),
        content,
        keywords: input.keywords,
        allow_ai: input.allowAi,
        status: input.status,
        source_type: input.sourceType,
        source_url: input.sourceUrl,
        source_file_url: input.sourceFileUrl,
        created_by: input.userId,
        updated_by: input.userId,
      })
      .select('id, title, source_type')
      .single();
    if (error) throw new Error(error.message);
    if (data) created.push(data as CreatedEntry);
  }
  return created;
}

function parseStatus(value: unknown): string {
  return value === 'DRAFT' ? 'DRAFT' : 'PUBLISHED';
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  const userId = auth.user.id;

  try {
    const contentType = request.headers.get('content-type') || '';
    let categoryId = '';
    let title = '';
    let keywords = '';
    let allowAi = true;
    let status = 'PUBLISHED';
    let urls: string[] = [];
    let pdfFile: File | null = null;

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      categoryId = String(form.get('category_id') || '').trim();
      title = String(form.get('title') || '').trim();
      keywords = String(form.get('keywords') || '').trim();
      allowAi = String(form.get('allow_ai') || 'true') !== 'false';
      status = parseStatus(form.get('status'));
      urls = parseUrlList(String(form.get('urls') || form.get('url') || ''));
      const file = form.get('file');
      pdfFile = file instanceof File && file.size > 0 ? file : null;
    } else {
      const body = (await request.json()) as {
        category_id?: string;
        title?: string;
        keywords?: string;
        allow_ai?: boolean;
        status?: string;
        url?: string;
        urls?: string[] | string;
      };
      categoryId = body.category_id?.trim() || '';
      title = body.title?.trim() || '';
      keywords = body.keywords?.trim() || '';
      allowAi = body.allow_ai ?? true;
      status = parseStatus(body.status);
      urls = Array.isArray(body.urls)
        ? body.urls.map((item) => String(item).trim()).filter(Boolean)
        : parseUrlList(body.urls || body.url || '');
    }

    if (!categoryId) {
      return NextResponse.json({ error: 'Choose a knowledge category.' }, { status: 400 });
    }
    if (urls.length > MAX_INGEST_URLS) {
      return NextResponse.json({ error: `Import up to ${MAX_INGEST_URLS} URLs at a time.` }, { status: 400 });
    }
    if (!pdfFile && urls.length === 0) {
      return NextResponse.json({ error: 'Add a website URL or upload a PDF.' }, { status: 400 });
    }

    const created: CreatedEntry[] = [];
    const errors: { source: string; error: string }[] = [];

    if (pdfFile) {
      const ext = pdfFile.name.split('.').pop()?.toLowerCase() || '';
      const isPdf = pdfFile.type === 'application/pdf' || ext === 'pdf';
      if (!isPdf) {
        return NextResponse.json({ error: 'Only PDF files are allowed.' }, { status: 400 });
      }
      if (pdfFile.size > MAX_PDF_BYTES) {
        return NextResponse.json({ error: 'PDF must be under 15 MB.' }, { status: 400 });
      }
      try {
        const bytes = new Uint8Array(await pdfFile.arrayBuffer());
        const extracted = await extractPdfText(bytes);
        if (extracted.text.length < 40) {
          throw new Error('No readable text was found in that PDF. Scanned image PDFs are not supported yet.');
        }
        const safeName = pdfFile.name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(-80);
        const saved = await saveUploadedFile('knowledge', `kb-${Date.now()}-${safeName}`, pdfFile);
        const baseTitle = title || extracted.title || pdfFile.name.replace(/\.pdf$/i, '') || 'PDF knowledge';
        created.push(
          ...(await insertChunks({
            categoryId,
            userId,
            baseTitle,
            text: extracted.text,
            keywords: sourceKeywords({ title: baseTitle, extra: keywords || 'pdf' }),
            allowAi,
            status,
            sourceType: 'PDF',
            sourceUrl: null,
            sourceFileUrl: saved.url,
          }))
        );
      } catch (err) {
        errors.push({ source: pdfFile.name, error: err instanceof Error ? err.message : 'PDF import failed' });
      }
    }

    for (const rawUrl of urls) {
      try {
        await assertSafeHttpUrl(rawUrl);
        const remote = await fetchRemoteSource(rawUrl);
        const baseTitle = title || remote.title || new URL(remote.finalUrl).hostname;
        created.push(
          ...(await insertChunks({
            categoryId,
            userId,
            baseTitle,
            text: remote.text,
            keywords: sourceKeywords({
              title: baseTitle,
              url: remote.finalUrl,
              extra: `${keywords} ${remote.kind === 'PDF' ? 'pdf' : 'website'}`.trim(),
            }),
            allowAi,
            status,
            sourceType: remote.kind === 'PDF' ? 'PDF' : 'URL',
            sourceUrl: remote.finalUrl,
            sourceFileUrl: null,
          }))
        );
      } catch (err) {
        errors.push({ source: rawUrl, error: err instanceof Error ? err.message : 'URL import failed' });
      }
    }

    if (created.length === 0) {
      return NextResponse.json(
        { error: errors[0]?.error || 'Could not import knowledge.', errors },
        { status: 400 }
      );
    }

    return NextResponse.json({
      created,
      count: created.length,
      errors,
      message: `Imported ${created.length} knowledge ${created.length === 1 ? 'entry' : 'entries'} for the assistant.`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Knowledge import failed' },
      { status: 500 }
    );
  }
}
