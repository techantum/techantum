import PDFDocument from 'pdfkit';
import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from 'docx';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { getUploadRoot, getPublicUploadUrl } from '@/lib/storage/local';

function parseMarkdownLines(markdown: string): { type: 'h1' | 'h2' | 'h3' | 'li' | 'p'; text: string }[] {
  return markdown
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0)
    .map((line) => {
      if (line.startsWith('### ')) return { type: 'h3' as const, text: line.slice(4).replace(/\*\*/g, '') };
      if (line.startsWith('## ')) return { type: 'h2' as const, text: line.slice(3).replace(/\*\*/g, '') };
      if (line.startsWith('# ')) return { type: 'h1' as const, text: line.slice(2).replace(/\*\*/g, '') };
      if (line.startsWith('- ')) return { type: 'li' as const, text: line.slice(2).replace(/\*\*/g, '') };
      return { type: 'p' as const, text: line.replace(/\*\*/g, '') };
    });
}

export async function generatePdfBuffer(markdown: string, title: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).font('Helvetica-Bold').text(title, { align: 'center' });
    doc.moveDown(1.5);

    for (const block of parseMarkdownLines(markdown)) {
      switch (block.type) {
        case 'h1':
          doc.moveDown(0.5).fontSize(16).font('Helvetica-Bold').text(block.text);
          break;
        case 'h2':
          doc.moveDown(0.4).fontSize(14).font('Helvetica-Bold').text(block.text);
          break;
        case 'h3':
          doc.moveDown(0.3).fontSize(12).font('Helvetica-Bold').text(block.text);
          break;
        case 'li':
          doc.fontSize(10).font('Helvetica').text(`• ${block.text}`, { indent: 12 });
          break;
        default:
          doc.fontSize(10).font('Helvetica').text(block.text);
      }
      doc.moveDown(0.2);
    }

    doc.end();
  });
}

export async function generateDocxBuffer(markdown: string, title: string): Promise<Buffer> {
  const children: Paragraph[] = [
    new Paragraph({
      text: title,
      heading: HeadingLevel.TITLE,
    }),
  ];

  for (const block of parseMarkdownLines(markdown)) {
    if (block.type === 'h1') {
      children.push(new Paragraph({ text: block.text, heading: HeadingLevel.HEADING_1 }));
    } else if (block.type === 'h2') {
      children.push(new Paragraph({ text: block.text, heading: HeadingLevel.HEADING_2 }));
    } else if (block.type === 'h3') {
      children.push(new Paragraph({ text: block.text, heading: HeadingLevel.HEADING_3 }));
    } else if (block.type === 'li') {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `• ${block.text}` })],
        })
      );
    } else {
      children.push(new Paragraph({ children: [new TextRun({ text: block.text })] }));
    }
  }

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}

export async function savePartnerDocumentFile(
  requirementId: string,
  referenceId: string,
  format: 'pdf' | 'docx',
  buffer: Buffer,
  version: number
): Promise<{ fileUrl: string; relativePath: string }> {
  const root = getUploadRoot();
  const dir = path.join(root, 'partner-docs', requirementId);
  await mkdir(dir, { recursive: true });

  const fileName = `${referenceId}-SOW-v${version}.${format}`;
  const relativePath = `uploads/partner-docs/${requirementId}/${fileName}`;
  await writeFile(path.join(dir, fileName), buffer);

  return {
    relativePath,
    fileUrl: getPublicUploadUrl(relativePath),
  };
}

export async function generateAndSaveExports(
  requirementId: string,
  referenceId: string,
  markdown: string,
  version: number
): Promise<{ pdfUrl: string; docxUrl: string }> {
  const title = `Scope of Work — ${referenceId}`;
  const [pdfBuffer, docxBuffer] = await Promise.all([
    generatePdfBuffer(markdown, title),
    generateDocxBuffer(markdown, title),
  ]);

  const [pdf, docx] = await Promise.all([
    savePartnerDocumentFile(requirementId, referenceId, 'pdf', pdfBuffer, version),
    savePartnerDocumentFile(requirementId, referenceId, 'docx', docxBuffer, version),
  ]);

  return { pdfUrl: pdf.fileUrl, docxUrl: docx.fileUrl };
}
