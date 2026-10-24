import { existsSync } from 'node:fs';
import {
  Document,
  HeadingLevel,
  Packer,
  PageOrientation,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import PDFDocument from 'pdfkit';
import { buildWorkbook } from '../finance/excel';
import { csvCell, WATCH_HOURS_NOTE, YOUTUBE_METRIC_NOTICE } from './parse';
import { projectExportRows } from './projects';
import { rowsForExport } from './service';
import { assertYoutubeProject, currentYoutubePartnerId } from './scope';
import { FinanceNotFoundError } from '../finance/errors';

const SOURCE = `YouTube Data API public data. Not YouTube Analytics. ${WATCH_HOURS_NOTE}`;

function textCell(value: unknown) {
  if (value == null || value === '') return '';
  return String(value);
}

function numberCell(value: unknown) {
  if (value == null || value === '') return '';
  const number = Number(value);
  return Number.isFinite(number) ? number : '';
}

function exportRow(row: Record<string, unknown>) {
  const tags = Array.isArray(row.tags) ? row.tags.map((tag) => String(tag)).join(', ') : '';
  return {
    project: textCell(row.project_name),
    channel: textCell(row.channel_name) || textCell(row.youtube_channel_id),
    relationship: textCell(row.relationship),
    topic: textCell(row.topic_name),
    tags: row.tags === null ? '' : tags || 'No tags available',
    thumbnail: textCell(row.thumbnail_url),
    caption: textCell(row.thumbnail_caption),
    watch_hours: '',
    title: textCell(row.title) || textCell(row.youtube_video_id),
    url: textCell(row.watch_url),
    published: textCell(row.published_at).slice(0, 10),
    duration: textCell(row.duration),
    content: textCell(row.content_label),
    placement: textCell(row.placement_label),
    views: numberCell(row.view_count),
    likes: numberCell(row.like_count),
    comments: numberCell(row.comment_count),
    description: textCell(row.description),
    notes: textCell(row.research_notes),
    source: SOURCE,
  };
}

const COLUMNS = [
  { header: 'Project', key: 'project', width: 24 },
  { header: 'Channel Name', key: 'channel', width: 28 },
  { header: 'Relationship', key: 'relationship', width: 14 },
  { header: 'Research Topic', key: 'topic', width: 24 },
  { header: 'YouTube Tags', key: 'tags', width: 36 },
  { header: 'Thumbnail URL', key: 'thumbnail', width: 42 },
  { header: 'Content on thumbnail', key: 'caption', width: 28 },
  { header: 'Video Title', key: 'title', width: 42 },
  { header: 'Video URL', key: 'url', width: 42 },
  { header: 'Publish Date', key: 'published', width: 16 },
  { header: 'Duration', key: 'duration', width: 12 },
  { header: 'Content', key: 'content', width: 12 },
  { header: 'Organic or paid', key: 'placement', width: 16 },
  { header: 'Video viewership', key: 'views', width: 16 },
  { header: 'Watch hours', key: 'watch_hours', width: 14 },
  { header: 'Likes', key: 'likes', width: 12 },
  { header: 'Comments', key: 'comments', width: 12 },
  { header: 'Description', key: 'description', width: 48 },
  { header: 'Research Notes', key: 'notes', width: 36 },
  { header: 'Data Source', key: 'source', width: 42 },
];

const FONT_REGULAR = [
  'C:\\Windows\\Fonts\\Nirmala.ttf',
  'C:\\Windows\\Fonts\\nirmala.ttf',
  'C:\\Windows\\Fonts\\segoeui.ttf',
  'C:\\Windows\\Fonts\\arial.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
];
const FONT_BOLD = [
  'C:\\Windows\\Fonts\\NirmalaB.ttf',
  'C:\\Windows\\Fonts\\nirmalab.ttf',
  'C:\\Windows\\Fonts\\segoeuib.ttf',
  'C:\\Windows\\Fonts\\arialbd.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
];

function firstFont(paths: string[]) {
  return paths.find((file) => existsSync(file)) || '';
}

function pdfText(value: unknown, unicode: boolean) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return '—';
  if (unicode) return text;
  return text.replace(/[^\x20-\x7E]/g, ' ').replace(/\s+/g, ' ').trim() || '—';
}

function metricLabel(value: unknown) {
  if (value === '' || value == null) return '—';
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString('en-IN') : String(value);
}

