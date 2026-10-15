import PDFDocument from 'pdfkit';
import { existsSync } from 'fs';
import path from 'path';
import { q } from './db';
import { formatINR, rupeesInWords, toCents } from './money';
import { absoluteFinancePath } from './storage';
import type { FinanceSettings } from './settings';

const FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
const FONT_BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';

const INK = '#1a1a1a';
const MUTED = '#3f3f46';
const LINE = '#b7c0cc';
const BAR = '#e7eef6';
const HEAD = '#f3f5f8';

function plainAmount(value: unknown) {
  return formatINR(toCents(value), false);
}

function rupee(value: unknown) {
  return `₹ ${formatINR(toCents(value), false)}`;
}

function rupeeCents(cents: number) {
  return `₹ ${formatINR(cents, false)}`;
}

function tryImage(pathValue: string | null | undefined) {
  if (!pathValue) return null;
  try {
    const full = absoluteFinancePath(pathValue);
    return existsSync(full) ? full : null;
  } catch {
    return null;
  }
}

function fullCompanyName(snapshot: Record<string, unknown>, settings: FinanceSettings) {
  const snap = String(snapshot.company_name || '').trim();
  const current = String(settings.company_name || '').trim();
  if (!snap) return current || 'Techantum Solutions';
  if (current.length > snap.length && current.toLowerCase().startsWith(snap.toLowerCase())) return current;
  return snap;
}

function plainDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, '0');
    const d = String(value.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const text = String(value ?? '').trim();
  const iso = text.match(/^(\d{4}-\d{2}-\d{2})/);
  return iso ? iso[1] : text;
}

function qtyLabel(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value ?? '');
  return String(n);
}

function percentLabel(value: number) {
  const rounded = Math.round(value * 100) / 100;
  return String(rounded).replace(/\.0$/, '');
}

function contains(haystack: string, needle: string) {
  return Boolean(needle) && haystack.toLowerCase().includes(needle.toLowerCase());
}

function cmsLogoFile(logoUrl: string | null | undefined) {
  if (!logoUrl) return null;
  try {
    const pathname = logoUrl.startsWith('http') ? new URL(logoUrl).pathname : logoUrl;
    const rel = pathname.replace(/^\/+/, '');
    const root = path.resolve(process.cwd(), 'public');
    const full = path.resolve(root, rel);
    if (full !== root && !full.startsWith(`${root}${path.sep}`)) return null;
    return existsSync(full) ? full : null;
  } catch {
    return null;
  }
}

async function loadSiteBranding() {
  try {
    const { rows } = await q<{
      company_name: string | null;
      tagline: string | null;
      logo_url: string | null;
      phone: string | null;
      email: string | null;
      address: string | null;
    }>(undefined, 'SELECT company_name, tagline, logo_url, phone, email, address FROM site_branding WHERE id = 1');
    return rows[0] || null;
  } catch {
    return null;
  }
}

function partyLines(invoice: Record<string, unknown>) {
  const address = String(invoice.client_address || '').trim();
  const city = String(invoice.client_city || '').trim();
  const state = String(invoice.client_state || '').trim();
  const pin = String(invoice.client_pincode || '').trim();
  const lines = [String(invoice.client_name || '').trim()].filter(Boolean);
  if (address) lines.push(address);
  const locality = [city, state].filter(Boolean).join(', ');
  const localityLine = [locality, pin].filter(Boolean).join(' ');
  if (localityLine && !contains(address, city) && !contains(address, pin)) lines.push(localityLine);
  const phone = String(invoice.client_phone || '').trim();
  if (phone) lines.push(`Ph: ${phone}`);
  return lines;
}

