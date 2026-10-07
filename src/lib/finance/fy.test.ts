import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { financialYearFromDate, formatFinancialYear, parseFinancialYear, resolvePeriod } from './fy.ts';

describe('Indian financial year', () => {
  it('maps 1 Apr 2026 – 31 Mar 2027 to 2026-27', () => {
    const fy = financialYearFromDate('2026-04-01');
    assert.equal(fy.label, '2026-27');
    assert.equal(fy.shortLabel, '26-27');
    assert.equal(fy.start, '2026-04-01');
    assert.equal(fy.end, '2027-03-31');
    assert.equal(financialYearFromDate('2027-03-31').label, '2026-27');
    assert.equal(financialYearFromDate('2026-03-31').label, '2025-26');
  });

  it('formats short and full labels from one helper', () => {
    assert.equal(formatFinancialYear('2026-10-07', 'short'), '26-27');
    assert.equal(formatFinancialYear('2026-10-07', 'full'), '2026-27');
  });

  it('parses FY labels and rejects mismatched years', () => {
    const fy = parseFinancialYear('2026-27');
    assert.equal(fy.from, '2026-04-01');
    assert.equal(fy.to, '2027-03-31');
    assert.throws(() => parseFinancialYear('2026-28'));
  });

  it('resolves current month and FY filters', () => {
    const month = resolvePeriod({ kind: 'current_month' }, new Date('2026-10-07T00:00:00'));
    assert.equal(month.from, '2026-10-01');
    assert.equal(month.to, '2026-10-31');
    const fy = resolvePeriod({ kind: 'financial_year', fy: '2026-27' });
    assert.equal(fy.from, '2026-04-01');
    assert.equal(fy.to, '2027-03-31');
  });
});
