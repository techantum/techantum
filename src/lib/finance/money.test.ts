import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatINR, fromCents, lineGrossCents, toCents } from './money.ts';

describe('money paise arithmetic', () => {
  it('parses rupees without floating error', () => {
    assert.equal(toCents('100.10'), 10010);
    assert.equal(toCents(18), 1800);
    assert.equal(fromCents(10010), '100.10');
    assert.equal(formatINR(150050, true), '₹1,500.50');
  });

  it('computes decimal quantity × rate in integer paise', () => {
    assert.equal(lineGrossCents(1.5, '1000'), 150000);
    assert.equal(lineGrossCents(0.333, '100'), 3330);
  });
});