export async function pdfFile(title: string, rows: Record<string, string | number>[]) {
  const regularFile = firstFont(FONT_REGULAR);
  const boldFile = firstFont(FONT_BOLD) || regularFile;
  const unicode = Boolean(regularFile);
  const shown = rows.slice(0, 40);
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 28, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    if (regularFile) doc.registerFont('Body', regularFile);
    if (boldFile) doc.registerFont('BodyBold', boldFile);
    const regular = regularFile ? 'Body' : 'Helvetica';
    const bold = boldFile ? 'BodyBold' : 'Helvetica-Bold';
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const left = 28;
    const right = pageWidth - 28;
    const tableWidth = right - left;
    const cols = [
      { key: 'n', label: '#', width: 22 },
      { key: 'title', label: 'Video', width: 226 },
      { key: 'channel', label: 'Channel', width: 128 },
      { key: 'relationship', label: 'Role', width: 62 },
      { key: 'published', label: 'Published', width: 64 },
      { key: 'duration', label: 'Length', width: 48 },
      { key: 'views', label: 'Viewership', width: 54 },
      { key: 'likes', label: 'Likes', width: 44 },
      { key: 'comments', label: 'Comments', width: 58 },
      { key: 'topic', label: 'Topic', width: 78 },
    ];
    const headerHeight = 78;
    const rowMin = 28;

    const drawBand = (pageLabel: string) => {
      doc.save();
      doc.rect(0, 0, pageWidth, 52).fill('#0f172a');
      doc.fillColor('#ffffff').font(bold).fontSize(14).text(pdfText(rows[0]?.project || 'YouTube Research', unicode), left, 14, { width: tableWidth - 160 });
      doc.font(regular).fontSize(8).fillColor('#cbd5e1').text(pdfText(title, unicode), left, 34, { width: tableWidth - 160 });
      doc.font(regular).fontSize(8).fillColor('#e2e8f0').text(pageLabel, right - 150, 18, { width: 150, align: 'right' });
      doc.restore();
    };

    const drawTableHead = (y: number) => {
      doc.rect(left, y, tableWidth, 22).fill('#f1f5f9');
      doc.strokeColor('#e2e8f0').lineWidth(0.5).rect(left, y, tableWidth, 22).stroke();
      let x = left;
      cols.forEach((col) => {
        doc.fillColor('#475569').font(bold).fontSize(7).text(col.label, x + 4, y + 7, { width: col.width - 8 });
        x += col.width;
      });
      return y + 22;
    };

    const cellValue = (row: Record<string, string | number>, col: string, index: number) => {
      if (col === 'n') return String(index + 1);
      if (col === 'views' || col === 'likes' || col === 'comments') return metricLabel(row[col]);
      if (col === 'relationship') {
        const value = String(row.relationship || '');
        if (value === 'own') return 'Own';
        if (value === 'competitor') return 'Competitor';
        return pdfText(value, unicode);
      }
      return pdfText(row[col], unicode);
    };

    let page = 1;
    drawBand(`Generated ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`);
    doc.fillColor('#64748b').font(regular).fontSize(7).text(YOUTUBE_METRIC_NOTICE, left, 58, { width: tableWidth });
    let y = drawTableHead(headerHeight);

    shown.forEach((row, index) => {
      const title = cellValue(row, 'title', index);
      const tags = pdfText(row.tags, unicode);
      doc.font(regular).fontSize(8);
      const titleHeight = Math.min(28, doc.heightOfString(title, { width: 218 }));
      const height = Math.max(rowMin, titleHeight + (tags && tags !== '—' ? 12 : 6));
      if (y + height > pageHeight - 36) {
        page += 1;
        doc.addPage();
        drawBand(`Page ${page}`);
        y = drawTableHead(60);
      }
      if (index % 2 === 1) doc.rect(left, y, tableWidth, height).fill('#f8fafc');
      doc.strokeColor('#e2e8f0').lineWidth(0.4).rect(left, y, tableWidth, height).stroke();
      let x = left;
      cols.forEach((col) => {
        const value = cellValue(row, col.key, index);
        doc.fillColor('#0f172a').font(col.key === 'title' ? bold : regular).fontSize(col.key === 'title' ? 8 : 7);
        doc.text(value, x + 4, y + 5, { width: col.width - 8, height: col.key === 'title' ? titleHeight : height - 8, ellipsis: true });
        if (col.key === 'title' && tags && tags !== '—') {
          doc.fillColor('#64748b').font(regular).fontSize(6).text(`Tags: ${tags}`, x + 4, y + 5 + titleHeight, { width: col.width - 8, height: 10, ellipsis: true });
        }
        x += col.width;
      });
      y += height;
    });

    if (rows.length > shown.length) {
      if (y > pageHeight - 48) {
        page += 1;
        doc.addPage();
        drawBand(`Page ${page}`);
        y = 64;
      }
      doc.fillColor('#64748b').font(regular).fontSize(8).text(`This PDF shows the first ${shown.length} of ${rows.length} rows. Download Excel for the full set.`, left, y + 10, { width: tableWidth });
    }

    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i += 1) {
      doc.switchToPage(i);
      doc.fillColor('#94a3b8').font(regular).fontSize(7).text(
        `Page ${i + 1} of ${range.count}  ·  ${SOURCE}`,
        left,
        pageHeight - 22,
        { width: tableWidth, align: 'left' }
      );
    }
    doc.end();
  });
}

function asciiCell(value: unknown) {
  return String(value ?? '').replace(/[^\x20-\x7E]/g, ' ').replace(/\s+/g, ' ').trim();
}

function wordCell(text: string, opts?: { bold?: boolean; color?: string; size?: number }) {
  return new TableCell({
    width: { size: 10, type: WidthType.PERCENTAGE },
    shading: opts?.color ? { type: ShadingType.CLEAR, fill: opts.color } : undefined,
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    children: [new Paragraph({ children: [new TextRun({ text: text || ' ', bold: opts?.bold, color: opts?.bold ? 'FFFFFF' : '0F172A', size: opts?.size || 18 })] })],
  });
}

