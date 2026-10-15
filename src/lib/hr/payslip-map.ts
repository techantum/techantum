import type { SalaryStructure } from '../finance/salary.ts';
import { payslipTotals } from '../finance/salary.ts';
import { fromCents } from '../finance/money.ts';

export type PayrollPayslipInput = {
  grossPayableCents: number;
  additionalCents: number;
  lopDeductionCents: number;
  otherDeductionCents: number;
  professionalTaxCents: number;
  pfCents: number;
  netPayableCents: number;
};

function scaleComponent(amount: number, target: number, source: number) {
  if (source === 0) return 0;
  return Math.round((amount * target) / source);
}

/** Scale the existing earnings to the attendance gross, then add any extra earning once. */
export function earningsForPayroll(structure: SalaryStructure, proratedGrossCents: number, additionalCents: number) {
  const target = proratedGrossCents;
  let basic = scaleComponent(structure.basicCents, target, structure.monthlyGrossCents);
  let hra = scaleComponent(structure.hraCents, target, structure.monthlyGrossCents);
  let convenience = scaleComponent(structure.convenienceCents, target, structure.monthlyGrossCents);
  let leaveEncashment = scaleComponent(structure.leaveEncashmentCents, target, structure.monthlyGrossCents);
  let pda = scaleComponent(structure.pdaCents, target, structure.monthlyGrossCents);
  let special = target - basic - hra - convenience - leaveEncashment - pda;
  if (special < 0) {
    const reduce = Math.min(convenience, -special);
    convenience -= reduce;
    special += reduce;
  }
  if (special < 0) {
    basic += special;
    special = 0;
  }
  special += additionalCents;
  return {
    ...structure,
    monthlyGrossCents: target + additionalCents,
    basicCents: basic,
    hraCents: hra,
    convenienceCents: convenience,
    leaveEncashmentCents: leaveEncashment,
    pdaCents: pda,
    specialAllowanceCents: special,
    professionalTaxCents: structure.professionalTaxCents,
    pfCents: structure.pfCents,
  };
}

export function figuresForApprovedPayroll(structure: SalaryStructure, payroll: PayrollPayslipInput) {
  const attendanceGross = payroll.grossPayableCents + payroll.lopDeductionCents;
  const next = earningsForPayroll(structure, attendanceGross, payroll.additionalCents);
  next.professionalTaxCents = payroll.professionalTaxCents;
  next.pfCents = payroll.pfCents;
  const totals = payslipTotals(next, fromCents(payroll.lopDeductionCents), fromCents(payroll.otherDeductionCents));
  if (totals.netCents !== payroll.netPayableCents) {
    throw new Error('Payslip net pay does not match the approved payroll');
  }
  return { structure: next, ...totals };
}
