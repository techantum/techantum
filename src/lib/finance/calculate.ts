import { FinanceValidationError } from './errors.ts';
import { parseGstRate, resolveTaxSplit, taxOn, type TaxTreatment } from './gst.ts';
import { fromCents, lineGrossCents, parseQuantity, parseRate, toCents } from './money.ts';

export interface InvoiceItemInput {
  description?: string;
  sac_hsn?: string;
  quantity: number | string;
  rate: number | string;
  discount_percentage?: number | string | null;
  discount_amount?: number | string | null;
  gst_rate: number | string;
  service_id?: string | null;
}

export interface CalculatedInvoiceItem {
  description: string;
  sac_hsn: string | null;
  service_id: string | null;
  quantity: number;
  rate: string;
  discount_percentage: string;
  discount_amount: string;
  taxable_amount: string;
  gst_rate: string;
  cgst: string;
  sgst: string;
  igst: string;
  total_amount: string;
  taxable_cents: number;
  cgst_cents: number;
  sgst_cents: number;
  igst_cents: number;
  total_cents: number;
}

export interface InvoiceCalculation {
  items: CalculatedInvoiceItem[];
  subtotal: string;
  discount: string;
  taxable_amount: string;
  cgst: string;
  sgst: string;
  igst: string;
  round_off: string;
  total_amount: string;
  tax_split: 'cgst_sgst' | 'igst' | 'none';
  subtotal_cents: number;
  discount_cents: number;
  taxable_cents: number;
  cgst_cents: number;
  sgst_cents: number;
  igst_cents: number;
  round_off_cents: number;
  total_cents: number;
}

function parseDiscountPercent(value: unknown): number {
  if (value == null || value === '') return 0;
  const n = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isFinite(n) || n < 0 || n > 100) {
    throw new FinanceValidationError('Discount percentage must be between 0 and 100');
  }
  return n;
}

export function calculateInvoice(input: {
  items: InvoiceItemInput[];
  supplierStateCode: string;
  placeOfSupplyStateCode: string;
  taxTreatment?: TaxTreatment;
  roundOff?: number | string | null;
}): InvoiceCalculation {
  if (!input.items?.length) throw new FinanceValidationError('At least one invoice item is required', [{ field: 'items', message: 'At least one invoice item is required' }]);

  const split = resolveTaxSplit(input.taxTreatment || 'auto', input.supplierStateCode, input.placeOfSupplyStateCode);
  const items: CalculatedInvoiceItem[] = [];
  let subtotalCents = 0;
  let discountCents = 0;
  let taxableCents = 0;
  let cgstCents = 0;
  let sgstCents = 0;
  let igstCents = 0;

  input.items.forEach((raw, index) => {
    const description = String(raw.description || '').trim();
    if (!description) {
      throw new FinanceValidationError(`Item ${index + 1} description is required`, [
        { field: `items.${index}.description`, message: 'Description is required' },
      ]);
    }
    const quantity = parseQuantity(raw.quantity);
    const rate = parseRate(raw.rate);
    const gstRate = parseGstRate(raw.gst_rate);
    const gross = lineGrossCents(quantity, rate);
    const pct = parseDiscountPercent(raw.discount_percentage);
    let discount = raw.discount_amount != null && raw.discount_amount !== '' ? toCents(raw.discount_amount) : Math.round((gross * toCents(pct)) / 10000);
    if (discount < 0) throw new FinanceValidationError(`Item ${index + 1} discount cannot be negative`);
    if (discount > gross) throw new FinanceValidationError(`Item ${index + 1} discount cannot exceed line amount`);
    const taxable = gross - discount;
    const tax = taxOn(taxable, gstRate, split);
    const total = taxable + tax.tax;
    subtotalCents += gross;
    discountCents += discount;
    taxableCents += taxable;
    cgstCents += tax.cgst;
    sgstCents += tax.sgst;
    igstCents += tax.igst;
    items.push({
      description,
      sac_hsn: String(raw.sac_hsn || '').trim() || null,
      service_id: raw.service_id || null,
      quantity,
      rate: fromCents(toCents(rate)),
      discount_percentage: pct.toFixed(3).replace(/0+$/, '').replace(/\.$/, '') || '0',
      discount_amount: fromCents(discount),
      taxable_amount: fromCents(taxable),
      gst_rate: fromCents(toCents(gstRate)),
      cgst: fromCents(tax.cgst),
      sgst: fromCents(tax.sgst),
      igst: fromCents(tax.igst),
      total_amount: fromCents(total),
      taxable_cents: taxable,
      cgst_cents: tax.cgst,
      sgst_cents: tax.sgst,
      igst_cents: tax.igst,
      total_cents: total,
    });
  });

  const unrounded = taxableCents + cgstCents + sgstCents + igstCents;
  let roundOffCents: number;
  if (input.roundOff == null || input.roundOff === '') {
    roundOffCents = Math.round(unrounded / 100) * 100 - unrounded;
  } else {
    roundOffCents = toCents(input.roundOff);
    if (Math.abs(roundOffCents) >= 100) {
      throw new FinanceValidationError('Round off must be between -0.99 and 0.99');
    }
  }
  const totalCents = unrounded + roundOffCents;

  return {
    items,
    subtotal: fromCents(subtotalCents),
    discount: fromCents(discountCents),
    taxable_amount: fromCents(taxableCents),
    cgst: fromCents(cgstCents),
    sgst: fromCents(sgstCents),
    igst: fromCents(igstCents),
    round_off: fromCents(roundOffCents),
    total_amount: fromCents(totalCents),
    tax_split: split,
    subtotal_cents: subtotalCents,
    discount_cents: discountCents,
    taxable_cents: taxableCents,
    cgst_cents: cgstCents,
    sgst_cents: sgstCents,
    igst_cents: igstCents,
    round_off_cents: roundOffCents,
    total_cents: totalCents,
  };
}

export function invoiceOutstandingCents(params: {
  totalCents: number;
  receivedCents: number;
  tdsCents: number;
  otherDeductionCents: number;
}) {
  return params.totalCents - params.receivedCents - params.tdsCents - params.otherDeductionCents;
}

export function paymentStatusFor(outstandingCents: number, receivedPlusDeductions: number, dueDate: string | null, today: string) {
  if (outstandingCents <= 0) return 'paid' as const;
  if (dueDate && dueDate < today && outstandingCents > 0) return 'overdue' as const;
  if (receivedPlusDeductions > 0) return 'partially_paid' as const;
  return 'unpaid' as const;
}

export function expensePaymentStatus(totalCents: number, paidCents: number) {
  if (paidCents <= 0) return 'unpaid' as const;
  if (paidCents >= totalCents) return 'paid' as const;
  return 'partially_paid' as const;
}