export async function wordFile(title: string, rows: Record<string, string | number>[]) {
  const shown = rows.slice(0, 200);
  const keys = ['title', 'channel', 'relationship', 'content', 'placement', 'published', 'views', 'likes', 'comments', 'topic'] as const;
  const labels = ['Video title', 'Channel', 'Role', 'Content', 'Organic or paid', 'Published', 'Video viewership', 'Likes', 'Comments', 'Topic'];
  const header = new TableRow({
    children: labels.map((label) => wordCell(label, { bold: true, color: '0F172A' })),
  });
  const bodyRows = shown.map((row, index) => new TableRow({
    children: keys.map((key) => {
      const value = key === 'relationship'
        ? (String(row.relationship) === 'own' ? 'Own' : String(row.relationship) === 'competitor' ? 'Competitor' : asciiCell(row[key]))
        : asciiCell(row[key]);
      return wordCell(value, { color: index % 2 ? 'F8FAFC' : 'FFFFFF' });
    }),
  }));
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: { orientation: PageOrientation.LANDSCAPE, width: 16838, height: 11906 },
          margin: { top: 720, right: 720, bottom: 720, left: 720 },
        },
      },
      children: [
        new Paragraph({ text: asciiCell(rows[0]?.project || 'YouTube Research'), heading: HeadingLevel.HEADING_1 }),
        new Paragraph({ children: [new TextRun({ text: asciiCell(title.replaceAll('_', ' ')), italics: true, size: 22, color: '475569' })] }),
        new Paragraph({ children: [new TextRun({ text: asciiCell(YOUTUBE_METRIC_NOTICE), size: 18, color: '64748B' })] }),
        new Paragraph({ text: '' }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [header, ...bodyRows],
        }),
        new Paragraph({ text: '' }),
        new Paragraph({
          children: [new TextRun({
            text: rows.length > shown.length ? `Showing the first ${shown.length} of ${rows.length} rows.` : `${rows.length} rows. ${SOURCE}`,
            size: 18,
            color: '64748B',
          })],
        }),
      ],
    }],
  });
  return Buffer.from(await Packer.toBuffer(doc));
}

export async function exportResearch(params: {
  type?: string;
  format?: string;
  channelId?: string;
  channelIds?: string[];
  videoIds?: string[];
  topicId?: string;
  from?: string;
  to?: string;
  projectId?: string;
  tag?: string;
  q?: string;
  categoryId?: string;
  content?: string;
  placement?: string;
  projectName?: string;
}) {
  if (currentYoutubePartnerId() && !params.projectId) throw new FinanceNotFoundError('Research project not found');
  if (params.projectId) await assertYoutubeProject(params.projectId);
  const format = params.format === 'csv' ? 'csv' : params.format === 'pdf' ? 'pdf' : params.format === 'docx' ? 'docx' : 'xlsx';
  const type = params.type || 'videos';
  const topicId = params.topicId || '';
  const channelIds = (params.channelIds || []).filter(Boolean);
  if (params.channelId) channelIds.push(params.channelId);
  const sourceRows = params.projectId
    ? await projectExportRows({
      projectId: params.projectId,
      channelIds,
      videoIds: params.videoIds,
      topicId,
      tag: params.tag,
      from: params.from,
      to: params.to,
      q: params.q,
      categoryId: params.categoryId,
      content: params.content,
      placement: params.placement,
    })
    : await rowsForExport({ channelId: params.channelId, topicId, from: params.from, to: params.to });
  const rows = sourceRows.map((row) => exportRow({ ...(row as Record<string, unknown>), project_name: params.projectName || '' }));
  const stamp = new Date().toISOString().slice(0, 10);
  if (format === 'csv') {
    const header = COLUMNS.map((column) => csvCell(column.header)).join(',');
    const body = rows.map((row) => COLUMNS.map((column) => csvCell(row[column.key as keyof typeof row])).join(',')).join('\n');
    const csv = `\uFEFF${header}\n${body}${body ? '\n' : ''}# ${YOUTUBE_METRIC_NOTICE}\n`;
    return { filename: `youtube-${type}-${stamp}.csv`, mime: 'text/csv; charset=utf-8', body: Buffer.from(csv, 'utf8') };
  }
  if (format === 'pdf') {
    const body = await pdfFile(type.replaceAll('_', ' '), rows);
    return { filename: `youtube-${type}-${stamp}.pdf`, mime: 'application/pdf', body };
  }
  if (format === 'docx') {
    const body = await wordFile(type.replaceAll('_', ' '), rows);
    return { filename: `youtube-${type}-${stamp}.docx`, mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', body };
  }
  const file = await buildWorkbook([
    { name: 'Research', columns: COLUMNS, rows },
    { name: 'Notice', columns: [{ header: 'Notice', key: 'notice', width: 120 }], rows: [{ notice: YOUTUBE_METRIC_NOTICE }] },
  ]);
  return { filename: `youtube-${type}-${stamp}.xlsx`, mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', body: file };
}
