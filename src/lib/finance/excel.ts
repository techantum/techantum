import ExcelJS from 'exceljs';

export async function buildSheet(
  name: string,
  columns: { header: string; key: string; width?: number }[],
  rows: Record<string, unknown>[]
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Techantum Finance';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width || 18 }));
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  for (const row of rows) sheet.addRow(row);
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function buildWorkbook(sheets: { name: string; columns: { header: string; key: string; width?: number }[]; rows: Record<string, unknown>[] }[]) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Techantum Finance';
  workbook.created = new Date();
  for (const spec of sheets) {
    const sheet = workbook.addWorksheet(spec.name.slice(0, 31), { views: [{ state: 'frozen', ySplit: 1 }] });
    sheet.columns = spec.columns.map((c) => ({ header: c.header, key: c.key, width: c.width || 18 }));
    const header = sheet.getRow(1);
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    for (const row of spec.rows) sheet.addRow(row);
  }
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
