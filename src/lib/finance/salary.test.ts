import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { daysInMonth, payslipAmountInWords, payslipTotals, salaryFromAnnualCtc } from './salary.ts';

describe('CTC payslip structure', () => {
  it('splits the reference annual CTC the way the sample payslip does', () => {
    const salary = salaryFromAnnualCtc('360000');
    assert.equal(salary.monthlyGrossCents, 3_000_000);
    assert.equal(salary.basicCents, 1_500_000);
    assert.equal(salary.hraCents, 600_000);
    assert.equal(salary.specialAllowanceCents, 700_000);
    assert.equal(salary.convenienceCents, 200_000);
    assert.equal(salary.pdaCents, 0);
    assert.equal(salary.leaveEncashmentCents, 0);
    assert.equal(salary.professionalTaxCents, 20_000);
    assert.equal(salary.pfCents, 0);
    assert.equal(salary.basicAnnualCents, 18_000_000);
    assert.equal(salary.hraAnnualCents, 7_200_000);
    assert.equal(salary.specialAnnualCents, 8_400_000);
    assert.equal(salary.convenienceAnnualCents, 2_400_000);

    const totals = payslipTotals(salary, '4000');
    assert.equal(totals.grossDeductionCents, 420_000);
    assert.equal(totals.netCents, 2_580_000);
    assert.equal(payslipAmountInWords(totals.netCents), 'Rupees Twenty Five Thousand Eight Hundred Only');
  });

  it('uses Telangana professional tax slabs', () => {
    assert.equal(salaryFromAnnualCtc('180000').professionalTaxCents, 0);
    assert.equal(salaryFromAnnualCtc('216000').professionalTaxCents, 15_000);
    assert.equal(salaryFromAnnualCtc('240000').professionalTaxCents, 15_000);
    assert.equal(salaryFromAnnualCtc('240012').professionalTaxCents, 20_000);
  });

  it('keeps monthly earnings equal to CTC divided by twelve', () => {
    const salary = salaryFromAnnualCtc('100000');
    const sum =
      salary.basicCents + salary.hraCents + salary.specialAllowanceCents + salary.convenienceCents + salary.pdaCents;
    assert.equal(sum, salary.monthlyGrossCents);
    assert.equal(daysInMonth(2026, 8), 31);
    assert.equal(daysInMonth(2026, 2), 28);
  });

  it('rejects an LOP deduction larger than take-home', () => {
    const salary = salaryFromAnnualCtc('360000');
    assert.throws(() => payslipTotals(salary, '30000'), /higher than earnings/);
  });
});
