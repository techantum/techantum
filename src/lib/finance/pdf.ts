import PDFDocument from 'pdfkit';
import { existsSync } from 'fs';
import { formatINR, toCents } from './money';
import { absoluteFinancePath } from './storage';
import type { FinanceSettings } from './settings';
import { stateName } from './gst';

function money(value: unknown) {
  return formatINR(toCents(value));
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

export async function generateInvoicePdf(
  invoice: Record<string, unknown>,
  items: Record<string, unknown>[],
  settings: FinanceSettings
): Promise<Buffer> {
  const snapshot = (invoice.company_snapshot || {}) as Record<string, unknown>;
  const companyName = String(snapshot.company_name || settings.company_name);
  const companyGstin = String(snapshot.gstin || settings.gstin || '');
  const companyPan = String(snapshot.pan || settings.pan || '');
  const companyAddr = String(snapshot.address || settings.billing_address || settings.registered_address || '');

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const width = doc.page.width - 80;
    let y = 40;

    if (settings.show_logo) {
      const logo = tryImage(settings.logo_path);
      if (logo) {
        try {
          doc.image(logo, 40, y, { height: 48 });
        } catch {
          /* skip */
        }
      }
    }

    doc.font('Helvetica-Bold').fontSize(16).fillColor('#0f172a').text(companyName, 40, y, { width, align: 'right' });
    y += 22;
    doc.font('Helvetica').fontSize(8).fillColor('#475569').text(companyAddr, 40, y, { width, align: 'right' });
    y += 24;
    if (companyGstin) doc.text(`GSTIN: ${companyGstin}`, 40, y, { width, align: 'right' });
    y += 12;
    if (settings.show_pan && companyPan) doc.text(`PAN: ${companyPan}`, 40, y, { width, align: 'right' });
    y += 18;

    doc.moveTo(40, y).lineTo(555, y).strokeColor('#fb923c').lineWidth(2).stroke();
    y += 14;
    doc.font('Helvetica-Bold').fontSize(18).fillColor('#0f172a').text('TAX INVOICE', 40, y);
    y += 28;

    const left = [
      ['Invoice No.', String(invoice.invoice_number || 'DRAFT')],
      ['Invoice Date', String(invoice.invoice_date || '')],
    ];
    if (settings.show_due_date && invoice.due_date) left.push(['Due Date', String(invoice.due_date)]);
    if (settings.show_po && invoice.purchase_order_number) left.push(['PO Number', String(invoice.purchase_order_number)]);
    if (invoice.work_order_number) left.push(['Work Order', String(invoice.work_order_number)]);
    if (settings.show_project && invoice.project_name) left.push(['Project', String(invoice.project_name)]);

    left.forEach((row, i) => {
      doc.font('Helvetica').fontSize(8).fillColor('#64748b').text(row[0], 40, y + i * 14, { width: 80 });
      doc.font('Helvetica-Bold').fillColor('#0f172a').text(row[1], 120, y + i * 14, { width: 160 });
    });

    doc.font('Helvetica').fontSize(8).fillColor('#64748b').text('Bill To', 320, y);
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f172a').text(String(invoice.client_name || ''), 320, y + 12, { width: 235 });
    const addr = [invoice.client_address, invoice.client_city, invoice.client_state, invoice.client_pincode]
      .filter(Boolean)
      .join(', ');
    doc.font('Helvetica').fontSize(8).fillColor('#334155').text(addr, 320, y + 26, { width: 235 });
    let cy = y + 50;
    if (settings.show_client_gstin && invoice.client_gstin) {
      doc.text(`GSTIN: ${invoice.client_gstin}`, 320, cy, { width: 235 });
      cy += 12;
    }
    if (invoice.client_pan) {
      doc.text(`PAN: ${invoice.client_pan}`, 320, cy, { width: 235 });
      cy += 12;
    }
    const pos = String(invoice.place_of_supply || stateName(String(invoice.place_of_supply_state_code || '')) || '');
    if (pos) doc.text(`Place of Supply: ${pos}`, 320, cy, { width: 235 });

    y = Math.max(y + left.length * 14, cy) + 20;

    const showSac = settings.show_sac;
    const cols = showSac
      ? [
          { x: 40, w: 22, h: '#' },
          { x: 62, w: 150, h: 'Description' },
          { x: 212, w: 50, h: 'SAC/HSN' },
          { x: 262, w: 36, h: 'Qty' },
          { x: 298, w: 54, h: 'Rate' },
          { x: 352, w: 50, h: 'Taxable' },
          { x: 402, w: 42, h: 'CGST' },
          { x: 444, w: 42, h: 'SGST' },
          { x: 486, w: 42, h: 'IGST' },
          { x: 528, w: 27, h: 'Total' },
        ]
      : [
          { x: 40, w: 22, h: '#' },
          { x: 62, w: 188, h: 'Description' },
          { x: 250, w: 40, h: 'Qty' },
          { x: 290, w: 58, h: 'Rate' },
          { x: 348, w: 54, h: 'Taxable' },
          { x: 402, w: 42, h: 'CGST' },
          { x: 444, w: 42, h: 'SGST' },
          { x: 486, w: 42, h: 'IGST' },
          { x: 528, w: 27, h: 'Total' },
        ];

    doc.rect(40, y, 515, 18).fill('#0f172a');
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(7);
    cols.forEach((c) => doc.text(c.h, c.x, y + 5, { width: c.w }));
    y += 20;
    doc.fillColor('#0f172a').font('Helvetica').fontSize(7);

    items.forEach((item, idx) => {
      if (y > 720) {
        doc.addPage();
        y = 40;
      }
      const rowH = 22;
      if (idx % 2 === 0) doc.rect(40, y - 2, 515, rowH).fill('#f8fafc');
      doc.fillColor('#0f172a');
      const cells = showSac
        ? [
            String(idx + 1),
            String(item.description || ''),
            String(item.sac_hsn || ''),
            String(item.quantity),
            money(item.rate),
            money(item.taxable_amount),
            money(item.cgst),
            money(item.sgst),
            money(item.igst),
            money(item.total_amount),
          ]
        : [
            String(idx + 1),
            String(item.description || ''),
            String(item.quantity),
            money(item.rate),
            money(item.taxable_amount),
            money(item.cgst),
            money(item.sgst),
            money(item.igst),
            money(item.total_amount),
          ];
      cells.forEach((val, i) => doc.text(val, cols[i].x, y, { width: cols[i].w }));
      y += rowH;
    });

    y += 8;
    const totals = [
      ['Taxable', money(invoice.taxable_amount)],
      ['CGST', money(invoice.cgst)],
      ['SGST', money(invoice.sgst)],
      ['IGST', money(invoice.igst)],
      ['Round off', money(invoice.round_off)],
      ['Grand Total', money(invoice.total_amount)],
    ];
    totals.forEach((row, i) => {
      const isLast = i === totals.length - 1;
      doc.font(isLast ? 'Helvetica-Bold' : 'Helvetica').fontSize(isLast ? 10 : 8);
      doc.fillColor('#475569').text(row[0], 360, y, { width: 80 });
      doc.fillColor('#0f172a').text(row[1], 440, y, { width: 115, align: 'right' });
      y += isLast ? 16 : 13;
    });

    y += 8;
    if (settings.show_bank_details) {
      doc.font('Helvetica-Bold').fontSize(9).text('Bank Details', 40, y);
      y += 14;
      doc.font('Helvetica').fontSize(8).fillColor('#334155');
      const bank = [
        settings.bank_name && `Bank: ${settings.bank_name}`,
        settings.account_name && `A/c Name: ${settings.account_name}`,
        settings.account_number && `A/c No: ${settings.account_number}`,
        settings.ifsc && `IFSC: ${settings.ifsc}`,
        settings.branch && `Branch: ${settings.branch}`,
        settings.upi_id && `UPI: ${settings.upi_id}`,
      ].filter(Boolean) as string[];
      bank.forEach((line) => {
        doc.text(line, 40, y);
        y += 11;
      });
    }

    if (settings.show_qr) {
      const qr = tryImage(settings.payment_qr_path);
      if (qr) {
        try {
          doc.image(qr, 430, y - 70, { width: 70, height: 70 });
        } catch {
          /* skip */
        }
      }
    }

    if (settings.show_terms && (invoice.terms || settings.default_terms)) {
      y += 8;
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#0f172a').text('Terms', 40, y);
      y += 12;
      doc.font('Helvetica').fontSize(8).fillColor('#475569').text(String(invoice.terms || settings.default_terms), 40, y, { width: 360 });
      y += 32;
    }
    if (settings.show_notes && invoice.notes) {
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#0f172a').text('Notes', 40, y);
      y += 12;
      doc.font('Helvetica').fontSize(8).fillColor('#475569').text(String(invoice.notes), 40, y, { width: 360 });
      y += 24;
    }

    const sigY = Math.max(y, 720);
    if (settings.show_signature) {
      const sig = tryImage(settings.signature_path);
      if (sig) {
        try {
          doc.image(sig, 400, sigY, { height: 40 });
        } catch {
          /* skip */
        }
      }
      doc.font('Helvetica').fontSize(8).fillColor('#0f172a').text('Authorized Signatory', 400, sigY + 44, { width: 140 });
    }
    if (settings.show_seal) {
      const seal = tryImage(settings.seal_path);
      if (seal) {
        try {
          doc.image(seal, 40, sigY, { height: 50 });
        } catch {
          /* skip */
        }
      }
    }

    doc.fontSize(7).fillColor('#94a3b8').text('This is an internally generated invoice for Techantum operations.', 40, 810, {
      width: 515,
      align: 'center',
    });
    doc.end();
  });
}
