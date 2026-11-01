import { execFile } from 'child_process';
import { copyFile, mkdtemp, mkdir, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { promisify } from 'util';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { getUploadRoot } from '@/lib/storage/local';

const execFileAsync = promisify(execFile);

const SEVERITY_INK: Record<string, string> = {
  critical: '#b91c1c',
  high: '#c2410c',
  medium: '#a16207',
  low: '#0369a1',
  suggestion: '#475569',
};

export const FINDING_COLUMNS: { header: string; key: string; width: number }[] = [
  { header: 'Severity', key: 'severity', width: 14 },
  { header: 'Category', key: 'category', width: 16 },
  { header: 'Issue', key: 'title', width: 36 },
  { header: 'Problem', key: 'description', width: 52 },
  { header: 'Fix', key: 'recommendation', width: 52 },
  { header: 'Page', key: 'page', width: 36 },
];

export function reportBasename(audit: Record<string, unknown>) {
  let host = 'website';
  try {
    host = new URL(String(audit.website_url || '')).hostname.replace(/^www\./, '');
  } catch {
    host = String(audit.audit_name || 'website');
  }
  const safe = host.replace(/[^a-z0-9.-]+/gi, '-').replace(/^-|-$/g, '').slice(0, 48) || 'website';
  const date = String(audit.completed_at || audit.created_at || new Date().toISOString()).slice(0, 10);
  return `website-audit-${safe}-${date}`;
}

function resolveUploadPath(urlOrPath: string): string | null {
  try {
    const pathname = urlOrPath.includes('://') ? new URL(urlOrPath).pathname : urlOrPath;
    const match = pathname.match(/\/?(?:uploads\/)?(website-audits\/[^/?#]+)$/i);
    if (!match) return null;
    const root = path.resolve(getUploadRoot());
    const full = path.resolve(path.join(root, match[1]));
    if (full !== root && !full.startsWith(`${root}${path.sep}`)) return null;
    return full;
  } catch {
    return null;
  }
}

function screenshotEntryName(pageUrl: string, kind: 'desktop' | 'mobile', sourcePath: string) {
  let label = 'page';
  try {
    const parsed = new URL(pageUrl);
    const slug = parsed.pathname === '/' ? 'home' : parsed.pathname.replace(/\/+/g, '-').replace(/^-|-$/g, '');
    label = `${parsed.hostname.replace(/^www\./, '')}${slug ? `-${slug}` : ''}`.slice(0, 80);
  } catch {
    label = pageUrl.replace(/[^a-z0-9._-]+/gi, '-').slice(0, 80) || 'page';
  }
  const ext = path.extname(sourcePath).toLowerCase() || '.jpg';
  return `${kind}-${label}${ext}`;
}

/** Build a zip of every desktop/mobile screenshot captured for an audit. */
export async function screenshotsZip(audit: Record<string, unknown>, pages: Record<string, unknown>[]) {
  const dir = await mkdtemp(path.join(tmpdir(), 'website-audit-shots-'));
  const shotsDir = path.join(dir, 'screenshots');
  await mkdir(shotsDir, { recursive: true });
  const usedNames = new Set<string>();
  let added = 0;

  try {
    for (const page of pages) {
      const pageUrl = String(page.normalized_url || page.url || 'page');
      for (const kind of ['desktop', 'mobile'] as const) {
        const shotUrl = String(page[`${kind}_screenshot`] || '').trim();
        if (!shotUrl) continue;
        const source = resolveUploadPath(shotUrl);
        if (!source) continue;
        let name = screenshotEntryName(pageUrl, kind, source);
        if (usedNames.has(name)) {
          const ext = path.extname(name);
          name = `${path.basename(name, ext)}-${added + 1}${ext}`;
        }
        try {
          await copyFile(source, path.join(shotsDir, name));
          usedNames.add(name);
          added += 1;
        } catch {
          /* skip missing files */
        }
      }
    }

    if (!added) throw new Error('No screenshots available to download.');

    const zipName = `${reportBasename(audit)}-screenshots.zip`;
    const zipPath = path.join(dir, zipName);
    await execFileAsync('zip', ['-qr', zipPath, 'screenshots'], { cwd: dir });
    return { buffer: await readFile(zipPath), filename: zipName, count: added };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}

export function findingExportRows(findings: Record<string, unknown>[]) {
  return findings.map((row) => detailOf(row));
}

export async function findingsWorkbook(
  audit: Record<string, unknown>,
  findings: Record<string, unknown>[],
  _pages: Record<string, unknown>[] = []
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Techantum';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet('Report', {
    views: [{ showGridLines: false }],
    pageSetup: {
      paperSize: 9,
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.6, right: 0.6, top: 0.7, bottom: 0.6, header: 0.25, footer: 0.25 },
    },
    headerFooter: { oddFooter: '&LTechantum&RPage &P of &N', evenFooter: '&LTechantum&RPage &P of &N' },
  });
  sheet.columns = [
    { key: 'label', width: 14 },
    { key: 'value', width: 92 },
  ];

  writeMerged(sheet, 'Website Audit Report', { size: 18, bold: true, color: 'FF0F172A' });
  writeMerged(sheet, siteLabel(audit), { size: 12, color: 'FF475569' });
  writeMerged(sheet, overviewLine(audit, findings), { size: 11, color: 'FF334155' });
  const counts = countLine(findings);
  if (counts) writeMerged(sheet, counts, { size: 11, color: 'FF334155' });
  sheet.addRow([]);

  findingExportRows(findings).forEach((item, index) => {
    const ink = (SEVERITY_INK[item.severity.toLowerCase()] || '#0F172A').replace('#', 'FF');
    writeMerged(sheet, `${index + 1}. ${item.title || 'Untitled finding'}`, { size: 13, bold: true, color: 'FF0F172A' });
    writeMerged(sheet, [labelize(item.severity), labelize(item.category), item.page].filter(Boolean).join('   ·   '), { size: 10, color: ink });
    if (item.description) writePair(sheet, 'Problem', item.description);
    if (item.recommendation) writePair(sheet, 'Fix', item.recommendation);
    const spacer = sheet.addRow([]);
    spacer.height = 10;
  });

  if (!findings.length) writeMerged(sheet, 'No findings.', { size: 12, color: 'FF64748B' });
  sheet.pageSetup.printArea = `A1:B${Math.max(1, sheet.rowCount)}`;
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export function findingsPdf(audit: Record<string, unknown>, findings: Record<string, unknown>[]) {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 48, bottom: 56, left: 48, right: 48 },
      bufferPages: true,
    });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const left = doc.page.margins.left;
    const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const contentBottom = () => doc.page.height - doc.page.margins.bottom;

    const paragraph = (text: string, options: PDFKit.Mixins.TextOptions & { color?: string; font?: string; size?: number }) => {
      doc.fillColor(options.color || '#0f172a').font(options.font || 'Helvetica').fontSize(options.size || 10);
      doc.text(text, left, doc.y, { width, lineGap: 2 });
    };

    const gap = (points: number) => {
      if (doc.y + points < contentBottom()) doc.y += points;
    };

    paragraph('Website Audit Report', { font: 'Helvetica-Bold', size: 18 });
    gap(6);
    paragraph(siteLabel(audit), { color: '#475569', size: 11 });
    gap(4);
    paragraph(overviewLine(audit, findings), { color: '#334155', size: 10 });
    const counts = countLine(findings);
    if (counts) {
      gap(2);
      paragraph(counts, { color: '#334155', size: 10 });
    }
    gap(18);

    if (!findings.length) paragraph('No findings.', { color: '#64748b', size: 11 });

    findingExportRows(findings).forEach((item, index) => {
      doc.font('Helvetica-Bold').fontSize(12);
      const title = `${index + 1}. ${item.title || 'Untitled finding'}`;
      const titleHeight = doc.heightOfString(title, { width });
      if (doc.y + titleHeight + 36 > contentBottom()) doc.addPage();
      const ink = SEVERITY_INK[item.severity.toLowerCase()] || '#0f172a';
      paragraph(title, { font: 'Helvetica-Bold', size: 12 });
      gap(3);
      paragraph([labelize(item.severity), labelize(item.category), item.page].filter(Boolean).join('   ·   '), { color: ink, size: 9 });
      if (item.description) {
        gap(8);
        paragraph('Problem', { font: 'Helvetica-Bold', size: 9, color: '#64748b' });
        gap(2);
        paragraph(item.description, { size: 10, color: '#1e293b' });
      }
      if (item.recommendation) {
        gap(6);
        paragraph('Fix', { font: 'Helvetica-Bold', size: 9, color: '#64748b' });
        gap(2);
        paragraph(item.recommendation, { size: 10, color: '#1e293b' });
      }
      gap(16);
    });

    const range = doc.bufferedPageRange();
    for (let index = 0; index < range.count; index += 1) {
      doc.switchToPage(index);
      const saved = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;
      doc.font('Helvetica').fontSize(8).fillColor('#94a3b8').text(
        `${index + 1} / ${range.count}`,
        left,
        doc.page.height - 32,
        { width, align: 'right', lineBreak: false }
      );
      doc.page.margins.bottom = saved;
    }
    doc.end();
  });
}