export async function generateInvoicePdf(
  invoice: Record<string, unknown>,
  items: Record<string, unknown>[],
  settings: FinanceSettings
): Promise<Buffer> {
  const branding = await loadSiteBranding();
  const snapshot = (invoice.company_snapshot || {}) as Record<string, unknown>;
  const companyName = String(branding?.company_name || '').trim() || fullCompanyName(snapshot, settings);
  const companyGstin = String(snapshot.gstin || settings.gstin || '').trim();
  const companyPan = String(snapshot.pan || settings.pan || '').trim();
  const companyCin = String(snapshot.cin || settings.cin || '').trim();
  const companyAddr = String(branding?.address || snapshot.address || settings.billing_address || settings.registered_address || '').trim();
  const companyPhone = String(branding?.phone || snapshot.phone || settings.phone || '').trim();
  const companyEmail = String(branding?.email || snapshot.email || settings.email || '').trim();
  const logoFile = cmsLogoFile(branding?.logo_url) || (settings.show_logo ? tryImage(settings.logo_path) : null);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 24, bottom: 16, left: 28, right: 28 },
      bufferPages: true,
    });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const useDejaVu = existsSync(FONT) && existsSync(FONT_BOLD);
    if (useDejaVu) {
      doc.registerFont('Body', FONT);
      doc.registerFont('BodyBold', FONT_BOLD);
    }
    const regular = useDejaVu ? 'Body' : 'Helvetica';
    const bold = useDejaVu ? 'BodyBold' : 'Helvetica-Bold';

    const left = 28;
    const right = doc.page.width - 28;
    const width = right - left;
    const bottom = doc.page.height - 40;

    const strokeBox = (x: number, y: number, w: number, h: number) => {
      doc.save();
      doc.lineWidth(0.7).strokeColor(LINE).rect(x, y, w, h).stroke();
      doc.restore();
    };

    let y = 28;
    const logoBottom = y + 34;
    if (logoFile) {
      try {
        doc.image(logoFile, left, y, { fit: [132, 34], align: 'left', valign: 'center' });
      } catch {
        /* skip broken logo */
      }
    }

    const headerW = 250;
    const headerX = right - headerW;
    const companyLines = [
      String(branding?.tagline || '').trim(),
      companyAddr,
      [companyPhone, companyEmail].filter(Boolean).join('  ·  '),
      companyGstin ? `GSTIN: ${companyGstin}` : '',
      settings.show_pan && companyPan ? `PAN: ${companyPan}` : '',
      companyCin ? `CIN: ${companyCin}` : '',
    ].filter(Boolean);
    doc.font(bold).fontSize(11).fillColor(INK);
    const nameH = doc.heightOfString(companyName, { width: headerW, align: 'right' });
    doc.text(companyName, headerX, y, { width: headerW, align: 'right' });
    let hy = y + nameH + 2;
    doc.font(regular).fontSize(8).fillColor(MUTED);
    companyLines.forEach((line) => {
      const h = doc.heightOfString(line, { width: headerW, align: 'right' });
      doc.text(line, headerX, hy, { width: headerW, align: 'right' });
      hy += h + 1;
    });
    y = Math.max(logoBottom, hy) + 16;

    doc.font(bold).fontSize(16).fillColor(INK).text('Invoice', left, y, { lineBreak: false });
    y += 20;
    doc.font(regular).fontSize(9).fillColor(MUTED).text(`Invoice number: ${invoice.invoice_number || 'DRAFT'}`, left, y, { lineBreak: false });
    y += 22;

    const party = partyLines(invoice);
    if (invoice.client_gstin) party.push(`GSTIN: ${String(invoice.client_gstin)}`);
    const metaRows = [
      ['Invoice date', plainDate(invoice.invoice_date)],
      invoice.payment_mode ? ['Payment mode', String(invoice.payment_mode)] : null,
      invoice.default_payment_terms || invoice.payment_terms ? ['Payment terms', String(invoice.default_payment_terms || invoice.payment_terms)] : null,
      settings.show_project && invoice.project_name ? ['Project', String(invoice.project_name)] : null,
      invoice.place_of_supply ? ['Place of supply', String(invoice.place_of_supply)] : null,
    ].filter(Boolean) as [string, string][];

    const billW = width * 0.56;
    doc.font(bold).fontSize(8).fillColor(INK).text('Bill to', left, y, { lineBreak: false });
    let by = y + 14;
    party.forEach((line, index) => {
      doc.font(index === 0 ? bold : regular).fontSize(9).fillColor(index === 0 ? INK : MUTED);
      const h = doc.heightOfString(line, { width: billW });
      doc.text(line, left, by, { width: billW });
      by += h + 1;
    });
    metaRows.forEach((row, index) => {
      const ry = y + index * 14;
      doc.font(regular).fontSize(8).fillColor(MUTED).text(row[0], left + billW + 12, ry, { width: 88, lineBreak: false });
      doc.font(bold).fontSize(8).fillColor(INK).text(row[1], left + billW + 100, ry, {
        width: width - billW - 100,
        align: 'right',
        lineBreak: false,
        ellipsis: true,
      });
    });
    y = Math.max(by, y + metaRows.length * 14) + 16;

    const cols = [
      { label: 'S.No', w: 36, align: 'center' as const },
      { label: 'DESCRIPTION', w: width - 36 - 78 - 42 - 68 - 78, align: 'left' as const },
      { label: 'HSN', w: 78, align: 'center' as const },
      { label: 'QTY', w: 42, align: 'right' as const },
      { label: 'RATE', w: 68, align: 'right' as const },
      { label: 'AMOUNT', w: 78, align: 'right' as const },
    ];

    const paintHead = () => {
      doc.rect(left, y, width, 16).fill(HEAD);
      strokeBox(left, y, width, 16);
      doc.font(bold).fontSize(7.5).fillColor(INK);
      let x = left;
      cols.forEach((col) => {
        doc.text(col.label, x + 3, y + 4, { width: col.w - 6, align: col.align, lineBreak: false });
        x += col.w;
      });
      y += 16;
    };

    const ensure = (needed: number) => {
      if (y + needed <= bottom) return;
      doc.addPage();
      y = 28;
      paintHead();
    };

    paintHead();

    items.forEach((item, index) => {
      const cells = [
        String(index + 1),
        String(item.description || ''),
        String(item.sac_hsn || ''),
        qtyLabel(item.quantity),
        plainAmount(item.rate),
        plainAmount(item.taxable_amount || item.total_amount),
      ];
      doc.font(regular).fontSize(8);
      const rowH = Math.max(16, doc.heightOfString(cells[1], { width: cols[1].w - 8 }) + 8);
      ensure(rowH);
      strokeBox(left, y, width, rowH);
      let x = left;
      cells.forEach((value, i) => {
        doc.font(regular).fontSize(8).fillColor(INK).text(value, x + 4, y + 4, { width: cols[i].w - 8, align: cols[i].align });
        if (i < cells.length - 1) {
          doc.moveTo(x + cols[i].w, y).lineTo(x + cols[i].w, y + rowH).strokeColor(LINE).lineWidth(0.6).stroke();
        }
        x += cols[i].w;
      });
      y += rowH;
    });

    const taxable = toCents(invoice.taxable_amount);
    const cgst = toCents(invoice.cgst);
    const sgst = toCents(invoice.sgst);
    const igst = toCents(invoice.igst);
    const roundOff = toCents(invoice.round_off);
    const subTotal = taxable + cgst + sgst + igst;
    const rates = [...new Set(items.map((item) => Number(item.gst_rate)).filter((n) => Number.isFinite(n) && n > 0))];
    const singleRate = rates.length === 1 ? rates[0] : null;
    const totals: [string, string, boolean][] = [['Subtotal', rupeeCents(taxable), false]];
    if (sgst || cgst) {
      const half = singleRate != null ? ` (${percentLabel(singleRate / 2)}%)` : '';
      totals.push([`SGST${half}`, rupeeCents(sgst), false], [`CGST${half}`, rupeeCents(cgst), false]);
    } else if (igst) {
      const full = singleRate != null ? ` (${percentLabel(singleRate)}%)` : '';
      totals.push([`Integrated GST${full}`, rupeeCents(igst), false]);
    } else if (subTotal !== taxable) {
      totals.push(['GST', rupeeCents(subTotal - taxable), false]);
    }
    if (roundOff) totals.push(['Round off', rupeeCents(roundOff), false]);
    totals.push(['Total', rupee(invoice.total_amount), true]);

    y += 4;
    ensure(totals.length * 15 + 8);
    totals.forEach((row) => {
      const rowH = row[2] ? 18 : 14;
      if (row[2]) doc.rect(left, y, width, rowH).fill(BAR);
      doc.font(row[2] ? bold : regular).fontSize(8).fillColor(INK);
      doc.text(row[0], left, y + 3, { width: width - 110, align: 'right', lineBreak: false });
      doc.text(row[1], right - 102, y + 3, { width: 94, align: 'right', lineBreak: false });
      y += rowH;
    });

    y += 8;
    const words = rupeesInWords(toCents(invoice.total_amount));
    doc.font(bold).fontSize(8).fillColor(INK);
    const wordH = doc.heightOfString(`Amount Chargeable (in words): ${words}`, { width });
    ensure(wordH + 8);
    doc.text(`Amount Chargeable (in words): ${words}`, left, y, { width });
    y += wordH + 10;

    const bankLines = [
      settings.account_name ? `A/c Name: ${settings.account_name}` : '',
      settings.bank_name ? `Bank: ${settings.bank_name}` : '',
      settings.branch ? `Branch: ${settings.branch}` : '',
      settings.account_number ? `A/c No.: ${settings.account_number}` : '',
      settings.ifsc ? `IFSC: ${settings.ifsc}` : '',
    ].filter(Boolean);
    const qr = settings.show_qr ? tryImage(settings.payment_qr_path) : null;
    const showBank = settings.show_bank_details !== false && bankLines.length > 0;
    const showQr = settings.show_qr !== false && Boolean(qr || settings.upi_id);
    if (showBank || showQr) {
      const blockH = Math.max(showBank ? 18 + bankLines.length * 11 + 8 : 0, showQr ? 108 : 0, 72);
      ensure(blockH + 8);
      const gap = 10;
      const leftW = showQr ? width * 0.62 : width;
      if (showBank) {
        strokeBox(left, y, leftW, blockH);
        doc.font(bold).fontSize(8).fillColor(INK).text('Bank Details', left + 8, y + 6, { width: leftW - 16, lineBreak: false });
        let by = y + 18;
        doc.font(regular).fontSize(8).fillColor(INK);
        bankLines.forEach((line) => {
          doc.text(line, left + 8, by, { width: leftW - 16, lineBreak: false });
          by += 11;
        });
      }
      if (showQr) {
        const qx = left + (showBank ? leftW + gap : 0);
        const qw = showBank ? width - leftW - gap : width;
        strokeBox(qx, y, qw, blockH);
        if (qr) {
          try {
            doc.image(qr, qx + (qw - 62) / 2, y + 8, { fit: [62, 62] });
          } catch {
            /* skip */
          }
        }
        doc.font(bold).fontSize(7.5).fillColor(INK).text('Scan to Pay (UPI)', qx + 6, y + (qr ? 74 : 16), {
          width: qw - 12,
          align: 'center',
          lineBreak: false,
        });
        if (settings.upi_id) {
          doc.font(regular).fontSize(7.5).text(settings.upi_id, qx + 6, y + (qr ? 86 : 30), {
            width: qw - 12,
            align: 'center',
            lineBreak: false,
          });
        }
      }
      y += blockH + 12;
    }

    ensure(70);
    doc.font(regular).fontSize(8).fillColor(INK).text(
      'We declare that this invoice shows the actual price of the services described and that all particulars are true and correct.',
      left,
      y,
      { width: width * 0.58 }
    );
    const signX = left + width * 0.62;
    const signW = width * 0.38;
    doc.font(bold).fontSize(8).text(`For ${companyName}`, signX, y, { width: signW, align: 'left' });
    const sig = settings.show_signature ? tryImage(settings.signature_path) : null;
    if (sig) {
      try {
        doc.image(sig, signX, y + 16, { fit: [90, 32] });
      } catch {
        /* skip */
      }
    }
    doc.font(regular).fontSize(8).fillColor(INK).text('Authorised Signatory', signX, y + (sig ? 52 : 36), { width: signW });

    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i += 1) {
      doc.switchToPage(i);
      doc.font(regular).fontSize(8).fillColor('#64748b').text('This is a computer-generated invoice.', left, doc.page.height - 28, {
        width,
        align: 'center',
        lineBreak: false,
      });
    }
    doc.end();
  });
}
