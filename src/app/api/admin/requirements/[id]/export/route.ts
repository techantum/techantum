import { Document, Packer, Paragraph, TextRun } from 'docx';
import PDFDocument from 'pdfkit';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { getAdminRequirement } from '@/lib/client-requirements/service';

function buildLines(detail: Awaited<ReturnType<typeof getAdminRequirement>>) {
  const lines = [
    `Project: ${detail.project.project_name}`,
    `Company: ${detail.project.company_name}`,
    `Client: ${detail.project.client_name}`,
    `Status: ${detail.requirement.status}`,
    '',
  ];
  for (const section of detail.template?.requirement_sections ?? []) {
    lines.push(section.title);
    const sectionAnswers = detail.answers[section.slug] ?? {};
    for (const question of section.requirement_questions ?? []) {
      const value = sectionAnswers[question.question_key];
      lines.push(`${question.label}: ${typeof value === 'object' ? JSON.stringify(value) : value ?? ''}`);
    }
    lines.push('');
  }
  return lines;
}

async function renderPdf(lines: string[]) {
  const doc = new PDFDocument({ margin: 48 });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
  const done = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));
  doc.fontSize(18).text('Client Requirement Submission');
  doc.moveDown();
  doc.fontSize(10);
  for (const line of lines) doc.text(line || ' ');
  doc.end();
  return done;
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  const { id } = await context.params;
  const format = new URL(request.url).searchParams.get('format') || 'json';
  const detail = await getAdminRequirement(id);

  if (format === 'json') return NextResponse.json(detail);

  const lines = buildLines(detail);
  if (format === 'docx') {
    const doc = new Document({
      sections: [{ children: lines.map((line) => new Paragraph({ children: [new TextRun(line)] })) }],
    });
    const buffer = await Packer.toBuffer(doc);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${detail.project.project_code}-requirements.docx"`,
      },
    });
  }

  const pdf = await renderPdf(lines);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${detail.project.project_code}-requirements.pdf"`,
    },
  });
}
