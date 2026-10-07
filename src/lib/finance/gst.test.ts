import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isIntraState, parseGstRate, resolveTaxSplit, taxOn } from './gst.ts';

describe('GST split', () => {
  it('uses CGST+SGST in the same state and IGST otherwise', () => {
    assert.equal(isIntraState('36', '36'), true);
    assert.equal(isIntraState('36', 'Telangana'), true);
    assert.equal(isIntraState('36', '27'), false);
    assert.equal(resolveTaxSplit('auto', '36', '36'), 'cgst_sgst');
    assert.equal(resolveTaxSplit('auto', '36', '27'), 'igst');
    assert.equal(resolveTaxSplit('igst', '36', '36'), 'igst');
  });

  it('splits odd paise onto SGST and supports multiple rates', () => {
    assert.deepEqual(taxOn(10005, 18, 'cgst_sgst'), { cgst: 900, sgst: 901, igst: 0, tax: 1801 });
    assert.equal(taxOn(100000, 5, 'igst').igst, 5000);
    assert.equal(taxOn(100000, 28, 'igst').igst, 28000);
    assert.equal(parseGstRate(12), 12);
    assert.throws(() => parseGstRate(9));
  });
});
