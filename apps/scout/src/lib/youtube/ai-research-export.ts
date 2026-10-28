import ExcelJS from 'exceljs';
import { getResearchReport } from './ai-research';
import { COMPARISON_UNAVAILABLE, comparisonTable, type GapVideo } from './gap-cards';
import { loadThumbnailFile } from './thumbnail-read';

export async function exportResearchReport(projectId: string, id: string) {
  const report = await getResearchReport(projectId, id);
  const videos = (report.payload?.evidence?.videos || []) as GapVideo[];
  const table = comparisonTable(videos);
  const stamp = new Date().toISOString().slice(0, 10);
  const safe = String(report.name || 'report').replace(/[^\w.-]+/g, '-').slice(0, 48);
  const columns = [
    { header: 'Detail', key: 'detail', width: 28 },
    ...table.videos.map((video, index) => ({
      header: video.title,
      key: `v${index}`,
      width: 42,
    })),
  ];
  const rows = table.rows.map((row) => {
    const record: Record<string, string> = { detail: row.label };
    row.values.forEach((value, index) => {
      record[`v${index}`] = row.label === 'Thumbnail' && value.startsWith('http') ? value : value;
    });
    return record;
  });
  if (!table.videos.length) {
    columns.push({ header: 'Comparison', key: 'v0', width: 42 });
    rows.push({ detail: 'Videos', v0: 'This report has no saved video comparison.' });
  }
  rows.unshift({
    detail: 'Notice',
    ...Object.fromEntries(table.videos.map((_, index) => [`v${index}`, `YouTube does not publish watch hours, geography, ages watched, or genders watched for these videos. Length is the video duration. Words on the thumbnail are read from the image. Those audience fields are ${COMPARISON_UNAVAILABLE.toLowerCase()}.`])),
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Hookooh';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet('Comparison', { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = columns.map((column) => ({ header: column.header, key: column.key, width: column.width || 18 }));
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  for (const row of rows) sheet.addRow(row);
  const thumbnailIndex = rows.findIndex((row) => row.detail === 'Thumbnail');
  if (thumbnailIndex >= 0) {
    sheet.getRow(thumbnailIndex + 2).height = 78;
    const files = await Promise.all(videos.map((video) => loadThumbnailFile(video).catch(() => null)));
    files.forEach((file, index) => {
      if (!file) return;
      const extension = file.mime.includes('png') ? 'png' : file.mime.includes('jpeg') ? 'jpeg' : '';
      if (!extension) return;
      const imageId = workbook.addImage({ buffer: file.bytes, extension });
      sheet.addImage(imageId, {
        tl: { col: index + 1, row: thumbnailIndex + 1 },
        ext: { width: 160, height: 90 },
      });
    });
  }
  const body = Buffer.from(await workbook.xlsx.writeBuffer());
  return {
    body,
    filename: `${safe}-${stamp}.xlsx`,
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
}
