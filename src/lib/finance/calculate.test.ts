import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { calculateInvoice, invoiceOutstandingCents, paymentStatusFor } from './calculate.ts';

describe('invoice calculation', () => {
  it('calculates intra-state GST, discounts and nearest-rupee round off on the server', () => {
    const calc = calculateInvoice({
      items: [{ description: 'Website Development', quantity: 1, rate: '10000', gst_rate: 18, discount_percentage: 10 }],
      supplierStateCode: '36',
      placeOfSupplyStateCode: '36',
    });
    assert.equal(calc.subtotal, '10000.00');
    assert.equal(calc.discount, '1000.00');
    assert.equal(calc.taxable_amount, '9000.00');
    assert.equal(calc.cgst, '810.00');
    assert.equal(calc.sgst, '810.00');
    assert.equal(calc.igst, '0.00');
    assert.equal(calc.total_amount, '10620.00');
  });

  it('applies IGST when place of supply differs', () => {
    const calc = calculateInvoice({
      items: [{ description: 'Hosting', quantity: '2', rate: '500', gst_rate: '18' }],
      supplierStateCode: '36',
      placeOfSupplyStateCode: '27',
    });
    assert.equal(calc.taxable_amount, '1000.00');
    assert.equal(calc.igst, '180.00');
    assert.equal(calc.cgst, '0.00');
    assert.equal(calc.total_amount, '1180.00');
  });

  it('settles TDS so it does not remain outstanding', () => {
    const outstanding = invoiceOutstandingCents({ totalCents: 118000, receivedCents: 106200, tdsCents: 11800, otherDeductionCents: 0 });
    assert.equal(outstanding, 0);
    assert.equal(paymentStatusFor(0, 118000, '2026-09-01', '2026-10-07'), 'paid');
    assert.equal(paymentStatusFor(100, 0, '2026-09-01', '2026-10-07'), 'overdue');
  });
});
