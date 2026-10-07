import { NextResponse } from 'next/server';
import { isFinanceError } from './errors';
import { createReadStream } from 'fs';
import { Readable } from 'stream';

export function financeErrorResponse(err: unknown) {
  if (isFinanceError(err)) {
    const body: Record<string, unknown> = { error: err.message };
    if ('issues' in err) body.issues = err.issues;
    return NextResponse.json(body, { status: err.status });
  }
  const message = err instanceof Error ? err.message : 'Finance request failed';
  return NextResponse.json({ error: message }, { status: 400 });
}

export function fileResponse(buffer: Buffer, filename: string, mime: string) {
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': mime,
      'Content-Disposition': `attachment; filename="${filename.replace(/"/g, '')}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}

export function streamFileResponse(
  filePath: string,
  filename: string,
  mime: string,
  disposition: 'inline' | 'attachment' = 'inline'
) {
  const stream = createReadStream(filePath);
  const safe = filename.replace(/"/g, '');
  return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      'Content-Type': mime,
      'Content-Disposition': `${disposition}; filename="${safe}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