function writeMerged(sheet: ExcelJS.Worksheet, value: string, style: { size: number; bold?: boolean; color: string }) {
  const row = sheet.addRow([value, '']);
  sheet.mergeCells(row.number, 1, row.number, 2);
  const cell = row.getCell(1);
  cell.font = { name: 'Calibri', size: style.size, bold: style.bold, color: { argb: style.color } };
  cell.alignment = { wrapText: true, vertical: 'top' };
  row.height = Math.min(72, Math.max(18, Math.ceil(value.length / 95) * (style.size + 6)));
}

function writePair(sheet: ExcelJS.Worksheet, label: string, value: string) {
  const row = sheet.addRow([label, value]);
  row.getCell(1).font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF64748B' } };
  row.getCell(1).alignment = { vertical: 'top' };
  row.getCell(2).font = { name: 'Calibri', size: 11, color: { argb: 'FF1E293B' } };
  row.getCell(2).alignment = { wrapText: true, vertical: 'top' };
  row.height = Math.min(96, Math.max(18, Math.ceil(value.length / 90) * 16));
}

function detailOf(row: Record<string, unknown>) {
  const pages = urlsOf(row).map(pathOf);
  return {
    severity: String(row.severity || ''),
    category: String(row.category || ''),
    title: clean(row.title),
    description: clean(row.description),
    recommendation: clean(row.recommendation),
    page: pages.join(', '),
  };
}

