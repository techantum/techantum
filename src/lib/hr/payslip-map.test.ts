import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { salaryFromAnnualCtc } from '../finance/salary.ts';
import { calculatePay } from './engine.ts';
import { figuresForApprovedPayroll } from './payslip-map.ts';

describe('payslip mapping', () => {
  it('keeps the payslip net equal to approved payroll for a full month and a partial month', () => {
    const structure = salaryFromAnnualCtc('360000');
    const full = calculatePay({
      monthlyGrossCents: structure.monthlyGrossCents,
      companyWorkingDays: 22,
      eligibleWorkingDays: 22,
      workedDays: 20,
      allowedPaidDays: 0,
      lopDays: 2,
      professionalTaxCents: structure.professionalTaxCents,
      pfCents: 0,
    });
    const mapped = figuresForApprovedPayroll(structure, {
      grossPayableCents: full.grossPayableCents,
      additionalCents: 0,
      lopDeductionCents: full.lopDeductionCents,
      otherDeductionCents: 0,
      professionalTaxCents: full.professionalTaxCents,
      pfCents: 0,
      netPayableCents: full.netPayableCents,
    });
    assert.equal(mapped.netCents, full.netPayableCents);
    assert.equal(mapped.lopCents, full.lopDeductionCents);
    assert.equal(
      mapped.structure.basicCents +
        mapped.structure.hraCents +
        mapped.structure.specialAllowanceCents +
        mapped.structure.convenienceCents,
      structure.monthlyGrossCents
    );

    const partial = calculatePay({
      monthlyGrossCents: structure.monthlyGrossCents,
      companyWorkingDays: 22,
      eligibleWorkingDays: 11,
      workedDays: 10,
      allowedPaidDays: 0,
      lopDays: 1,
      professionalTaxCents: 0,
      additionalCents: 50_000,
      otherDeductionCents: 20_000,
    });
    const partialMap = figuresForApprovedPayroll(structure, {
      grossPayableCents: partial.grossPayableCents,
      additionalCents: partial.additionalCents,
      lopDeductionCents: partial.lopDeductionCents,
      otherDeductionCents: partial.otherDeductionCents,
      professionalTaxCents: partial.professionalTaxCents,
      pfCents: 0,
      netPayableCents: partial.netPayableCents,
    });
    assert.equal(partialMap.netCents, partial.netPayableCents);
    assert.equal(partialMap.grossDeductionCents, partial.lopDeductionCents + partial.otherDeductionCents);
  });
});
