import PDFDocument from 'pdfkit';
import { existsSync } from 'fs';
import { formatINR } from './money.ts';
import { payslipAmountInWords, type SalaryStructure } from './salary.ts';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
const FONT_BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';

const INK = '#1c1c1c';
const MUTED = '#4b5563';
const LINE = '#d5d8de';
const BAR = '#eceff3';
const HEAD = '#f4f5f7';


function inr(cents: number) {
  return formatINR(cents, false);
}

function dmy(value: unknown) {
  const text = String(value || '').slice(0, 10);
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '';
}

export type PayslipPdfInput = {
  companyName: string;
  logoPath?: string | null;
  headerRight?: string | null;
  signatoryName?: string | null;
  signatoryTitle?: string | null;
  employeeCode: string;
  fullName: string;
  dateOfBirth: string | null;
  dateOfJoining: string | null;
  designation: string;
  bankName: string;
  bankAccountNo: string;
  pan: string;
  location: string;
  payrollMonth: number;
  payrollYear: number;
  daysInMonth: number;
  lopDays: number;
  lprDays: number;
  workingDays?: number | null;
  payableDays?: number | null;
  paidLeaveDays?: number | null;
  otherDeductionCents?: number;
  structure: SalaryStructure;
  lopCents: number;
  grossDeductionCents: number;
  netCents: number;
};

