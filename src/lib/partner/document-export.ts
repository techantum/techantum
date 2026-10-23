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
  const colCount = Math.max(headers.length, 1, ...rows.map((r) => r.length));
  const colWidth = tableWidth / colCount;
  const padX = 7;
  const padY = 6;
  const bottomLimit = () => doc.page.height - doc.page.margins.bottom - 28;
  let y = doc.y;

  const measureHeight = (cells: string[], bold: boolean) => {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5);
    let height = 18;
    for (const cell of cells) {
      height = Math.max(height, doc.heightOfString(String(cell ?? ''), { width: colWidth - padX * 2 }) + padY * 2);
    }
    return height;
  };

  const drawRow = (cells: string[], header: boolean) => {
    const rowHeight = measureHeight(cells, header);
    if (y + rowHeight > bottomLimit()) {
      doc.addPage();
      y = doc.page.margins.top + 16;
    }

    let x = startX;
    for (let c = 0; c < colCount; c += 1) {
      if (header) {
        doc.rect(x, y, colWidth, rowHeight).fill('#0f172a');
      } else {
        doc.rect(x, y, colWidth, rowHeight).fill(y % 2 === 0 ? '#ffffff' : '#f8fafc');
        doc.rect(x, y, colWidth, rowHeight).strokeColor('#e2e8f0').lineWidth(0.4).stroke();
      }
      doc
        .font(header ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(8.5)
        .fillColor(header ? '#ffffff' : '#1e293b')
        .text(cells[c] ?? '', x + padX, y + padY, { width: colWidth - padX * 2 });
      x += colWidth;
    }
    y += rowHeight;
  };

  drawRow(headers, true);
  for (const row of rows) drawRow(row, false);

  doc.y = y + 10;
  doc.x = startX;
}

export async function generatePdfBuffer(markdown: string, title: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 56, size: 'A4', bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const blocks = parseMarkdownBlocks(markdown);
    const firstHeading = blocks.find((block) => block.type === 'h1');

    doc.rect(0, 0, doc.page.width, 6).fill('#ea580c');
    doc.moveDown(1.4);
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#ea580c').text('SCOPE OF WORK', { characterSpacing: 1.4 });
    doc.moveDown(0.25);
    doc.fontSize(20).font('Helvetica-Bold').fillColor('#0f172a').text(title, { width: pageWidth });
    doc.moveDown(0.35);
    doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
    doc.moveDown(0.8);

    for (const block of blocks) {
      if (block.type === 'h1' && firstHeading && block.text === firstHeading.text) continue;
      switch (block.type) {
        case 'h1':
          doc.moveDown(0.4).fontSize(14).font('Helvetica-Bold').fillColor('#0f172a').text(block.text);
          break;
        case 'h2':
          doc.moveDown(0.7).fontSize(12).font('Helvetica-Bold').fillColor('#0f172a').text(block.text);
          doc.moveDown(0.15).strokeColor('#fed7aa').lineWidth(1.5).moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.margins.left + 42, doc.y).stroke();
          doc.moveDown(0.35);
          break;
        case 'h3':
          doc.moveDown(0.35).fontSize(10.5).font('Helvetica-Bold').fillColor('#334155').text(block.text);
          break;
        case 'li':
          doc.fontSize(10).font('Helvetica').fillColor('#334155').text(`•  ${block.text}`, {
            indent: 8,
            lineGap: 2,
            paragraphGap: 2,
          });
          break;
        case 'hr':
          doc.moveDown(0.35).strokeColor('#e2e8f0').moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
          doc.moveDown(0.45);
          break;
        case 'table':
          drawPdfTable(doc, block.headers, block.rows, doc.page.margins.left, pageWidth);
          break;
        default:
          doc.fontSize(10).font('Helvetica').fillColor('#334155').text(block.text, { lineGap: 2.5, paragraphGap: 6, align: 'justify' });
      }
      if (block.type !== 'table' && block.type !== 'h2') doc.moveDown(0.12);
    }

    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i += 1) {
      doc.switchToPage(range.start + i);
      doc.rect(0, doc.page.height - 28, doc.page.width, 28).fill('#f8fafc');
      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor('#64748b')
        .text('Confidential', doc.page.margins.left, doc.page.height - 18, { width: pageWidth / 2, align: 'left' });
      doc
        .fontSize(8)
        .fillColor('#64748b')
        .text(`Page ${i + 1} of ${range.count}`, doc.page.margins.left, doc.page.height - 18, { width: pageWidth, align: 'right' });
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
  const title = 'Scope of Work';
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
