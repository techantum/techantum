import { FinanceValidationError } from './errors.ts';
import { fromCents, toCents } from './money.ts';

/** Fixed monthly convenience allowance from the company payslip structure. */
const CONVENIENCE_MONTHLY_CENTS = 200_000;
const CONVENIENCE_ANNUAL_CENTS = CONVENIENCE_MONTHLY_CENTS * 12;

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

export type SalaryStructure = {
  annualCtcCents: number;
  monthlyGrossCents: number;
  basicCents: number;
  hraCents: number;
  leaveEncashmentCents: number;
  specialAllowanceCents: number;
  pdaCents: number;
  convenienceCents: number;
  professionalTaxCents: number;
  pfCents: number;
  basicAnnualCents: number;
  hraAnnualCents: number;
  leaveEncashmentAnnualCents: number;
  specialAnnualCents: number;
  pdaAnnualCents: number;
  convenienceAnnualCents: number;
  professionalTaxAnnualCents: number;
  pfAnnualCents: number;
};

function monthlyShare(annualCents: number) {
  return Math.round(annualCents / 12);
}

/** Telangana professional tax on monthly gross, matching the Hyderabad payslip. */
export function professionalTaxCents(monthlyGrossCents: number) {
  if (monthlyGrossCents <= 1_500_000) return 0;
  if (monthlyGrossCents <= 2_000_000) return 15_000;
  return 20_000;
}

/**
 * Monthly earnings from annual CTC.
 * Basic 50% of CTC, HRA 40% of basic, convenience allowance ₹2,000,
 * special allowance takes the balance. PF and leave encashment stay zero
 * until payroll defines them. Professional tax is a deduction, not part of CTC.
 */
export function salaryFromAnnualCtc(annualCtc: unknown): SalaryStructure {
  const annualCtcCents = toCents(annualCtc);
  if (annualCtcCents <= 0) throw new FinanceValidationError('Annual CTC must be greater than 0');

  const basicAnnualCents = Math.round(annualCtcCents * 0.5);
  const hraAnnualCents = Math.round(basicAnnualCents * 0.4);
  const remainingAnnual = annualCtcCents - basicAnnualCents - hraAnnualCents;
  const convenienceAnnualCents = Math.min(CONVENIENCE_ANNUAL_CENTS, Math.max(0, remainingAnnual));
  const specialAnnualCents = annualCtcCents - basicAnnualCents - hraAnnualCents - convenienceAnnualCents;

  const monthlyGrossCents = monthlyShare(annualCtcCents);
  const basicCents = monthlyShare(basicAnnualCents);
  const hraCents = monthlyShare(hraAnnualCents);
  let convenienceCents = monthlyShare(convenienceAnnualCents);
  let specialAllowanceCents = monthlyGrossCents - basicCents - hraCents - convenienceCents;
  if (specialAllowanceCents < 0) {
    convenienceCents += specialAllowanceCents;
    specialAllowanceCents = 0;
  }

  const professionalTax = professionalTaxCents(monthlyGrossCents);
  return {
    annualCtcCents,
    monthlyGrossCents,
    basicCents,
    hraCents,
    leaveEncashmentCents: 0,
    specialAllowanceCents,
    pdaCents: 0,
    convenienceCents,
    professionalTaxCents: professionalTax,
    pfCents: 0,
    basicAnnualCents,
    hraAnnualCents,
    leaveEncashmentAnnualCents: 0,
    specialAnnualCents,
    pdaAnnualCents: 0,
    convenienceAnnualCents,
    professionalTaxAnnualCents: professionalTax * 12,
    pfAnnualCents: 0,
  };
}

export function payslipTotals(structure: SalaryStructure, lopAmount: unknown, otherAmount: unknown = 0) {
  const lopCents = toCents(lopAmount);
  const otherCents = toCents(otherAmount);
  if (lopCents < 0 || otherCents < 0) throw new FinanceValidationError('Deductions cannot be negative');
  const grossDeductionCents = structure.professionalTaxCents + structure.pfCents + lopCents + otherCents;
  const netCents = structure.monthlyGrossCents - grossDeductionCents;
  if (netCents < 0) throw new FinanceValidationError('Deductions are higher than earnings after tax');
  return { lopCents, otherCents, grossDeductionCents, netCents };
}

export function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function twoDigitWords(n: number): string {
  if (n < 20) return ONES[n];
  const ten = Math.floor(n / 10);
  const one = n % 10;
  return one ? `${TENS[ten]} ${ONES[one]}` : TENS[ten];
}

function threeDigitWords(n: number): string {
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  const head = hundred ? `${ONES[hundred]} Hundred` : '';
  if (!rest) return head;
  return head ? `${head} ${twoDigitWords(rest)}` : twoDigitWords(rest);
}

function indianWords(n: number): string {
  if (n === 0) return 'Zero';
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;
  const parts: string[] = [];
  if (crore) parts.push(`${threeDigitWords(crore)} Crore`);
  if (lakh) parts.push(`${twoDigitWords(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigitWords(thousand)} Thousand`);
  if (rest) parts.push(threeDigitWords(rest));
  return parts.join(' ');
}

/** Payslip line: "Rupees Twenty Five Thousand Eight Hundred Only". */
export function payslipAmountInWords(cents: number): string {
  const abs = Math.abs(Math.round(cents));
  const rupees = Math.floor(abs / 100);
  const paise = abs % 100;
  const head = `Rupees ${indianWords(rupees)}`;
  if (!paise) return `${head} Only`;
  return `${head} And ${twoDigitWords(paise)} Paise Only`;
}

export function moneyText(cents: number) {
  return fromCents(cents);
}
