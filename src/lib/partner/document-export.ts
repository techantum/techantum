import PDFDocument from 'pdfkit';
import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { getUploadRoot, getPublicUploadUrl } from '@/lib/storage/local';

type MarkdownBlock =
  | { type: 'h1' | 'h2' | 'h3' | 'li' | 'p' | 'hr'; text: string }
  | { type: 'table'; headers: string[]; rows: string[][] };

function stripMd(text: string): string {
  return text.replace(/\*\*/g, '').replace(/\*/g, '').trim();
}

function isTableSeparator(line: string): boolean {
  return /^\|?[\s\-:|]+\|?$/.test(line.trim()) && line.includes('-');
}

function parseTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => stripMd(c.trim()));
}

function parseMarkdownBlocks(markdown: string): MarkdownBlock[] {
  const lines = markdown.split('\n');
  const blocks: MarkdownBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trimEnd();

    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (line.trim() === '---') {
      blocks.push({ type: 'hr', text: '' });
      i += 1;
      continue;
    }

    if (line.trim().startsWith('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const headers = parseTableRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(parseTableRow(lines[i]));
        i += 1;
      }
      blocks.push({ type: 'table', headers, rows });
      continue;
    }

    if (line.startsWith('### ')) blocks.push({ type: 'h3', text: stripMd(line.slice(4)) });
    else if (line.startsWith('## ')) blocks.push({ type: 'h2', text: stripMd(line.slice(3)) });
    else if (line.startsWith('# ')) blocks.push({ type: 'h1', text: stripMd(line.slice(2)) });
    else if (line.startsWith('- ')) blocks.push({ type: 'li', text: stripMd(line.slice(2)) });
    else blocks.push({ type: 'p', text: stripMd(line) });

    i += 1;
  }

  return blocks;
}

function drawPdfTable(
  doc: InstanceType<typeof PDFDocument>,
  headers: string[],
  rows: string[][],
  startX: number,
  tableWidth: number
) {
  const colCount = Math.max(headers.length, ...rows.map((r) => r.length));
  const colWidth = tableWidth / colCount;
  const rowHeight = 22;
  let y = doc.y;

  const drawRow = (cells: string[], bold: boolean) => {
    if (y + rowHeight > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      y = doc.page.margins.top;
    }

    let x = startX;
    for (let c = 0; c < colCount; c += 1) {
      doc
        .rect(x, y, colWidth, rowHeight)
        .strokeColor('#e2e8f0')
        .lineWidth(0.5)
        .stroke();

      doc
        .font(bold ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(9)
        .fillColor('#1e293b')
        .text(cells[c] ?? '', x + 4, y + 6, { width: colWidth - 8, height: rowHeight - 8, ellipsis: true });

      x += colWidth;
    }
    y += rowHeight;
  };

  drawRow(headers, true);
  for (const row of rows) drawRow(row, false);

  doc.y = y + 8;
  doc.x = startX;
}

export async function generatePdfBuffer(markdown: string, title: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    doc.fontSize(20).font('Helvetica-Bold').fillColor('#1e1b4b').text(title, { align: 'center' });
    doc.moveDown(1.2);

    for (const block of parseMarkdownBlocks(markdown)) {
      switch (block.type) {
        case 'h1':
          doc.moveDown(0.6).fontSize(16).font('Helvetica-Bold').fillColor('#1e1b4b').text(block.text);
          break;
        case 'h2':
          doc.moveDown(0.5).fontSize(13).font('Helvetica-Bold').fillColor('#312e81').text(block.text);
          break;
        case 'h3':
          doc.moveDown(0.4).fontSize(11).font('Helvetica-Bold').fillColor('#4338ca').text(block.text);
          break;
        case 'li':
          doc.fontSize(10).font('Helvetica').fillColor('#334155').text(`• ${block.text}`, { indent: 12 });
          break;
        case 'hr':
          doc.moveDown(0.3).strokeColor('#e2e8f0').moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
          doc.moveDown(0.5);
          break;
        case 'table':
          drawPdfTable(doc, block.headers, block.rows, doc.page.margins.left, pageWidth);
          break;
        default:
          doc.fontSize(10).font('Helvetica').fillColor('#334155').text(block.text);
      }
      if (block.type !== 'table') doc.moveDown(0.15);
    }

    doc.end();
  });
}

export async function generateDocxBuffer(markdown: string, title: string): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [
    new Paragraph({
      text: title,
      heading: HeadingLevel.TITLE,
    }),
  ];

  for (const block of parseMarkdownBlocks(markdown)) {
    if (block.type === 'table') {
      const headerRow = new TableRow({
        children: block.headers.map(
          (h) =>
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })],
            })
        ),
      });
      const dataRows = block.rows.map(
        (row) =>
          new TableRow({
            children: row.map(
              (cell) =>
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: cell })] })],
                })
            ),
          })
      );
      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [headerRow, ...dataRows],
        })
      );
      children.push(new Paragraph({ text: '' }));
    } else if (block.type === 'h1') {
      children.push(new Paragraph({ text: block.text, heading: HeadingLevel.HEADING_1 }));
    } else if (block.type === 'h2') {
      children.push(new Paragraph({ text: block.text, heading: HeadingLevel.HEADING_2 }));
    } else if (block.type === 'h3') {
      children.push(new Paragraph({ text: block.text, heading: HeadingLevel.HEADING_3 }));
    } else if (block.type === 'li') {
      children.push(new Paragraph({ children: [new TextRun({ text: `• ${block.text}` })] }));
    } else if (block.type !== 'hr') {
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