function urlsOf(row: Record<string, unknown>) {
  const evidence = recordOf(row.evidence);
  const urls = [
    ...(Array.isArray(row.affected_urls) ? row.affected_urls : []),
    evidence.url,
    ...(Array.isArray(evidence.urls) ? evidence.urls : []),
  ].map((item) => String(item || '').trim()).filter(Boolean);
  return [...new Set(urls)];
}

function pathOf(value: string) {
  try {
    const url = new URL(value);
    return `${url.pathname || '/'}${url.search || ''}`;
  } catch {
    return value;
  }
}

function siteLabel(audit: Record<string, unknown>) {
  return String(audit.website_url || audit.audit_name || 'Website');
}

function overviewLine(audit: Record<string, unknown>, findings: Record<string, unknown>[]) {
  const score = audit.overall_score == null || audit.overall_score === '' ? '' : `Score ${audit.overall_score}`;
  const scanned = audit.pages_scanned == null || audit.pages_scanned === '' ? '' : `${audit.pages_scanned} pages scanned`;
  const total = `${findings.length} finding${findings.length === 1 ? '' : 's'}`;
  return [score, scanned, total].filter(Boolean).join('  ·  ');
}

function countLine(findings: Record<string, unknown>[]) {
  const order = ['critical', 'high', 'medium', 'low', 'suggestion'];
  const counts = countBy(findings, 'severity');
  return order.filter((key) => counts[key]).map((key) => `${counts[key]} ${key}`).join('  ·  ');
}

function labelize(value: string) {
  const text = value.replaceAll('_', ' ').trim().toLowerCase();
  if (text === 'seo') return 'SEO';
  if (text === 'ux') return 'UX';
  if (text === 'ui') return 'UI';
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}

function clean(value: unknown) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function countBy(rows: Record<string, unknown>[], key: string) {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const label = String(row[key] || '').trim().toLowerCase();
    if (!label) continue;
    counts[label] = (counts[label] || 0) + 1;
  }
  return counts;
}

function recordOf(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
