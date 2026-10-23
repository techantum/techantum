import { existsSync } from 'node:fs';
import PDFDocument from 'pdfkit';
import { buildWorkbook } from '../finance/excel';
import { AI_RESEARCH_NOTICE, getResearchReport } from './ai-research';

const FONT_REGULAR = [
  'C:\\Windows\\Fonts\\Nirmala.ttf',
  'C:\\Windows\\Fonts\\segoeui.ttf',
  'C:\\Windows\\Fonts\\arial.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
];
const FONT_BOLD = [
  'C:\\Windows\\Fonts\\NirmalaB.ttf',
  'C:\\Windows\\Fonts\\segoeuib.ttf',
  'C:\\Windows\\Fonts\\arialbd.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
];

function firstFont(paths: string[]) {
  return paths.find((file) => existsSync(file)) || '';
}

function text(value: unknown) {
  return String(value ?? '').replace(/\s+/g, ' ').trim() || '—';
}

async function pdfBuffer(title: string, sections: { heading: string; lines: string[] }[]) {
  const regularFile = firstFont(FONT_REGULAR);
  const boldFile = firstFont(FONT_BOLD) || regularFile;
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    if (regularFile) doc.registerFont('Body', regularFile);
    if (boldFile) doc.registerFont('BodyBold', boldFile);
    const regular = regularFile ? 'Body' : 'Helvetica';
    const bold = boldFile ? 'BodyBold' : 'Helvetica-Bold';
    doc.rect(0, 0, doc.page.width, 72).fill('#0f172a');
    doc.fillColor('#ffffff').font(bold).fontSize(18).text(title, 48, 28, { width: doc.page.width - 96 });
    doc.fillColor('#334155').font(regular).fontSize(9).text(AI_RESEARCH_NOTICE, 48, 92, { width: doc.page.width - 96 });
    let y = 130;
    sections.forEach((section) => {
      if (y > doc.page.height - 120) {
        doc.addPage();
        y = 48;
      }
      doc.fillColor('#0f172a').font(bold).fontSize(13).text(section.heading, 48, y);
      y = doc.y + 8;
      section.lines.forEach((line) => {
        if (y > doc.page.height - 72) {
          doc.addPage();
          y = 48;
        }
        doc.fillColor('#334155').font(regular).fontSize(10).text(line, 48, y, { width: doc.page.width - 96 });
        y = doc.y + 6;
      });
      y += 10;
    });
    doc.end();
  });
}

export async function exportResearchReport(projectId: string, id: string, format: string) {
  const report = await getResearchReport(projectId, id);
  const payload = report.payload || {};
  const result = payload.analysis?.result || {};
  const observations = Array.isArray(result.observations) ? result.observations : [];
  const recommendations = Array.isArray(result.recommendations) ? result.recommendations : Array.isArray(payload.actions) ? payload.actions : [];
  const limitations = Array.isArray(result.limitations) ? result.limitations : [];
  const stamp = new Date().toISOString().slice(0, 10);
  const safe = String(report.name || 'report').replace(/[^\w.-]+/g, '-').slice(0, 48);

  if (format === 'xlsx') {
    const body = await buildWorkbook([
      {
        name: 'Summary',
        columns: [
          { header: 'Field', key: 'field', width: 28 },
          { header: 'Value', key: 'value', width: 80 },
        ],
        rows: [
          { field: 'Report', value: report.name },
          { field: 'Type', value: report.report_type },
          { field: 'Generated', value: report.generated_at },
          { field: 'Headline', value: result.summary?.headline },
          { field: 'Summary', value: result.summary?.body },
          { field: 'Notice', value: AI_RESEARCH_NOTICE },
        ],
      },
      {
        name: 'Observations',
        columns: [
          { header: 'Category', key: 'category', width: 22 },
          { header: 'Headline', key: 'headline', width: 36 },
          { header: 'Observation', key: 'observation', width: 48 },
          { header: 'Evidence', key: 'evidence', width: 48 },
          { header: 'Action', key: 'action', width: 40 },
        ],
        rows: observations,
      },
      {
        name: 'Action Plan',
        columns: [
          { header: 'Action', key: 'title', width: 40 },
          { header: 'Kind', key: 'kind', width: 14 },
          { header: 'Priority', key: 'priority', width: 12 },
          { header: 'Status', key: 'status', width: 14 },
          { header: 'Metric', key: 'metric', width: 28 },
          { header: 'Description', key: 'description', width: 48 },
        ],
        rows: recommendations,
      },
    ]);
    return { body, filename: `${safe}-${stamp}.xlsx`, mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
  }

  const body = await pdfBuffer(String(report.name || 'YouTube Research Report'), [
    { heading: '1. Research objective', lines: [text(JSON.stringify(payload.analysis?.config?.goals || [])), `Desired audience: ${text(payload.analysis?.config?.targetAge)} · ${text(payload.analysis?.config?.targetGender)} · ${text(payload.analysis?.config?.targetGeography)}`] },
    { heading: '2. Executive summary', lines: [text(result.summary?.headline), text(result.summary?.body)] },
    { heading: '3. Key observations', lines: observations.flatMap((item: Record<string, string>) => [`${item.headline}`, `Evidence: ${item.evidence}`, `Action: ${item.action}`, '']) },
    { heading: '4. Recommended improvements', lines: recommendations.map((item: Record<string, string>) => `${item.kind === 'new' ? 'Create New Video' : 'Improve Existing Video'} · ${item.title || item.status || ''} — ${item.description || item.metric || ''}`) },
    { heading: '5. Data limitations', lines: limitations.length ? limitations.map(String) : [AI_RESEARCH_NOTICE] },
  ]);
  return { body, filename: `${safe}-${stamp}.pdf`, mime: 'application/pdf' };
}