export function generatePayslipPdf(input: PayslipPdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 36, bottom: 36, left: 40, right: 40 },
    });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const useDejaVu = existsSync(FONT) && existsSync(FONT_BOLD);
    if (useDejaVu) {
      doc.registerFont('Body', FONT);
      doc.registerFont('BodyBold', FONT_BOLD);
    }
    const regular = useDejaVu ? 'Body' : 'Helvetica';
    const bold = useDejaVu ? 'BodyBold' : 'Helvetica-Bold';

    const left = 32;
    const right = doc.page.width - 32;
    const width = right - left;

    if (input.logoPath && existsSync(input.logoPath)) {
      try {
        doc.image(input.logoPath, left, 34, { fit: [168, 44], align: 'left', valign: 'center' });
      } catch {
        /* skip a logo pdfkit cannot draw */
      }
    }

    const headerLines = String(input.headerRight || input.companyName || 'Techantum Solutions')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    doc.fillColor(INK).font(bold).fontSize(13);
    doc.text(headerLines[0] || 'Techantum Solutions', left, 36, { width, align: 'right' });
    headerLines.slice(1).forEach((line, index) => {
      doc.font(regular).fontSize(9).fillColor(MUTED);
      doc.text(line, left, 54 + index * 12, { width, align: 'right' });
    });
    const headerBottom = Math.max(82, 54 + Math.max(0, headerLines.length - 1) * 12);

    const rows: [string, string, string, string][] = [
      ['Employee Code', input.employeeCode, 'Employee Name', input.fullName],
      ['Date Of Birth', dmy(input.dateOfBirth), 'Date of Joining', dmy(input.dateOfJoining)],
      ['Designation', input.designation, 'Bank Name', input.bankName],
      ['Bank A/C No', input.bankAccountNo, 'PAN NO', input.pan],
      [
        'No of Days / LOP / LPR',
        `${input.daysInMonth} / ${input.lopDays} / ${input.lprDays}`,
        'Location',
        input.location,
      ],
    ];
    if (input.workingDays != null) {
      rows.push([
        'Working / Payable Days',
        `${input.workingDays} / ${input.payableDays ?? ''}`,
        'Paid Leave',
        String(input.paidLeaveDays ?? 0),
      ]);
    }

    let y = headerBottom + 18;
    rows.forEach((row) => {
      doc.font(regular).fontSize(9).fillColor(MUTED);
      doc.text(row[0], left, y, { width: 130, lineBreak: false });
      doc.font(bold).fillColor(INK);
      doc.text(row[1], left + 132, y, { width: 130, lineBreak: false });
      doc.font(regular).fillColor(MUTED);
      doc.text(row[2], left + 268, y, { width: 110, lineBreak: false });
      doc.font(bold).fillColor(INK);
      doc.text(row[3], left + 380, y, { width: width - 380, lineBreak: false });
      y += 18;
    });

    y += 10;
    doc.save();
    doc.rect(left, y, width, 22).fill(BAR);
    doc.restore();
    doc.fillColor(INK).font(bold).fontSize(10);
    doc.text(`Payslip for the month of ${MONTHS[input.payrollMonth - 1] || input.payrollMonth} ${input.payrollYear}`, left + 8, y + 6, {
      width: width - 16,
      lineBreak: false,
    });
    y += 32;

    const cols = [104, 70, 82, 112, 68, width - 104 - 70 - 82 - 112 - 68];
    const earnings: [string, number, number][] = [
      ['Basic', input.structure.basicCents, input.structure.basicAnnualCents],
      ['H.R.A', input.structure.hraCents, input.structure.hraAnnualCents],
      ['Leave Encashment', input.structure.leaveEncashmentCents, input.structure.leaveEncashmentAnnualCents],
      ['Special Allowance', input.structure.specialAllowanceCents, input.structure.specialAnnualCents],
      ['PDA', input.structure.pdaCents, input.structure.pdaAnnualCents],
      ['Convenience Allowance', input.structure.convenienceCents, input.structure.convenienceAnnualCents],
    ];
    const deductions: [string, string, string][] = [
      ['Profession Tax', inr(input.structure.professionalTaxCents), inr(input.structure.professionalTaxAnnualCents)],
      ['Provident Fund (PF)', inr(input.structure.pfCents), inr(input.structure.pfAnnualCents)],
      ['LOP', inr(input.lopCents), ''],
    ];
    if (input.otherDeductionCents) {
      deductions.push(['Other deductions', inr(input.otherDeductionCents), '']);
    }

    const rowH = 18;
    const tableH = rowH * (earnings.length + 2);
    doc.save();
    doc.lineWidth(0.6).strokeColor(LINE).rect(left, y, width, tableH).stroke();
    doc.restore();

    const xAt = (index: number) => left + cols.slice(0, index).reduce((sum, n) => sum + n, 0);
    doc.save();
    doc.rect(left, y, width, rowH).fill(HEAD);
    doc.moveTo(xAt(3), y).lineTo(xAt(3), y + tableH).strokeColor(LINE).lineWidth(0.6).stroke();
    doc.restore();
    const headers = ['Earnings', 'Amount', 'Year to Date', 'Deductions', 'Amount', 'Year to Date'];
    headers.forEach((label, index) => {
      const numeric = index === 1 || index === 2 || index === 4 || index === 5;
      doc.font(bold).fontSize(8).fillColor(INK);
      doc.text(label, xAt(index) + 4, y + 5, {
        width: cols[index] - 8,
        align: numeric ? 'right' : 'left',
        lineBreak: false,
      });
    });

    earnings.forEach((row, index) => {
      const rowY = y + rowH * (index + 1);
      doc.font(regular).fontSize(8).fillColor(INK);
      doc.text(row[0], xAt(0) + 4, rowY + 5, { width: cols[0] - 8, lineBreak: false });
      doc.text(inr(row[1]), xAt(1) + 4, rowY + 5, { width: cols[1] - 8, align: 'right', lineBreak: false });
      doc.text(inr(row[2]), xAt(2) + 4, rowY + 5, { width: cols[2] - 8, align: 'right', lineBreak: false });
      if (index < earnings.length - 1) {
        doc.save();
        doc.moveTo(left, rowY + rowH).lineTo(left + cols[0] + cols[1] + cols[2], rowY + rowH).strokeColor(LINE).lineWidth(0.4).stroke();
        doc.restore();
      }
    });

    deductions.forEach((row, index) => {
      const rowY = y + rowH * (index + 1);
      doc.font(regular).fontSize(8).fillColor(INK);
      doc.text(row[0], xAt(3) + 4, rowY + 5, { width: cols[3] - 8, lineBreak: false });
      doc.text(row[1], xAt(4) + 4, rowY + 5, { width: cols[4] - 8, align: 'right', lineBreak: false });
      doc.text(row[2], xAt(5) + 4, rowY + 5, { width: cols[5] - 8, align: 'right', lineBreak: false });
    });

    const grossY = y + rowH * (earnings.length + 1);
    doc.save();
    doc.rect(left, grossY, width, rowH).fill(HEAD);
    doc.restore();
    doc.font(bold).fontSize(8).fillColor(INK);
    doc.text('Gross Earning', xAt(0) + 4, grossY + 5, { width: cols[0] - 8, lineBreak: false });
    doc.text(inr(input.structure.monthlyGrossCents), xAt(1) + 4, grossY + 5, {
      width: cols[1] - 8,
      align: 'right',
      lineBreak: false,
    });
    doc.text(inr(input.structure.annualCtcCents), xAt(2) + 4, grossY + 5, {
      width: cols[2] - 8,
      align: 'right',
      lineBreak: false,
    });
    doc.text('Gross Deduction', xAt(3) + 4, grossY + 5, { width: cols[3] - 8, lineBreak: false });
    doc.text(inr(input.grossDeductionCents), xAt(4) + 4, grossY + 5, {
      width: cols[4] - 8,
      align: 'right',
      lineBreak: false,
    });

    y = grossY + rowH + 16;
    doc.save();
    doc.rect(left, y, width, 22).fill(BAR);
    doc.restore();
    doc.font(bold).fontSize(10).fillColor(INK);
    doc.text('Net Pay', left + 8, y + 6, { width: 120, lineBreak: false });
    doc.text(inr(input.netCents), left + 130, y + 6, { width: 140, lineBreak: false });
    y += 28;
    doc.font(bold).fontSize(9);
    doc.text('Net Pay In Words', left, y, { width: 120, lineBreak: false });
    doc.font(regular);
    doc.text(payslipAmountInWords(input.netCents), left + 124, y, { width: width - 124, lineBreak: false });

    y += 28;
    doc.font(regular).fontSize(8).fillColor(MUTED);
    doc.text('Note : This is a computer generated payslip and does not require authentication.', left, y, {
      width,
      lineBreak: false,
    });

    y += 78;
    doc.fillColor(INK).font(regular).fontSize(10);
    doc.text('Authorise Signature', left, y);
    y += 56;
    const signatoryName = String(input.signatoryName || '').trim();
    const signatoryTitle = String(input.signatoryTitle || '').trim();
    if (signatoryName) doc.font(bold).fontSize(10).fillColor(INK).text(signatoryName, left, y);
    if (signatoryTitle) doc.font(regular).fontSize(9).fillColor(MUTED).text(signatoryTitle, left, y + (signatoryName ? 14 : 0));

    doc.end();
  });
}
