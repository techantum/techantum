import { createHash } from 'crypto';
import ExcelJS from 'exceljs';
import { extractText } from 'unpdf';
import { generateAIResponse } from '@/lib/ai';
import { writeFinanceAudit } from './audit';
import { q, withFinanceTx, type DbClient } from './db';
import { FinanceConflictError, FinanceValidationError } from './errors';
import { buildWorkbook } from './excel';
import { formatFinancialYear } from './fy';
import { categoryIdByCode } from './lookups';
import { fromCents, toCents } from './money';
import {
  buildReconcileKey,
  findDuplicateExpense,
  findDuplicateIncome,
  findMatchingInvoicePayment,
  findMatchingReceipt,
  loadPartyCatalog,
  matchPartyFromNarration,
  matchServiceFromNarration,
} from './reconcile';
import { saveFinanceBuffer } from './storage';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export type BankDirection = 'credit' | 'debit';
export type BankSourceModule = 'income' | 'expense' | 'sridhar';

type ParsedLine = {
  txnDate: string;
  description: string;
  reference: string;
  amount: number;
  direction: BankDirection;
};

function unwrapCellValue(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value !== 'object') return value;
  if (value instanceof Date) return value;
  const obj = value as Record<string, unknown>;
  if ('result' in obj) return unwrapCellValue(obj.result);
  if ('richText' in obj && Array.isArray(obj.richText)) {
    return (obj.richText as { text?: string }[]).map((part) => part.text || '').join('');
  }
  // ExcelJS inlineStr / CellRichTextValue sometimes nests as { text: '...' } or { richText }.
  if ('text' in obj && obj.text != null && typeof obj.text !== 'object') return obj.text;
  if ('hyperlink' in obj && 'text' in obj) return (obj as { text?: unknown }).text;
  if ('sharedFormula' in obj && 'result' in obj) return unwrapCellValue(obj.result);
  if (Array.isArray((obj as { is?: unknown }).is)) {
    // Rare shape: { is: [{ text: '...' }] }
    return ((obj as { is: { text?: string }[] }).is || []).map((part) => part.text || '').join('');
  }
  return value;
}

function normalizeDateText(text: string) {
  return text
    .trim()
    .replace(/[\u00a0\u202f\u2007]/g, ' ')
    .replace(/[\u2010-\u2015\u2212\ufe58\ufe63\uff0d]/g, '-') // unicode dashes → -
    .replace(/[\u2044\u2215\uff0f]/g, '/') // unicode slashes → /
    .replace(/\s+/g, ' ');
}

function isoDate(value: unknown): string | null {
  const raw = unwrapCellValue(value);
  if (raw == null || raw === '') return null;
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return raw.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  }
  if (typeof raw === 'number') return excelSerialToIso(raw);
  // Opaque ExcelJS objects → don't treat "[object Object]" as a date.
  if (typeof raw === 'object') return null;
  const text = normalizeDateText(String(raw));
  if (!text || /^n\/?a$/i.test(text) || text === '-' || text === '—') return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  // DD/MM/YYYY or DD-MM-YYYY, optional time suffix (Axis/HDFC exports).
  const dmy = text.match(/^(\d{1,2})[\/\-.\s](\d{1,2})[\/\-.\s](\d{2,4})(?:\s+.*)?$/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    let year = Number(dmy[3]);
    if (year < 100) year += 2000;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  // Compact DDMMYYYY (some Axis mobile exports).
  const compact = text.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (compact) {
    const day = Number(compact[1]);
    const month = Number(compact[2]);
    const year = Number(compact[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  const mdy = text.match(/^([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{2,4})$/);
  if (mdy) {
    const parsed = new Date(`${mdy[1]} ${mdy[2]}, ${mdy[3]}`);
    if (!Number.isNaN(parsed.getTime())) return parsed.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  }
  const dMonY = text.match(/^(\d{1,2})[\/\-\s]([A-Za-z]{3,9})[\/\-\s](\d{2,4})$/);
  if (dMonY) {
    const parsed = new Date(`${dMonY[2]} ${dMonY[1]}, ${dMonY[3]}`);
    if (!Number.isNaN(parsed.getTime())) return parsed.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  }
  if (/^\d+(\.\d+)?$/.test(text)) return excelSerialToIso(Number(text));
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) return parsed.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  return null;
}

function moneyNumber(value: unknown): number {
  const raw = unwrapCellValue(value);
  if (raw == null || raw === '') return 0;
  if (typeof raw === 'number') return Number.isFinite(raw) ? Math.abs(raw) : 0;
  if (typeof raw === 'object') return 0;
  const text = String(raw)
    .trim()
    .replace(/[\u00a0\u202f\u2007]/g, ' ')
    .replace(/[\u2010-\u2015\u2212\ufe58\ufe63\uff0d]/g, '-');
  if (!text || text === '-' || text === '—' || /^nil$/i.test(text)) return 0;
  // Strip currency symbols/spaces and thousand separators (including Indian 1,23,456.78).
  const cleaned = text
    .replace(/₹/g, '')
    .replace(/\bINR\b/gi, '')
    .replace(/\bRs\.?/gi, '')
    .replace(/[\s\u00a0]/g, '')
    .replace(/,/g, '')
    .replace(/\((.*)\)/, '-$1');
  const amount = Number(cleaned);
  return Number.isFinite(amount) ? Math.abs(amount) : 0;
}

function cellText(value: unknown) {
  const raw = unwrapCellValue(value);
  if (raw == null) return '';
  if (raw instanceof Date) return raw.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  return String(raw).trim();
}

function normalizeHeader(value: unknown) {
  return cellText(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function headerMatches(header: string, needles: string[]) {
  if (!header) return false;
  return needles.some((needle) => {
    if (header === needle) return true;
    if (header.startsWith(`${needle} `) || header.endsWith(` ${needle}`) || header.includes(` ${needle} `)) return true;
    // Prefer whole-token matches for short codes like dr/cr.
    if (needle.length <= 3) return header.split(' ').includes(needle);
    return header.includes(needle);
  });
}

function excelSerialToIso(value: number) {
  // Excel serial date → JS date (UTC-safe enough for statement days).
  if (!Number.isFinite(value) || value < 20000 || value > 80000) return null;
  const parsed = new Date(Math.round((value - 25569) * 86400 * 1000));
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

type EmployeeMatch = { id: string; fullName: string; code: string; tokens: string[] };
type ClassifiedLine = {
  module: BankSourceModule;
  category: string;
  confidence: 'high' | 'medium' | 'low';
  matchedEmployee?: string;
};

function normalizePersonName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(mr|mrs|ms|miss|shri|smt|dr)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function compactPersonName(value: string) {
  return normalizePersonName(value).replace(/\s+/g, '');
}

function nameTokens(value: string) {
  return normalizePersonName(value)
    .split(' ')
    .filter(
      (token) =>
        token.length >= 3 &&
        !['kumar', 'and', 'the', 'for', 'from', 'neft', 'imps', 'upi', 'rtgs', 'bank', 'india', 'payment', 'paymen', 'transfer'].includes(token)
    );
}

function tokenInHay(token: string, hay: string, hayCompact: string) {
  if (!token) return false;
  if (hay.includes(token) || hayCompact.includes(token)) return true;
  // Soft match for common OCR/typo variants (vaibhav/valbhav).
  if (token.length >= 5) {
    const parts = hay.split(/\s+/);
    for (const part of parts) {
      if (part.length < 5) continue;
      if (Math.abs(part.length - token.length) > 2) continue;
      let miss = 0;
      const a = part.length >= token.length ? part : token;
      const b = part.length >= token.length ? token : part;
      let bi = 0;
      for (let ai = 0; ai < a.length && bi < b.length; ai += 1) {
        if (a[ai] === b[bi]) bi += 1;
        else miss += 1;
        if (miss > 2) break;
      }
      if (bi >= b.length - 1 && miss <= 2) return true;
    }
  }
  return false;
}

async function loadEmployees(): Promise<EmployeeMatch[]> {
  const { rows } = await q<{ id: string; full_name: string; employee_code: string }>(
    undefined,
    `SELECT id, full_name, COALESCE(employee_code,'') AS employee_code
     FROM finance_employees
     WHERE COALESCE(status,'active') <> 'inactive'
     ORDER BY full_name`
  );
  return rows.map((row) => ({
    id: row.id,
    fullName: row.full_name,
    code: row.employee_code,
    tokens: nameTokens(row.full_name),
  }));
}

function matchEmployee(description: string, employees: EmployeeMatch[]) {
  const hay = normalizePersonName(description);
  if (!hay) return null;
  const hayCompact = compactPersonName(description);
  let best: { employee: EmployeeMatch; score: number } | null = null;

  const tokenOwners = new Map<string, number>();
  for (const employee of employees) {
    for (const token of employee.tokens) {
      tokenOwners.set(token, (tokenOwners.get(token) || 0) + 1);
    }
  }

  for (const employee of employees) {
    const full = normalizePersonName(employee.fullName);
    const fullCompact = compactPersonName(employee.fullName);
    if (full && (hay.includes(full) || hayCompact.includes(fullCompact))) return employee;
    if (employee.code) {
      const code = employee.code.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (code && (hay.includes(employee.code.toLowerCase()) || hayCompact.includes(code))) return employee;
    }
    if (!employee.tokens.length) continue;

    const hits = employee.tokens.filter((token) => tokenInHay(token, hay, hayCompact)).length;
    const score = hits / employee.tokens.length;
    if (hits >= 2 && score >= 0.5 && (!best || score > best.score)) {
      best = { employee, score: score + hits * 0.01 };
      continue;
    }
    // One distinctive token (surname / uncommon first name) is enough for NEFT name fields.
    const uniqueHit = employee.tokens.find(
      (token) => token.length >= 4 && tokenInHay(token, hay, hayCompact) && (tokenOwners.get(token) || 0) === 1
    );
    if (uniqueHit && (!best || best.score < 0.55)) {
      best = { employee, score: 0.55 };
    }
  }
  return best?.employee || null;
}

/** Map free-text expense labels used by classification onto ledger category names. */
export function expenseCategoryFromDescription(description: string): string | null {
  const text = String(description || '').toLowerCase();
  if (!text) return null;

  if (
    /\b(salary|salaries|payroll|wage|wages|stipend|pay\s*slip|payslip)\b/.test(text)
  ) {
    return 'Employee Salaries';
  }
  if (
    /\b(swiggy|zomato|kfc|mcdonald|mcd |dominos|domino|pizza|bakery|kitchen|restaurant|cafe|cafeteria|food|dining|blinkit|zepto|dunzo|bigbasket|starbucks|chai|coffee|canteen|mess|eatery|burger|biryani|hotel food)\b/.test(
      text
    ) ||
    /ideal kitchen|swiss castle/.test(text)
  ) {
    return 'Food';
  }
  if (
    /\b(electric|electricity|water bill|gas bill|utility|utilities|tsspdcl|bescom|tata power|indane|hp gas|drink\s*prime)\b/.test(text)
  ) {
    return 'Utilities';
  }
  if (
    /\b(jio|airtel|vodafone|\bvi\b|bsnl|postpaid|prepaid|broadband|wifi|internet|telecom|act fibernet|fiber)\b/.test(text)
  ) {
    return 'Internet / Telecom';
  }
  if (
    /\b(uber|ola|rapido|irctc|flight|indigo|airindia|spicejet|makemytrip|goibibo|airbnb|petrol|diesel|fuel|travel|railway|metro|cab|taxi)\b/.test(
      text
    ) ||
    /booking\.com|cleartrip|redbus/.test(text)
  ) {
    return 'Travel';
  }
  if (/\b(facebook|meta ads|google ads|linkedin|instagram|advertis|marketing|adwords)\b/.test(text)) {
    return 'Marketing & Advertising';
  }
  if (/\b(rent|lease)\b/.test(text)) return 'Office Rent';
  if (
    /\b(aws|github|notion|slack|cursor|openai|chatgpt|anthropic|claude|grok|xai|microsoft|adobe|zoho|saas|hosting|domain|godaddy|namecheap|digitalocean|vercel|netlify)\b/.test(
      text
    ) ||
    /google\s*serv|software|subscription|\bit\b/.test(text)
  ) {
    return 'IT & Tools';
  }
  if (/\b(bank charge|service chrg|sms.?chg|monthly service|nach return|cheque return)\b/.test(text) || /gst\s*@\s*\d+/.test(text)) {
    return 'Bank Charges';
  }
  if (/\b(gst|tds|tcs|income tax|provident fund|\bpf\b|\besi\b|professional tax|statutory)\b/.test(text)) {
    return 'Taxes & Statutory Payments';
  }
  if (/\b(office supplies|stationery|printer|courier|postage|amazon|flipkart|stationery)\b/.test(text)) {
    return 'Office Expenses';
  }
  if (/\b(freelancer|contractor|consultancy|professional fee|ca fee|advocate)\b/.test(text)) {
    return 'Professional Fees';
  }
  return null;
}

/** Detect Sridhar investment rows from narration (name + loan/investment/payment/funding cues). */
export function isSridharNarration(description: string) {
  const text = String(description || '').toLowerCase();
  if (!text) return false;
  // Name variants seen on Axis UPI: SRIDHAR R, SRIDHAR REDDY KAIPU, etc.
  if (/\bsridhar\b/.test(text)) return true;
  // Explicit Sridhar investment tags without relying only on the personal name token.
  if (/\bsridhar\s*(r|reddy)?\b/.test(text) && /\b(loan|invest|funding|payment)\b/.test(text)) return true;
  return false;
}

/**
 * Axis UPI truncates remittance text: Loan, Investme, Paymen, Funding.
 * Derive the investment kind from description for listing/filters/export.
 */
export function sridharKindFromDescription(description: string): 'loan' | 'investment' | 'funding' | 'payment' | 'other' {
  const text = String(description || '').toLowerCase();
  if (/\bloans?\b|\/loan(?:\/|$)/i.test(text)) return 'loan';
  if (/invest|\/investme/i.test(text)) return 'investment';
  if (/\bfundings?\b|\/fund(?:ing)?(?:\/|$)/i.test(text)) return 'funding';
  if (/\bpayments?\b|\/paymen/i.test(text)) return 'payment';
  return 'other';
}

export function sridharCategoryFromDescription(description: string) {
  const kind = sridharKindFromDescription(description);
  if (kind === 'loan') return 'Sridhar Loan';
  if (kind === 'investment') return 'Sridhar Investment';
  if (kind === 'funding') return 'Sridhar Funding';
  if (kind === 'payment') return 'Sridhar Payment';
  return 'Sridhar Investment';
}

function sridharKindSql(column = 'description') {
  return `CASE
    WHEN ${column} ~* 'loan' THEN 'loan'
    WHEN ${column} ~* 'invest' THEN 'investment'
    WHEN ${column} ~* 'fund' THEN 'funding'
    WHEN ${column} ~* 'paymen' THEN 'payment'
    ELSE 'other'
  END`;
}

function classifyHeuristic(description: string, direction: BankDirection, employees: EmployeeMatch[]): ClassifiedLine {
  const text = description.toLowerCase();
  if (isSridharNarration(description)) {
    return { module: 'sridhar', category: sridharCategoryFromDescription(description), confidence: 'high' };
  }

  const employee = matchEmployee(description, employees);
  const salaryCue = /\b(salary|salaries|payroll|wage|wages|stipend|pay\s*slip|payslip)\b/.test(text);
  // Any debit mentioning an employee name is treated as salary.
  if (direction === 'debit' && (employee || salaryCue)) {
    return {
      module: 'expense',
      category: 'Employee Salaries',
      confidence: 'high',
      matchedEmployee: employee?.fullName,
    };
  }

  if (direction === 'credit') {
    if (employee && salaryCue) {
      return { module: 'expense', category: 'Employee Salaries', confidence: 'medium', matchedEmployee: employee.fullName };
    }
    if (employee) {
      return { module: 'income', category: 'Bank Credit', confidence: 'medium', matchedEmployee: employee.fullName };
    }
    if (/invoice|client|payment received|project|retainer|milestone|hosting|amc|consulting/.test(text)) {
      return { module: 'income', category: 'Project Income', confidence: 'medium' };
    }
    return { module: 'income', category: 'Bank Credit', confidence: 'medium' };
  }

  const fromDescription = expenseCategoryFromDescription(description);
  if (fromDescription) {
    return { module: 'expense', category: fromDescription, confidence: 'high' };
  }

  return { module: 'expense', category: 'Bank Debit', confidence: 'low' };
}

async function classifyWithAI(lines: { index: number; description: string; direction: BankDirection; amount: number }[]): Promise<Map<number, ClassifiedLine>> {
  const map = new Map<number, ClassifiedLine>();
  if (!lines.length) return map;
  try {
    const prompt = `Classify bank statement rows for an Indian company finance ledger.
Return ONLY JSON: {"rows":[{"index":0,"module":"income|expense|sridhar","category":"string"}]}
Rules:
- module sridhar if narration mentions Sridhar, or Sridhar loan/investment/payment/funding (incl. truncated UPI text like Investme/Paymen)
- for sridhar, set category to "Sridhar Loan", "Sridhar Investment", "Sridhar Payment", or "Sridhar Funding" from the narration
- module expense + category "Employee Salaries" if narration contains an employee/person name or salary/payroll cues
- module expense categories from narration: Food, Utilities, Internet / Telecom, Travel, Marketing & Advertising, Office Rent, IT & Tools, Bank Charges, Taxes & Statutory Payments, Office Expenses, Professional Fees, Bank Debit
- module income for customer/client credits
Rows:
${JSON.stringify(lines.slice(0, 40))}`;
    const ai = await generateAIResponse(prompt, {
      purpose: 'finance_bank_statement_classify',
      json: true,
      temperature: 0,
      maxTokens: 1200,
      system: 'You classify bank narrations into income, expense (with specific category), or sridhar investment. Reply with JSON only.',
    });
    const parsed = JSON.parse(ai.text) as { rows?: { index: number; module: BankSourceModule; category: string }[] };
    for (const row of parsed.rows || []) {
      if (!row || !['income', 'expense', 'sridhar'].includes(row.module)) continue;
      map.set(Number(row.index), {
        module: row.module,
        category: String(
          row.category ||
            (row.module === 'sridhar'
              ? 'Sridhar Investment'
              : row.module === 'income'
                ? 'Bank Credit'
                : 'Bank Debit')
        ),
        confidence: 'medium',
      });
    }
  } catch {
    // AI is optional; heuristic results remain.
  }
  return map;
}

async function classifyLines(lines: ParsedLine[], employees: EmployeeMatch[]) {
  const classified = lines.map((line) => classifyHeuristic(line.description, line.direction, employees));
  const uncertain = lines
    .map((line, index) => ({ line, index, guess: classified[index] }))
    .filter((item) => item.guess.confidence === 'low' || (item.guess.confidence === 'medium' && !item.guess.matchedEmployee && item.line.direction === 'debit'));
  if (uncertain.length) {
    const aiMap = await classifyWithAI(
      uncertain.map((item) => ({
        index: item.index,
        description: item.line.description,
        direction: item.line.direction,
        amount: item.line.amount,
      }))
    );
    for (const [index, value] of aiMap) {
      if (!classified[index] || classified[index].confidence !== 'high') classified[index] = value;
    }
  }
  return classified;
}

/** Content-only fingerprint — must NOT include import month/year, or re-import under another month creates duplicates. */
function fingerprint(line: ParsedLine) {
  return createHash('sha256')
    .update(
      [
        line.txnDate,
        line.direction,
        line.amount.toFixed(2),
        line.description.toLowerCase().trim(),
        String(line.reference || '')
          .toLowerCase()
          .trim(),
      ].join('|')
    )
    .digest('hex');
}

async function findExistingBankLine(db: DbClient | undefined, line: ParsedLine, fp: string) {
  const byFingerprint = await q<{ id: string }>(db, `SELECT id FROM finance_bank_statement_lines WHERE fingerprint = $1 LIMIT 1`, [fp]);
  if (byFingerprint.rows[0]) return byFingerprint.rows[0];
  const byNatural = await q<{ id: string }>(
    db,
    `SELECT id FROM finance_bank_statement_lines
     WHERE status IN ('posted','duplicate')
       AND txn_date = $1::date
       AND direction = $2
       AND amount = $3
       AND lower(btrim(description)) = lower(btrim($4))
       AND lower(btrim(COALESCE(reference,''))) = lower(btrim($5))
     LIMIT 1`,
    [line.txnDate, line.direction, fromCents(toCents(line.amount)), line.description, line.reference || '']
  );
  return byNatural.rows[0] || null;
}

function mapCategoryCode(label: string, module: BankSourceModule) {
  const key = label.toLowerCase();
  if (module === 'income') {
    if (key.includes('project')) return 'project_income';
    if (key.includes('sridhar')) return 'sridhar_funding_in';
    return 'bank_credit';
  }
  if (key.includes('salary') || key.includes('payroll') || key.includes('wage')) return 'employee_salaries';
  if (key.includes('food')) return 'food';
  if (key.includes('utilit')) return 'utilities';
  if (key.includes('internet') || key.includes('telecom')) return 'internet_telecom';
  if (key.includes('travel')) return 'travel';
  if (key.includes('marketing') || key.includes('advertis')) return 'marketing';
  if (key.includes('rent')) return 'office_rent';
  if (key.includes('office expense')) return 'office_expenses';
  if (key.includes('professional') || key.includes('freelancer')) return 'professional_fees';
  if (key.includes('tax') || key.includes('statutory')) return 'taxes_statutory';
  if (key.includes('it') || key.includes('tool') || key.includes('software') || key.includes('cloud')) return 'it_tools';
  if (key.includes('bank charge') || key === 'bank charges') return 'bank_charges';
  if (key.includes('sridhar')) return 'sridhar_funding_out';
  if (key.includes('bank debit') || key === 'bank debit') return 'bank_debit';
  if (key.includes('bank')) return 'bank_charges';
  return 'bank_debit';
}

function contentHash(buffer: Buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

async function ensureGeneralVendor(db: DbClient) {
  const { rows } = await q<{ id: string }>(db, `SELECT id FROM finance_vendors WHERE vendor_name = 'General / Other' LIMIT 1`);
  if (rows[0]?.id) return rows[0].id;
  const created = await q<{ id: string }>(
    db,
    `INSERT INTO finance_vendors (vendor_name, status, notes) VALUES ('General / Other','active','System vendor for bank statement imports') RETURNING id`
  );
  return created.rows[0].id;
}

type ColumnMap = {
  headerRow: number;
  dateCol: number;
  valueDateCol: number;
  descCol: number;
  refCol: number;
  debitCol: number;
  creditCol: number;
  amountCol: number;
  typeCol: number;
  labels: string[];
};

const TXN_DATE_HEADERS = [
  'txn date',
  'tran date',
  'trans date',
  'transaction date',
  'posted date',
  'posting date',
  'entry date',
  'txn posted date',
  'txn dt',
  'tran dt',
];
const VALUE_DATE_HEADERS = ['value date', 'value dt'];
const GENERIC_DATE_HEADERS = ['date'];
const DESC_HEADERS = [
  'narration',
  'description',
  'particulars',
  'remarks',
  'details',
  'transaction remarks',
  'txn remarks',
  'narrative',
  'transaction description',
  'txn particulars',
  'transaction particulars',
  'narration particulars',
];
const REF_HEADERS = [
  'chq ref no',
  'chq no',
  'cheque no',
  'cheque number',
  'ref no',
  'reference no',
  'reference',
  'utr',
  'transaction id',
  'txn id',
  'cheque ref no',
  'cheque ref',
];
const DEBIT_HEADERS = [
  'debit amount inr',
  'debit amount',
  'withdrawal amt inr',
  'withdrawal amount inr',
  'withdrawal amt',
  'withdrawal amount',
  'withdrawals',
  'withdrawal',
  'amount debited',
  'dr amount',
  'debit amt',
  'debit',
  'dr',
];
const CREDIT_HEADERS = [
  'credit amount inr',
  'credit amount',
  'deposit amt inr',
  'deposit amount inr',
  'deposit amt',
  'deposit amount',
  'deposits',
  'deposit',
  'amount credited',
  'cr amount',
  'credit amt',
  'credit',
  'cr',
];
// Keep these specific — bare "amount" matches debit/credit/balance headers via includes().
const AMOUNT_HEADERS = ['transaction amount', 'txn amount', 'tran amount', 'amount inr'];
const TYPE_HEADERS = ['dr cr', 'credit debit', 'transaction type', 'type', 'cr dr'];

function detectColumns(headers: Map<number, string>): Omit<ColumnMap, 'headerRow' | 'labels'> | null {
  const find = (needles: string[]) => {
    for (const [col, header] of headers) {
      if (headerMatches(header, needles)) return col;
    }
    return -1;
  };
  // Prefer transaction date; keep value-date as fallback column (Axis often fills only one).
  let dateCol = find(TXN_DATE_HEADERS);
  const valueDateCol = find(VALUE_DATE_HEADERS);
  if (dateCol < 0) dateCol = valueDateCol;
  if (dateCol < 0) dateCol = find(GENERIC_DATE_HEADERS);
  const descCol = find(DESC_HEADERS);
  if (dateCol < 0 || descCol < 0) return null;
  let amountCol = find(AMOUNT_HEADERS);
  const debitCol = find(DEBIT_HEADERS);
  const creditCol = find(CREDIT_HEADERS);
  // Never treat debit/credit/balance columns as a single "amount" column.
  if (amountCol > 0 && (amountCol === debitCol || amountCol === creditCol)) amountCol = -1;
  return {
    dateCol,
    valueDateCol: valueDateCol > 0 && valueDateCol !== dateCol ? valueDateCol : -1,
    descCol,
    refCol: find(REF_HEADERS),
    debitCol,
    creditCol,
    amountCol,
    typeCol: find(TYPE_HEADERS),
  };
}

function sheetScanLimit(sheet: ExcelJS.Worksheet) {
  const dims = sheet.dimensions as { bottom?: number } | undefined;
  return Math.max(sheet.rowCount || 0, (sheet as { actualRowCount?: number }).actualRowCount || 0, dims?.bottom || 0, 30);
}

function safeCellValue(cell: ExcelJS.Cell): unknown {
  try {
    const value = cell.value;
    if (value != null && value !== '') {
      if (typeof value === 'object' && !(value instanceof Date)) {
        const unwrapped = unwrapCellValue(value);
        if (unwrapped != null && unwrapped !== '' && unwrapped !== value) return unwrapped;
        // Opaque object (broken formula/merge) — fall through to .text
      } else {
        return value;
      }
    }
  } catch {
    // ignore broken/merged cell value access
  }
  // ExcelJS throws on some merged cells when reading `.text` — never call it blindly.
  try {
    const text = cell.text;
    if (text != null && String(text).trim() !== '') return text;
  } catch {
    return null;
  }
  return null;
}

function readRowCells(sheet: ExcelJS.Worksheet, rowNumber: number) {
  const row = sheet.getRow(rowNumber);
  const cells = new Map<number, unknown>();
  const maxCol = Math.max(sheet.columnCount || 0, 16);
  for (let col = 1; col <= maxCol; col += 1) {
    const value = safeCellValue(row.getCell(col));
    if (value == null || value === '') continue;
    cells.set(col, value);
  }
  return cells;
}

function columnScore(map: Pick<ColumnMap, 'debitCol' | 'creditCol' | 'amountCol' | 'refCol' | 'labels'>) {
  return (map.debitCol > 0 ? 3 : 0) + (map.creditCol > 0 ? 3 : 0) + (map.amountCol > 0 ? 2 : 0) + (map.refCol > 0 ? 1 : 0) + map.labels.length;
}

function findHeaderMap(sheet: ExcelJS.Worksheet): ColumnMap {
  const scanLimit = Math.min(120, sheetScanLimit(sheet));
  let best: ColumnMap | null = null;
  const seenRows: string[] = [];
  for (let rowNumber = 1; rowNumber <= scanLimit; rowNumber += 1) {
    const headers = new Map<number, string>();
    const labels: string[] = [];
    readRowCells(sheet, rowNumber).forEach((value, col) => {
      const label = normalizeHeader(value);
      if (!label) return;
      headers.set(col, label);
      labels.push(label);
    });
    if (headers.size < 2) continue;
    // Keep a few dense rows for better error messages.
    if (labels.length >= 4 && seenRows.length < 6) {
      seenRows.push(`row ${rowNumber}: ${labels.join(' | ')}`);
    }
    const mapped = detectColumns(headers);
    if (!mapped) continue;
    const candidate = { headerRow: rowNumber, labels, ...mapped };
    if (!best || columnScore(candidate) > columnScore(best)) best = candidate;
  }
  if (!best) {
    const hint = seenRows.length ? ` Closest rows seen: ${seenRows.join(' || ')}` : '';
    throw new FinanceValidationError(
      `Could not find Date and Narration/Description columns. Use headers like Date, Narration/Particulars, Debit/Withdrawal, Credit/Deposit.${hint}`
    );
  }
  if (best.debitCol < 0 && best.creditCol < 0 && best.amountCol < 0) {
    throw new FinanceValidationError(
      `Found Date and Description on row ${best.headerRow}, but no Debit/Credit/Amount columns. Detected headers: ${best.labels.join(', ')}`
    );
  }
  return best;
}

function matrixLastRow(sheet: ExcelJS.Worksheet, headerRow: number) {
  const dims = sheet.dimensions as { bottom?: number } | undefined;
  const sparseRows = (sheet as unknown as { _rows?: unknown[] })._rows;
  const sparse = Array.isArray(sparseRows) ? sparseRows.length - 1 : 0;
  // Always scan well past the header — Axis files sometimes report a tiny rowCount.
  return Math.max(sheetScanLimit(sheet), sparse, headerRow + 500, 80);
}

function readSheetMatrix(sheet: ExcelJS.Worksheet, map: ColumnMap): unknown[][] {
  const maxCol = Math.max(
    map.dateCol,
    map.valueDateCol,
    map.descCol,
    map.refCol,
    map.debitCol,
    map.creditCol,
    map.amountCol,
    map.typeCol,
    sheet.columnCount || 0,
    16
  );
  const lastRow = matrixLastRow(sheet, map.headerRow);
  const rows: unknown[][] = [];
  for (let rowNumber = 1; rowNumber <= lastRow; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const values: unknown[] = [];
    for (let col = 1; col <= maxCol; col += 1) {
      values[col - 1] = safeCellValue(row.getCell(col));
    }
    rows[rowNumber - 1] = values;
  }
  return rows;
}

function looksLikeRepeatedHeaderRow(normalizedDesc: string, map: ColumnMap) {
  if (!normalizedDesc) return false;
  if (map.labels.some((label) => label === normalizedDesc)) return true;
  // Only treat exact / prefix header labels as repeated headers — never substring matches
  // like narration text that happens to include "details" or "remarks".
  return DESC_HEADERS.some((header) => normalizedDesc === header || normalizedDesc.startsWith(`${header} `));
}

type MatrixParseStats = {
  scanned: number;
  skippedEmptyDesc: number;
  skippedHeaderOrBalance: number;
  skippedBadDate: number;
  skippedBadAmount: number;
  sample: string[];
};

function linesFromMatrix(rows: unknown[][], map: ColumnMap, stats?: MatrixParseStats): ParsedLine[] {
  const lines: ParsedLine[] = [];
  const local: MatrixParseStats = stats || {
    scanned: 0,
    skippedEmptyDesc: 0,
    skippedHeaderOrBalance: 0,
    skippedBadDate: 0,
    skippedBadAmount: 0,
    sample: [],
  };
  for (let index = map.headerRow; index < rows.length; index += 1) {
    const row = rows[index] || [];
    local.scanned += 1;
    const description = cellText(row[map.descCol - 1]);
    if (!description) {
      local.skippedEmptyDesc += 1;
      continue;
    }
    const normalizedDesc = normalizeHeader(description);
    if (looksLikeRepeatedHeaderRow(normalizedDesc, map)) {
      local.skippedHeaderOrBalance += 1;
      continue;
    }
    // Skip opening/closing/totals rows that share the particulars column.
    if (/^(opening balance|closing balance|transaction total|totals?|brought forward|carried forward)\b/.test(normalizedDesc)) {
      local.skippedHeaderOrBalance += 1;
      continue;
    }
    const rawDate = row[map.dateCol - 1];
    const rawValueDate = map.valueDateCol > 0 ? row[map.valueDateCol - 1] : null;
    const txnDate = isoDate(rawDate) || (rawValueDate != null ? isoDate(rawValueDate) : null);
    if (!txnDate) {
      local.skippedBadDate += 1;
      if (local.sample.length < 3) {
        local.sample.push(
          `row ${index + 1} date=${JSON.stringify(cellText(rawDate) || rawDate)} valueDate=${JSON.stringify(cellText(rawValueDate) || rawValueDate)} desc=${JSON.stringify(description.slice(0, 60))}`
        );
      }
      continue;
    }
    const reference = map.refCol > 0 ? cellText(row[map.refCol - 1]) : '';
    let direction: BankDirection | null = null;
    let amount = 0;
    if (map.debitCol > 0 || map.creditCol > 0) {
      const debit = map.debitCol > 0 ? moneyNumber(row[map.debitCol - 1]) : 0;
      const credit = map.creditCol > 0 ? moneyNumber(row[map.creditCol - 1]) : 0;
      if (credit > 0 && debit <= 0) {
        direction = 'credit';
        amount = credit;
      } else if (debit > 0 && credit <= 0) {
        direction = 'debit';
        amount = debit;
      } else if (debit > 0 && credit > 0) {
        // Rare both-filled row: use the larger non-zero side.
        if (credit >= debit) {
          direction = 'credit';
          amount = credit;
        } else {
          direction = 'debit';
          amount = debit;
        }
      }
    } else if (map.amountCol > 0) {
      const raw = cellText(row[map.amountCol - 1]);
      amount = moneyNumber(raw);
      const type = map.typeCol > 0 ? cellText(row[map.typeCol - 1]).toLowerCase() : '';
      if (/\b(cr|credit|deposit|in)\b/.test(type)) direction = 'credit';
      else if (/\b(dr|debit|withdrawal|out)\b/.test(type)) direction = 'debit';
      else if (raw.trim().startsWith('-') || String(row[map.amountCol - 1] ?? '')
        .trim()
        .startsWith('-')) direction = 'debit';
      else direction = 'credit';
    }
    if (!direction || amount <= 0) {
      local.skippedBadAmount += 1;
      if (local.sample.length < 3) {
        local.sample.push(
          `row ${index + 1} date=${txnDate} debit=${JSON.stringify(cellText(row[map.debitCol - 1]))} credit=${JSON.stringify(cellText(row[map.creditCol - 1]))} desc=${JSON.stringify(description.slice(0, 40))}`
        );
      }
      continue;
    }
    lines.push({ txnDate, description, reference, amount, direction });
  }
  if (stats) Object.assign(stats, local);
  return lines;
}

function emptyLinesMessage(map: ColumnMap, stats: MatrixParseStats) {
  const parts = [
    `Headers found on row ${map.headerRow} (${map.labels.join(', ')}), but no valid transactions were read.`,
    `Scanned ${stats.scanned} rows after header (empty desc ${stats.skippedEmptyDesc}, balance/header ${stats.skippedHeaderOrBalance}, bad date ${stats.skippedBadDate}, bad amount ${stats.skippedBadAmount}).`,
  ];
  if (stats.sample.length) parts.push(`Samples: ${stats.sample.join(' | ')}`);
  else parts.push('Check date and amount columns.');
  return parts.join(' ');
}

function colLettersToNumber(letters: string) {
  let n = 0;
  for (const ch of letters.toUpperCase()) {
    if (ch < 'A' || ch > 'Z') continue;
    n = n * 26 + (ch.charCodeAt(0) - 64);
  }
  return n;
}

function decodeXmlEntities(text: string) {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, '&');
}

/** Direct OOXML reader — Axis exports use inlineStr cells that some ExcelJS builds mishandle. */
async function readOoxmlMatrices(buffer: Buffer): Promise<unknown[][][]> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(buffer);
  const shared: string[] = [];
  const ssFile = zip.file(/xl\/sharedStrings\.xml$/i)[0];
  if (ssFile) {
    const ssXml = await ssFile.async('string');
    const siRe = /<si\b[^>]*>([\s\S]*?)<\/si>/gi;
    let siMatch: RegExpExecArray | null;
    while ((siMatch = siRe.exec(ssXml))) {
      const parts = [...siMatch[1].matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/gi)].map((m) => decodeXmlEntities(m[1]));
      shared.push(parts.join(''));
    }
  }
  const sheetFiles = zip.file(/xl\/worksheets\/sheet\d+\.xml$/i).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  const matrices: unknown[][][] = [];
  for (const sheetFile of sheetFiles) {
    const xml = await sheetFile.async('string');
    const rows: unknown[][] = [];
    const rowRe = /<row\b[^>]*\br="(\d+)"[^>]*>([\s\S]*?)<\/row>/gi;
    let rowMatch: RegExpExecArray | null;
    while ((rowMatch = rowRe.exec(xml))) {
      const rowNumber = Number(rowMatch[1]);
      const values: unknown[] = [];
      const cellRe = /<c\b([^>]*)>([\s\S]*?)<\/c>|<c\b([^>]*)\/>/gi;
      let cellMatch: RegExpExecArray | null;
      while ((cellMatch = cellRe.exec(rowMatch[2]))) {
        const attrs = cellMatch[1] || cellMatch[3] || '';
        const body = cellMatch[2] || '';
        const ref = attrs.match(/\br="([A-Z]+)(\d+)"/i);
        if (!ref) continue;
        const col = colLettersToNumber(ref[1]);
        if (col <= 0) continue;
        const type = (attrs.match(/\bt="([^"]+)"/) || [])[1] || '';
        let value: unknown = null;
        if (type === 'inlineStr') {
          const texts = [...body.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/gi)].map((m) => decodeXmlEntities(m[1]));
          value = texts.join('');
        } else if (type === 's') {
          const idx = Number((body.match(/<v>([\s\S]*?)<\/v>/i) || [])[1]);
          value = Number.isFinite(idx) ? shared[idx] ?? '' : '';
        } else if (type === 'str' || type === 'b') {
          value = decodeXmlEntities((body.match(/<v>([\s\S]*?)<\/v>/i) || [])[1] || '');
        } else {
          const v = (body.match(/<v>([\s\S]*?)<\/v>/i) || [])[1];
          if (v != null && v !== '') {
            const num = Number(v);
            value = Number.isFinite(num) && /^-?\d+(\.\d+)?(e[+-]?\d+)?$/i.test(v.trim()) ? num : decodeXmlEntities(v);
          }
        }
        values[col - 1] = value;
      }
      rows[rowNumber - 1] = values;
    }
    if (rows.length) matrices.push(rows);
  }
  return matrices;
}

function parseMatrixWorkbook(matrices: unknown[][][]): { lines: ParsedLine[]; map: ColumnMap | null; stats: MatrixParseStats | null; error: string } {
  let bestLines: ParsedLine[] = [];
  let bestMap: ColumnMap | null = null;
  let bestStats: MatrixParseStats | null = null;
  let lastError = '';
  for (const rows of matrices) {
    let best: ColumnMap | null = null;
    for (let rowNumber = 0; rowNumber < Math.min(rows.length, 120); rowNumber += 1) {
      const headers = new Map<number, string>();
      const labels: string[] = [];
      (rows[rowNumber] || []).forEach((value, index) => {
        const label = normalizeHeader(value);
        if (!label) return;
        headers.set(index + 1, label);
        labels.push(label);
      });
      if (headers.size < 2) continue;
      const mapped = detectColumns(headers);
      if (!mapped) continue;
      const candidate = { headerRow: rowNumber + 1, labels, ...mapped };
      if (!best || columnScore(candidate) > columnScore(best)) best = candidate;
    }
    if (!best) continue;
    if (best.debitCol < 0 && best.creditCol < 0 && best.amountCol < 0) {
      lastError = `Found Date and Description on row ${best.headerRow}, but no Debit/Credit/Amount columns. Detected headers: ${best.labels.join(', ')}`;
      continue;
    }
    const stats: MatrixParseStats = {
      scanned: 0,
      skippedEmptyDesc: 0,
      skippedHeaderOrBalance: 0,
      skippedBadDate: 0,
      skippedBadAmount: 0,
      sample: [],
    };
    const lines = linesFromMatrix(rows, best, stats);
    if (lines.length > bestLines.length) {
      bestLines = lines;
      bestMap = best;
      bestStats = stats;
      lastError = '';
    } else if (!lines.length) {
      bestMap = bestMap || best;
      bestStats = bestStats || stats;
      lastError = emptyLinesMessage(best, stats);
    }
  }
  return { lines: bestLines, map: bestMap, stats: bestStats, error: lastError };
}

function errorMessage(err: unknown) {
  if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
    return (err as { message: string }).message;
  }
  return '';
}

function looksLikeHtml(buffer: Buffer) {
  const head = buffer.slice(0, 2048).toString('utf8').toLowerCase();
  return head.includes('<html') || head.includes('<table') || head.includes('<!doctype html');
}

function parseHtmlTable(buffer: Buffer): ParsedLine[] {
  const html = buffer.toString('utf8');
  const rows: string[][] = [];
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowRe.exec(html))) {
    const cells: string[] = [];
    const cellRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
    let cellMatch: RegExpExecArray | null;
    while ((cellMatch = cellRe.exec(rowMatch[1]))) {
      const text = cellMatch[1]
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/\s+/g, ' ')
        .trim();
      cells.push(text);
    }
    if (cells.some((cell) => cell)) rows.push(cells);
  }
  if (!rows.length) throw new FinanceValidationError('Could not read an HTML/Excel table from this file.');

  let best: ColumnMap | null = null;
  for (let rowNumber = 0; rowNumber < Math.min(rows.length, 120); rowNumber += 1) {
    const headers = new Map<number, string>();
    const labels: string[] = [];
    rows[rowNumber].forEach((value, index) => {
      const label = normalizeHeader(value);
      if (!label) return;
      headers.set(index + 1, label);
      labels.push(label);
    });
    if (headers.size < 2) continue;
    const mapped = detectColumns(headers);
    if (!mapped) continue;
    best = { headerRow: rowNumber + 1, labels, ...mapped };
    break;
  }
  if (!best) {
    throw new FinanceValidationError(
      'Could not find Date and Narration/Description columns in this statement table. Use headers like Date, Particulars, Debit, Credit.'
    );
  }
  const stats: MatrixParseStats = {
    scanned: 0,
    skippedEmptyDesc: 0,
    skippedHeaderOrBalance: 0,
    skippedBadDate: 0,
    skippedBadAmount: 0,
    sample: [],
  };
  const lines = linesFromMatrix(rows, best, stats);
  if (!lines.length) throw new FinanceValidationError(emptyLinesMessage(best, stats));
  return lines;
}

async function parseExcel(buffer: Buffer): Promise<ParsedLine[]> {
  if (looksLikeHtml(buffer)) return parseHtmlTable(buffer);

  let bestLines: ParsedLine[] = [];
  let lastError = '';

  const workbook = new ExcelJS.Workbook();
  let excelLoaded = false;
  try {
    await workbook.xlsx.load(buffer);
    excelLoaded = true;
  } catch {
    // Some banks rename HTML/CSV exports to .xlsx — try those fallbacks below.
  }

  if (excelLoaded && workbook.worksheets.length) {
    for (const sheet of workbook.worksheets) {
      if (sheetScanLimit(sheet) <= 0) continue;
      try {
        const map = findHeaderMap(sheet);
        const rows = readSheetMatrix(sheet, map);
        const stats: MatrixParseStats = {
          scanned: 0,
          skippedEmptyDesc: 0,
          skippedHeaderOrBalance: 0,
          skippedBadDate: 0,
          skippedBadAmount: 0,
          sample: [],
        };
        const lines = linesFromMatrix(rows, map, stats);
        if (lines.length > bestLines.length) {
          bestLines = lines;
          lastError = '';
        } else if (!lines.length && !bestLines.length) {
          lastError = emptyLinesMessage(map, stats);
        }
      } catch (err) {
        const message = errorMessage(err);
        if (message && !bestLines.length) lastError = message;
      }
    }
  }

  if (bestLines.length) return bestLines;

  // Axis / bank XLSX often uses inlineStr cells — parse the ZIP XML directly when ExcelJS yields nothing.
  try {
    const matrices = await readOoxmlMatrices(buffer);
    const parsed = parseMatrixWorkbook(matrices);
    if (parsed.lines.length) return parsed.lines;
    if (parsed.error) lastError = parsed.error;
  } catch {
    // ignore — fall through to HTML/CSV
  }

  if (lastError) throw new FinanceValidationError(lastError);

  // Last resort: HTML/CSV content inside a mislabeled file.
  try {
    return parseHtmlTable(buffer);
  } catch {
    try {
      return parseCsv(buffer);
    } catch {
      throw new FinanceValidationError(
        excelLoaded
          ? 'Could not find Date and Narration/Description columns. Use headers like Date, Narration/Particulars, Debit/Withdrawal, Credit/Deposit.'
          : 'Could not read this Excel file. Save it as .xlsx (Excel Workbook) or CSV and try again.'
      );
    }
  }
}

function parseCsv(buffer: Buffer): ParsedLine[] {
  const text = buffer.toString('utf8').replace(/^\uFEFF/, '');
  const rawRows = text.split(/\r?\n/).filter((line) => line.trim());
  if (!rawRows.length) throw new FinanceValidationError('CSV file is empty');
  const split = (line: string) => {
    const cells: string[] = [];
    let current = '';
    let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === '"') {
        if (quoted && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else quoted = !quoted;
        continue;
      }
      if (ch === ',' && !quoted) {
        cells.push(current.trim());
        current = '';
        continue;
      }
      current += ch;
    }
    cells.push(current.trim());
    return cells;
  };
  const matrix = rawRows.map(split);
  let best: ColumnMap | null = null;
  for (let rowNumber = 0; rowNumber < Math.min(matrix.length, 40); rowNumber += 1) {
    const headers = new Map<number, string>();
    const labels: string[] = [];
    matrix[rowNumber].forEach((value, index) => {
      const label = normalizeHeader(value);
      if (!label) return;
      headers.set(index + 1, label);
      labels.push(label);
    });
    const mapped = detectColumns(headers);
    if (!mapped) continue;
    best = { headerRow: rowNumber + 1, labels, ...mapped };
    break;
  }
  if (!best) {
    throw new FinanceValidationError(
      'Could not find Date and Narration/Description columns in CSV. Use headers like Date, Narration/Particulars, Debit, Credit.'
    );
  }
  const lines = linesFromMatrix(matrix, best);
  if (!lines.length) {
    throw new FinanceValidationError('CSV headers were found, but no valid transactions were read.');
  }
  return lines;
}

async function parsePdf(buffer: Buffer): Promise<ParsedLine[]> {
  const { text } = await extractText(new Uint8Array(buffer));
  const content = Array.isArray(text) ? text.join('\n') : String(text || '');
  const lines: ParsedLine[] = [];
  const pattern =
    /(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}|\d{4}-\d{2}-\d{2})\s+(.+?)\s+(CR|DR|CREDIT|DEBIT)?\s*[₹]?\s*([\d,]+\.\d{2})/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(content))) {
    const txnDate = isoDate(match[1]);
    const description = match[2].replace(/\s+/g, ' ').trim();
    const flag = String(match[3] || '').toUpperCase();
    const amount = moneyNumber(match[4]);
    if (!txnDate || !description || amount <= 0) continue;
    const direction: BankDirection = flag.startsWith('C') ? 'credit' : flag.startsWith('D') ? 'debit' : 'debit';
    lines.push({ txnDate, description, reference: '', amount, direction });
  }
  if (!lines.length) {
    throw new FinanceValidationError('Could not read transactions from this PDF. Try exporting the statement as Excel.');
  }
  return lines;
}

async function parseStatementFile(file: File): Promise<{ lines: ParsedLine[]; mime: string; buffer: Buffer }> {
  const name = (file.name || '').toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());
  if (name.endsWith('.csv') || file.type.includes('csv') || file.type === 'text/plain') {
    return { lines: parseCsv(buffer), mime: 'text/csv', buffer };
  }
  if (name.endsWith('.xlsx') || name.endsWith('.xls') || file.type.includes('sheet') || file.type.includes('excel')) {
    // Old .xls is not supported by ExcelJS; if load fails, try CSV text fallback.
    try {
      return { lines: await parseExcel(buffer), mime: file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer };
    } catch (err) {
      if (name.endsWith('.xls')) {
        throw new FinanceValidationError('Old .xls format is not supported. Open the file and save as .xlsx or CSV, then import again.');
      }
      throw err;
    }
  }
  if (name.endsWith('.pdf') || file.type === 'application/pdf') {
    return { lines: await parsePdf(buffer), mime: 'application/pdf', buffer };
  }
  // Some browsers send blank mime for xlsx — attempt Excel then CSV.
  try {
    return { lines: await parseExcel(buffer), mime: file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer };
  } catch {
    try {
      return { lines: parseCsv(buffer), mime: 'text/csv', buffer };
    } catch {
      throw new FinanceValidationError('Upload an Excel (.xlsx), CSV, or PDF bank statement');
    }
  }
}

export type BankStatementLineFilters = {
  year?: number;
  month?: number;
  module?: string;
  q?: string;
  type?: string;
  category?: string;
  partyName?: string;
  partyId?: string;
  serviceId?: string;
  page?: number;
  pageSize?: number;
};

function buildLineFilters(params: BankStatementLineFilters) {
  const where: string[] = [`l.status = 'posted'`, `s.status <> 'cancelled'`];
  const values: unknown[] = [];
  if (params.year) {
    values.push(params.year);
    where.push(`s.statement_year = $${values.length}`);
  }
  if (params.month) {
    values.push(params.month);
    where.push(`s.statement_month = $${values.length}`);
  }
  if (params.module && params.module !== 'all') {
    values.push(params.module);
    where.push(`l.source_module = $${values.length}`);
  }
  if (params.type === 'credit' || params.type === 'debit') {
    values.push(params.type);
    where.push(`l.direction = $${values.length}`);
  }
  if (params.category) {
    values.push(params.category);
    where.push(`l.category_label = $${values.length}`);
  }
  if (params.partyId) {
    values.push(params.partyId);
    where.push(`l.party_id = $${values.length}`);
  } else if (params.partyName) {
    values.push(params.partyName);
    where.push(`l.party_name = $${values.length}`);
  }
  if (params.serviceId) {
    values.push(params.serviceId);
    where.push(`l.service_id = $${values.length}`);
  }
  if (params.q) {
    values.push(`%${params.q}%`);
    where.push(
      `(l.description ILIKE $${values.length} OR COALESCE(l.reference,'') ILIKE $${values.length} OR COALESCE(l.party_name,'') ILIKE $${values.length} OR l.amount::text ILIKE $${values.length})`
    );
  }
  return { where, values, clause: `WHERE ${where.join(' AND ')}` };
}

export async function listBankStatementLines(params: BankStatementLineFilters) {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(5000, Math.max(20, params.pageSize || 20));
  const { values, clause } = buildLineFilters(params);
  const { rows } = await q(
    undefined,
    `SELECT l.*, s.statement_year, s.statement_month, s.original_filename,
            svc.service_name
     FROM finance_bank_statement_lines l
     JOIN finance_bank_statements s ON s.id = l.statement_id
     LEFT JOIN finance_services svc ON svc.id = l.service_id
     ${clause}
     ORDER BY l.txn_date DESC, l.line_no DESC
     LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
    values
  );
  const count = await q<{ count: string }>(
    undefined,
    `SELECT COUNT(*)::text AS count
     FROM finance_bank_statement_lines l
     JOIN finance_bank_statements s ON s.id = l.statement_id
     ${clause}`,
    values
  );
  // Category dropdown options should ignore the selected category so all filter choices remain visible.
  const categoryFilters = buildLineFilters({ ...params, category: undefined });
  const categories = await q<{ category_label: string }>(
    undefined,
    `SELECT DISTINCT l.category_label
     FROM finance_bank_statement_lines l
     JOIN finance_bank_statements s ON s.id = l.statement_id
     ${categoryFilters.clause} AND COALESCE(l.category_label,'') <> ''
     ORDER BY l.category_label ASC`,
    categoryFilters.values
  );
  return {
    rows,
    total: Number(count.rows[0]?.count || 0),
    page,
    pageSize,
    categories: categories.rows.map((row) => row.category_label).filter(Boolean),
  };
}

export async function listBankStatementProviders(params: { year?: number; month?: number; module?: string } = {}) {
  const { values, clause } = buildLineFilters(params);
  const { rows } = await q<{ party_name: string; party_id: string | null; party_type: string | null; count: string }>(
    undefined,
    `SELECT l.party_name, l.party_id::text AS party_id, l.party_type, COUNT(*)::text AS count
     FROM finance_bank_statement_lines l
     JOIN finance_bank_statements s ON s.id = l.statement_id
     ${clause} AND l.party_name IS NOT NULL AND btrim(l.party_name) <> ''
     GROUP BY l.party_name, l.party_id, l.party_type
     ORDER BY l.party_name ASC`,
    values
  );
  return rows.map((row) => ({
    partyName: row.party_name,
    partyId: row.party_id,
    partyType: row.party_type,
    count: Number(row.count || 0),
  }));
}

export async function bankStatementSummary(year?: number, month?: number, filters: Omit<BankStatementLineFilters, 'year' | 'month' | 'page' | 'pageSize'> = {}) {
  const { values, clause } = buildLineFilters({ ...filters, year, month });
  const { rows } = await q<{
    credits: string;
    debits: string;
    income_count: string;
    expense_count: string;
    sridhar_count: string;
    sridhar_in: string;
    sridhar_out: string;
    total_count: string;
  }>(
    undefined,
    `SELECT
       COALESCE(SUM(CASE WHEN l.direction='credit' THEN l.amount ELSE 0 END),0)::text AS credits,
       COALESCE(SUM(CASE WHEN l.direction='debit' THEN l.amount ELSE 0 END),0)::text AS debits,
       COUNT(*) FILTER (WHERE l.source_module='income' AND l.status='posted')::text AS income_count,
       COUNT(*) FILTER (WHERE l.source_module='expense' AND l.status='posted')::text AS expense_count,
       COUNT(*) FILTER (WHERE l.source_module='sridhar' AND l.status='posted')::text AS sridhar_count,
       COALESCE(SUM(CASE WHEN l.source_module='sridhar' AND l.direction='credit' THEN l.amount ELSE 0 END),0)::text AS sridhar_in,
       COALESCE(SUM(CASE WHEN l.source_module='sridhar' AND l.direction='debit' THEN l.amount ELSE 0 END),0)::text AS sridhar_out,
       COUNT(*) FILTER (WHERE l.status = 'posted')::text AS total_count
     FROM finance_bank_statement_lines l
     JOIN finance_bank_statements s ON s.id = l.statement_id
     ${clause}`,
    values
  );
  const summary = rows[0];
  const credits = Number(summary?.credits || 0);
  const debits = Number(summary?.debits || 0);
  const periodLabel =
    year && month ? `${MONTHS[month - 1]} ${year}` : year ? `Year ${year}` : month ? MONTHS[month - 1] : 'All periods';
  return {
    year: year || null,
    month: month || null,
    periodLabel,
    totalCredits: credits,
    totalDebits: debits,
    netBalance: credits - debits,
    sridharIn: Number(summary?.sridhar_in || 0),
    sridharOut: Number(summary?.sridhar_out || 0),
    incomeCount: Number(summary?.income_count || 0),
    expenseCount: Number(summary?.expense_count || 0),
    sridharCount: Number(summary?.sridhar_count || 0),
    totalCount: Number(summary?.total_count || 0),
  };
}

export async function listBankStatements(year?: number, month?: number) {
  const where: string[] = [`status <> 'cancelled'`];
  const values: unknown[] = [];
  if (year) {
    values.push(year);
    where.push(`statement_year = $${values.length}`);
  }
  if (month) {
    values.push(month);
    where.push(`statement_month = $${values.length}`);
  }
  const { rows } = await q(
    undefined,
    `SELECT * FROM finance_bank_statements WHERE ${where.join(' AND ')} ORDER BY statement_year DESC, statement_month DESC, created_at DESC`,
    values
  );
  return rows;
}

export async function listIncomeRegister(params: { year?: number; month?: number; q?: string; page?: number; pageSize?: number }) {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(5000, Math.max(20, params.pageSize || 20));
  const where = [`i.status = 'active'`];
  const values: unknown[] = [];
  if (params.year) {
    values.push(params.year);
    where.push(`EXTRACT(YEAR FROM i.income_date)::int = $${values.length}`);
  }
  if (params.month) {
    values.push(params.month);
    where.push(`EXTRACT(MONTH FROM i.income_date)::int = $${values.length}`);
  }
  if (params.q) {
    values.push(`%${params.q}%`);
    where.push(`(i.description ILIKE $${values.length} OR COALESCE(i.transaction_reference,'') ILIKE $${values.length})`);
  }
  const clause = `WHERE ${where.join(' AND ')}`;
  const { rows } = await q(
    undefined,
    `SELECT i.*, c.category_name
     FROM finance_income i
     LEFT JOIN finance_income_categories c ON c.id = i.category_id
     ${clause}
     ORDER BY i.income_date DESC, i.created_at DESC
     LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
    values
  );
  const count = await q<{ count: string; total_amount: string }>(
    undefined,
    `SELECT COUNT(*)::text AS count,
            COALESCE(SUM(COALESCE(i.net_received, i.gross_amount, 0)),0)::text AS total_amount
     FROM finance_income i ${clause}`,
    values
  );
  return {
    rows,
    total: Number(count.rows[0]?.count || 0),
    totalAmount: Number(count.rows[0]?.total_amount || 0),
    page,
    pageSize,
  };
}

export async function listExpenseRegister(params: { year?: number; month?: number; q?: string; page?: number; pageSize?: number; source?: string }) {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(5000, Math.max(20, params.pageSize || 20));
  const where = [`e.status = 'recorded'`];
  const values: unknown[] = [];
  if (params.year) {
    values.push(params.year);
    where.push(`EXTRACT(YEAR FROM e.expense_date)::int = $${values.length}`);
  }
  if (params.month) {
    values.push(params.month);
    where.push(`EXTRACT(MONTH FROM e.expense_date)::int = $${values.length}`);
  }
  if (params.source) {
    values.push(params.source);
    where.push(`COALESCE(e.source,'manual') = $${values.length}`);
  }
  if (params.q) {
    values.push(`%${params.q}%`);
    where.push(`(e.description ILIKE $${values.length} OR COALESCE(e.transaction_reference,'') ILIKE $${values.length})`);
  }
  const clause = `WHERE ${where.join(' AND ')}`;
  const { rows } = await q(
    undefined,
    `SELECT e.*, c.category_name, v.vendor_name
     FROM finance_expenses e
     LEFT JOIN finance_expense_categories c ON c.id = e.category_id
     LEFT JOIN finance_vendors v ON v.id = e.vendor_id
     ${clause}
     ORDER BY e.expense_date DESC, e.created_at DESC
     LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
    values
  );
  const count = await q<{ count: string; total_amount: string }>(
    undefined,
    `SELECT COUNT(*)::text AS count,
            COALESCE(SUM(COALESCE(e.total_amount, 0)),0)::text AS total_amount
     FROM finance_expenses e ${clause}`,
    values
  );
  return {
    rows,
    total: Number(count.rows[0]?.count || 0),
    totalAmount: Number(count.rows[0]?.total_amount || 0),
    page,
    pageSize,
  };
}

export async function listSridharFunding(params: {
  year?: number;
  month?: number;
  q?: string;
  direction?: string;
  kind?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(5000, Math.max(20, params.pageSize || 20));
  const kindExpr = sridharKindSql('description');
  const where = [`status = 'active'`];
  const values: unknown[] = [];
  if (params.year) {
    values.push(params.year);
    where.push(`EXTRACT(YEAR FROM txn_date)::int = $${values.length}`);
  }
  if (params.month) {
    values.push(params.month);
    where.push(`EXTRACT(MONTH FROM txn_date)::int = $${values.length}`);
  }
  if (params.direction === 'credit' || params.direction === 'debit') {
    values.push(params.direction);
    where.push(`direction = $${values.length}`);
  }
  const kind = String(params.kind || '').toLowerCase();
  if (['loan', 'investment', 'funding', 'payment', 'other'].includes(kind)) {
    values.push(kind);
    where.push(`(${kindExpr}) = $${values.length}`);
  }
  if (params.q) {
    values.push(`%${params.q}%`);
    where.push(
      `(description ILIKE $${values.length} OR COALESCE(reference,'') ILIKE $${values.length} OR COALESCE(category_label,'') ILIKE $${values.length} OR (${kindExpr}) ILIKE $${values.length})`
    );
  }
  const clause = `WHERE ${where.join(' AND ')}`;
  const { rows } = await q(
    undefined,
    `SELECT *, (${kindExpr}) AS funding_kind
     FROM finance_sridhar_funding ${clause}
     ORDER BY txn_date DESC, created_at DESC
     LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
    values
  );
  const count = await q<{ count: string }>(undefined, `SELECT COUNT(*)::text AS count FROM finance_sridhar_funding ${clause}`, values);
  const totals = await q<{ credit: string; debit: string }>(
    undefined,
    `SELECT
       COALESCE(SUM(amount) FILTER (WHERE direction='credit'),0)::text AS credit,
       COALESCE(SUM(amount) FILTER (WHERE direction='debit'),0)::text AS debit
     FROM finance_sridhar_funding ${clause}`,
    values
  );
  return {
    rows: rows.map((row) => ({
      ...row,
      funding_kind: row.funding_kind || sridharKindFromDescription(String(row.description || '')),
      category_label: row.category_label || sridharCategoryFromDescription(String(row.description || '')),
    })),
    total: Number(count.rows[0]?.count || 0),
    page,
    pageSize,
    totalIn: Number(totals.rows[0]?.credit || 0),
    totalOut: Number(totals.rows[0]?.debit || 0),
  };
}

export async function importBankStatement(file: File, body: Record<string, unknown>, userId: string) {
  const month = Number(body.month || body.statement_month);
  const year = Number(body.year || body.statement_year);
  const mode = String(body.mode || 'strict') === 'fill_missing' ? 'fill_missing' : 'strict';
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new FinanceValidationError('Select a valid statement month');
  if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new FinanceValidationError('Select a valid statement year');

  const parsed = await parseStatementFile(file);
  if (!parsed.lines.length) throw new FinanceValidationError('No transactions found in the statement');

  const periodLines = parsed.lines.filter((line) => {
    const [y, m] = line.txnDate.split('-').map(Number);
    return y === year && m === month;
  });
  // Never fall back to the whole file — that re-posts other months when the wrong period is selected.
  if (!periodLines.length) {
    const sample = parsed.lines[0]?.txnDate || '';
    throw new FinanceValidationError(
      `No transactions found for ${MONTHS[month - 1]} ${year}. This file looks like it belongs to another period${sample ? ` (e.g. ${sample})` : ''}. Pick the matching month/year.`
    );
  }
  const lines = periodLines;
  const hash = contentHash(parsed.buffer);
  const employees = await loadEmployees();
  const classifiedLines = await classifyLines(lines, employees);

  // Same file content already imported for any month — block in strict mode.
  const existingSameFileAnywhere = await q(
    undefined,
    `SELECT id, statement_year, statement_month, line_count FROM finance_bank_statements
     WHERE content_hash=$1 AND status <> 'cancelled'
     ORDER BY created_at ASC
     LIMIT 1`,
    [hash]
  );
  if (existingSameFileAnywhere.rows[0] && mode === 'strict') {
    const row = existingSameFileAnywhere.rows[0];
    throw new FinanceConflictError(
      `This bank statement file was already imported (${MONTHS[Number(row.statement_month) - 1]} ${row.statement_year}). Enable “Only add missing transactions” to fill gaps.`
    );
  }

  const existingSameFile = await q(
    undefined,
    `SELECT id, line_count FROM finance_bank_statements
     WHERE statement_year=$1 AND statement_month=$2 AND content_hash=$3 AND status <> 'cancelled'
     LIMIT 1`,
    [year, month, hash]
  );

  // Pre-check how many are new vs duplicate before writing a statement row.
  let wouldPost = 0;
  let wouldSkip = 0;
  for (const line of lines) {
    const fp = fingerprint(line);
    const existing = await findExistingBankLine(undefined, line, fp);
    if (existing) wouldSkip += 1;
    else wouldPost += 1;
  }
  if (!wouldPost) {
    throw new FinanceConflictError(
      mode === 'fill_missing'
        ? 'No missing transactions found. Everything in this file is already imported.'
        : 'All transactions in this statement were already imported.'
    );
  }

  const stored = await saveFinanceBuffer(parsed.buffer, 'bank-statements', file.name || `statement-${year}-${month}`, parsed.mime);
  const partyCatalog = await loadPartyCatalog();

  return withFinanceTx(async (db) => {
    const vendorId = await ensureGeneralVendor(db);
    const incomeCatFallback = (await categoryIdByCode('finance_income_categories', 'bank_credit')) || null;
    const expenseCatFallback = (await categoryIdByCode('finance_expense_categories', 'bank_debit')) || null;
    const salaryCat = (await categoryIdByCode('finance_expense_categories', 'employee_salaries')) || expenseCatFallback;

    let statement = existingSameFile.rows[0] || null;
    if (!statement) {
      const inserted = await q(
        db,
        `INSERT INTO finance_bank_statements (
           statement_month, statement_year, original_filename, stored_filename, storage_path, mime_type, file_size,
           status, notes, content_hash, imported_by, created_by, updated_by
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,'posted',$8,$9,$10,$10,$10)
         RETURNING *`,
        [
          month,
          year,
          stored.original_filename,
          stored.stored_filename,
          stored.storage_path,
          stored.mime_type,
          stored.file_size,
          body.notes || (mode === 'fill_missing' ? 'fill_missing' : null),
          hash,
          userId,
        ]
      );
      statement = inserted.rows[0];
    }

    let incomeCount = 0;
    let expenseCount = 0;
    let sridharCount = 0;
    let salaryCount = 0;
    let reconciledCount = 0;
    let creditTotal = 0;
    let debitTotal = 0;
    let posted = 0;
    let duplicates = 0;
    let lineNo = 0;

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      lineNo += 1;
      const fp = fingerprint(line);
      const existing = await findExistingBankLine(db, line, fp);
      if (existing) {
        duplicates += 1;
        continue;
      }
      const classified = classifiedLines[index] || classifyHeuristic(line.description, line.direction, employees);
      if (line.direction === 'credit') creditTotal += line.amount;
      else debitTotal += line.amount;

      const categoryLabel = classified.matchedEmployee
        ? `${classified.category}${classified.category === 'Employee Salaries' ? ` · ${classified.matchedEmployee}` : ''}`
        : classified.category;

      const party = matchPartyFromNarration(line.description, line.direction, partyCatalog, classified.matchedEmployee);
      const service = matchServiceFromNarration(line.description, partyCatalog);
      const reconcileKey = buildReconcileKey({
        partyId: party?.partyId || null,
        amount: line.amount,
        serviceId: service?.serviceId || null,
        direction: line.direction,
        txnDate: line.txnDate,
      });

      // Business-key duplicate: same party + amount + service + date already posted from another statement.
      if (party?.partyId) {
        const businessDup = await q(
          db,
          `SELECT id FROM finance_bank_statement_lines
           WHERE reconcile_key = $1 AND status = 'posted'
           LIMIT 1`,
          [reconcileKey]
        );
        if (businessDup.rows[0]) {
          duplicates += 1;
          continue;
        }
      }

      const { rows: lineRows } = await q(
        db,
        `INSERT INTO finance_bank_statement_lines (
           statement_id, line_no, txn_date, description, reference, amount, direction, source_module,
           category_label, status, fingerprint, party_type, party_id, party_name, service_id, reconcile_key,
           created_by, updated_by
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'posted',$10,$11,$12,$13,$14,$15,$16,$16)
         RETURNING *`,
        [
          statement.id,
          lineNo,
          line.txnDate,
          line.description,
          line.reference || null,
          fromCents(toCents(line.amount)),
          line.direction,
          classified.module,
          categoryLabel,
          fp,
          party?.partyType || null,
          party?.partyId || null,
          party?.partyName || null,
          service?.serviceId || null,
          party?.partyId ? reconcileKey : null,
          userId,
        ]
      );
      const savedLine = lineRows[0];
      let incomeId: string | null = null;
      let expenseId: string | null = null;
      let sridharId: string | null = null;
      let transactionId: string | null = null;
      let matchedPaymentId: string | null = null;
      let matchedInvoiceId: string | null = null;
      let matchedReceiptId: string | null = null;

      if (classified.module === 'income') {
        const matchedPayment = await findMatchingInvoicePayment(db, {
          amount: line.amount,
          txnDate: line.txnDate,
          partyId: party?.partyType === 'client' ? party.partyId : null,
          serviceId: service?.serviceId || null,
          reference: line.reference || null,
          description: line.description,
        });

        const existingIncome = await findDuplicateIncome(db, {
          clientId: party?.partyType === 'client' ? party.partyId : matchedPayment?.client_id || null,
          amount: line.amount,
          txnDate: line.txnDate,
          serviceId: service?.serviceId || matchedPayment?.service_id || null,
          invoiceId: matchedPayment?.invoice_id || null,
        });

        if (existingIncome) {
          incomeId = existingIncome.id;
          incomeCount += 1;
          reconciledCount += 1;
          await q(db, `UPDATE finance_income SET bank_statement_line_id=$2, updated_by=$3 WHERE id=$1`, [
            existingIncome.id,
            savedLine.id,
            userId,
          ]);
          if (matchedPayment?.id) {
            matchedPaymentId = matchedPayment.id;
            matchedInvoiceId = matchedPayment.invoice_id;
            await q(db, `UPDATE finance_invoice_payments SET bank_statement_line_id=$2 WHERE id=$1`, [
              matchedPayment.id,
              savedLine.id,
            ]);
          }
          // Do not create a second money_in transaction when income/payment already exists.
        } else if (matchedPayment?.id) {
          matchedPaymentId = matchedPayment.id;
          matchedInvoiceId = matchedPayment.invoice_id;
          reconciledCount += 1;
          const categoryId =
            (await categoryIdByCode('finance_income_categories', mapCategoryCode(classified.category, 'income'))) || incomeCatFallback;
          const income = await q(
            db,
            `INSERT INTO finance_income (
               income_date, client_id, source, category_id, invoice_id, payment_id, gross_amount, gst_amount, tds_amount, net_received,
               payment_mode, transaction_reference, description, status, created_by, updated_by, bank_statement_line_id
             ) VALUES ($1,$2,'invoice_payment',$3,$4,$5,$6,0,0,$6,'bank',$7,$8,'active',$9,$9,$10)
             RETURNING *`,
            [
              line.txnDate,
              matchedPayment.client_id,
              categoryId,
              matchedPayment.invoice_id,
              matchedPayment.id,
              fromCents(toCents(line.amount)),
              line.reference || null,
              line.description,
              userId,
              savedLine.id,
            ]
          );
          incomeId = income.rows[0].id;
          incomeCount += 1;
          await q(db, `UPDATE finance_invoice_payments SET bank_statement_line_id=$2 WHERE id=$1`, [
            matchedPayment.id,
            savedLine.id,
          ]);
          // Invoice payment already created the cash transaction — skip bank_income.
        } else {
          const categoryId =
            (await categoryIdByCode('finance_income_categories', mapCategoryCode(classified.category, 'income'))) || incomeCatFallback;
          const income = await q(
            db,
            `INSERT INTO finance_income (
               income_date, client_id, source, category_id, invoice_id, gross_amount, gst_amount, tds_amount, net_received,
               payment_mode, transaction_reference, description, status, created_by, updated_by, bank_statement_line_id
             ) VALUES ($1,$2,'bank_statement',$3,$4,$5,0,0,$5,'bank',$6,$7,'active',$8,$8,$9)
             RETURNING *`,
            [
              line.txnDate,
              party?.partyType === 'client' ? party.partyId : null,
              categoryId,
              matchedPayment && 'invoice_id' in matchedPayment ? matchedPayment.invoice_id : null,
              fromCents(toCents(line.amount)),
              line.reference || null,
              line.description,
              userId,
              savedLine.id,
            ]
          );
          incomeId = income.rows[0].id;
          incomeCount += 1;
          if (matchedPayment && 'invoice_id' in matchedPayment) matchedInvoiceId = matchedPayment.invoice_id;
          const txn = await q(
            db,
            `INSERT INTO finance_transactions (
               transaction_date, transaction_type, reference_type, reference_id, party_type, party_id, description, money_in, money_out,
               payment_mode, transaction_reference, status, created_by, updated_by
             ) VALUES ($1,'bank_income','bank_statement_line',$2,$3,$4,$5,$6,0,'bank',$7,'active',$8,$8)
             RETURNING id`,
            [
              line.txnDate,
              savedLine.id,
              party?.partyType || null,
              party?.partyId || null,
              line.description,
              fromCents(toCents(line.amount)),
              line.reference || null,
              userId,
            ]
          );
          transactionId = txn.rows[0].id;
        }
      } else if (classified.module === 'expense') {
        const isSalary = /salary|payroll|wage/i.test(classified.category);
        const matchedReceipt = await findMatchingReceipt(db, {
          amount: line.amount,
          txnDate: line.txnDate,
          partyId: party?.partyId || null,
          reference: line.reference || null,
          description: line.description,
        });
        const existingExpense =
          matchedReceipt ||
          (await findDuplicateExpense(db, {
            vendorId: party?.partyType === 'vendor' ? party.partyId : null,
            clientId: party?.partyType === 'client' ? party.partyId : null,
            amount: line.amount,
            txnDate: line.txnDate,
            description: line.description,
          }));

        if (existingExpense) {
          expenseId = existingExpense.id;
          matchedReceiptId = existingExpense.id;
          expenseCount += 1;
          reconciledCount += 1;
          await q(
            db,
            `UPDATE finance_expenses
             SET bank_statement_line_id=$2, source=COALESCE(NULLIF(source,''),'manual'), updated_by=$3
             WHERE id=$1`,
            [existingExpense.id, savedLine.id, userId]
          );
          // Receipt / expense already exists — do not create another money_out txn.
        } else {
          const categoryId = isSalary
            ? salaryCat
            : (await categoryIdByCode('finance_expense_categories', mapCategoryCode(classified.category, 'expense'))) ||
              expenseCatFallback;
          const fy = formatFinancialYear(line.txnDate, 'short');
          const { rows: numRows } = await q<{ finance_next_receipt_number: string }>(
            db,
            `SELECT finance_next_receipt_number('RCP',$1,'-',3,TRUE)`,
            [fy]
          );
          const receiptNumber = numRows[0]?.finance_next_receipt_number;
          const expenseVendorId = party?.partyType === 'vendor' ? party.partyId : vendorId;
          const expense = await q(
            db,
            `INSERT INTO finance_expenses (
               receipt_number, expense_date, vendor_id, category_id, description, vendor_invoice_number,
               currency, taxable_amount, total_amount, amount_paid, balance_amount, payment_status,
               payment_mode, transaction_reference, payment_date, notes, status, source, client_id,
               created_by, updated_by, bank_statement_line_id
             ) VALUES ($1,$2,$3,$4,$5,$6,'INR',$7,$7,$7,0,'paid','bank',$8,$2,$9,'recorded','bank_statement',$10,$11,$11,$12)
             RETURNING *`,
            [
              receiptNumber,
              line.txnDate,
              expenseVendorId,
              categoryId,
              line.description,
              `BANK-${year}${String(month).padStart(2, '0')}-${lineNo}`,
              fromCents(toCents(line.amount)),
              line.reference || null,
              isSalary
                ? `Salary from bank statement${classified.matchedEmployee ? ` · ${classified.matchedEmployee}` : ''}`
                : `Imported from bank statement ${stored.original_filename}`,
              party?.partyType === 'client' ? party.partyId : null,
              userId,
              savedLine.id,
            ]
          );
          expenseId = expense.rows[0].id;
          expenseCount += 1;
          if (isSalary) salaryCount += 1;
          const txn = await q(
            db,
            `INSERT INTO finance_transactions (
               transaction_date, transaction_type, reference_type, reference_id, party_type, party_id, description, money_in, money_out,
               payment_mode, transaction_reference, status, created_by, updated_by
             ) VALUES ($1,$2,'bank_statement_line',$3,$4,$5,$6,0,$7,'bank',$8,'active',$9,$9)
             RETURNING id`,
            [
              line.txnDate,
              isSalary ? 'salary_payment' : 'bank_expense',
              savedLine.id,
              party?.partyType || 'vendor',
              party?.partyId || expenseVendorId,
              line.description,
              fromCents(toCents(line.amount)),
              line.reference || null,
              userId,
            ]
          );
          transactionId = txn.rows[0].id;
        }
      } else {
        const sridhar = await q(
          db,
          `INSERT INTO finance_sridhar_funding (
             txn_date, direction, amount, description, reference, category_label, status, statement_id, created_by, updated_by
           ) VALUES ($1,$2,$3,$4,$5,$6,'active',$7,$8,$8)
           RETURNING *`,
          [
            line.txnDate,
            line.direction,
            fromCents(toCents(line.amount)),
            line.description,
            line.reference || null,
            categoryLabel || sridharCategoryFromDescription(line.description),
            statement.id,
            userId,
          ]
        );
        sridharId = sridhar.rows[0].id;
        sridharCount += 1;
        const txn = await q(
          db,
          `INSERT INTO finance_transactions (
             transaction_date, transaction_type, reference_type, reference_id, description, money_in, money_out,
             payment_mode, transaction_reference, status, created_by, updated_by
           ) VALUES ($1,'sridhar_funding','bank_statement_line',$2,$3,$4,$5,'bank',$6,'active',$7,$7)
           RETURNING id`,
          [
            line.txnDate,
            savedLine.id,
            line.description,
            line.direction === 'credit' ? fromCents(toCents(line.amount)) : 0,
            line.direction === 'debit' ? fromCents(toCents(line.amount)) : 0,
            line.reference || null,
            userId,
          ]
        );
        transactionId = txn.rows[0].id;
      }

      await q(
        db,
        `UPDATE finance_bank_statement_lines
         SET income_id=$2, expense_id=$3, sridhar_id=$4, transaction_id=$5,
             matched_payment_id=$6, matched_invoice_id=$7, matched_receipt_id=$8,
             party_name=COALESCE(party_name,$9)
         WHERE id=$1`,
        [
          savedLine.id,
          incomeId,
          expenseId,
          sridharId,
          transactionId,
          matchedPaymentId,
          matchedInvoiceId,
          matchedReceiptId,
          party?.partyName || null,
        ]
      );
      posted += 1;
    }

    if (!posted) {
      throw new FinanceConflictError('No new transactions could be imported.');
    }

    const { rows: updated } = await q(
      db,
      `UPDATE finance_bank_statements SET
         total_credits = COALESCE(total_credits,0) + $2,
         total_debits = COALESCE(total_debits,0) + $3,
         income_count = COALESCE(income_count,0) + $4,
         expense_count = COALESCE(expense_count,0) + $5,
         sridhar_count = COALESCE(sridhar_count,0) + $6,
         line_count = COALESCE(line_count,0) + $7,
         content_hash = COALESCE(content_hash, $8),
         updated_by=$9, updated_at=NOW()
       WHERE id=$1 RETURNING *`,
      [
        statement.id,
        fromCents(toCents(creditTotal)),
        fromCents(toCents(debitTotal)),
        incomeCount,
        expenseCount,
        sridharCount,
        posted,
        hash,
        userId,
      ]
    );

    await writeFinanceAudit(db, {
      userId,
      action: mode === 'fill_missing' ? 'Bank Statement Missing Rows Imported' : 'Bank Statement Imported',
      entityType: 'bank_statement',
      entityId: statement.id,
      next: { year, month, mode, posted, duplicates, incomeCount, expenseCount, sridharCount, salaryCount, reconciledCount },
    });

    return {
      statement: updated[0],
      posted,
      duplicates,
      incomeCount,
      expenseCount,
      sridharCount,
      salaryCount,
      reconciledCount,
      mode,
      summary: await bankStatementSummary(year, month),
    };
  });
}

function periodFilenamePart(year?: number, month?: number) {
  if (year && month) return `${year}-${String(month).padStart(2, '0')}`;
  if (year) return String(year);
  return 'all';
}

export async function exportIncomeRegister(params: { year?: number; month?: number; q?: string }) {
  const { rows } = await listIncomeRegister({ ...params, page: 1, pageSize: 5000 });
  const buffer = await buildWorkbook([
    {
      name: 'Income',
      columns: [
        { header: 'Date', key: 'date', width: 12 },
        { header: 'Description', key: 'description', width: 42 },
        { header: 'Category', key: 'category', width: 20 },
        { header: 'Source', key: 'source', width: 16 },
        { header: 'Reference', key: 'reference', width: 20 },
        { header: 'Amount', key: 'amount', width: 14 },
      ],
      rows: rows.map((row) => ({
        date: String(row.income_date || '').slice(0, 10),
        description: row.description || '',
        category: row.category_name || '',
        source: String(row.source || 'manual').replace(/_/g, ' '),
        reference: row.transaction_reference || '',
        amount: Number(row.net_received || row.gross_amount || 0),
      })),
    },
  ]);
  return { buffer, filename: `income-${periodFilenamePart(params.year, params.month)}.xlsx` };
}

export async function exportExpenseRegister(params: { year?: number; month?: number; q?: string; source?: string }) {
  const { rows } = await listExpenseRegister({ ...params, page: 1, pageSize: 5000 });
  const buffer = await buildWorkbook([
    {
      name: 'Expenses',
      columns: [
        { header: 'Date', key: 'date', width: 12 },
        { header: 'Description', key: 'description', width: 42 },
        { header: 'Category', key: 'category', width: 20 },
        { header: 'Vendor', key: 'vendor', width: 22 },
        { header: 'Source', key: 'source', width: 16 },
        { header: 'Reference', key: 'reference', width: 20 },
        { header: 'Amount', key: 'amount', width: 14 },
      ],
      rows: rows.map((row) => ({
        date: String(row.expense_date || '').slice(0, 10),
        description: row.description || '',
        category: row.category_name || '',
        vendor: row.vendor_name || '',
        source: String(row.source || 'manual').replace(/_/g, ' '),
        reference: row.transaction_reference || '',
        amount: Number(row.total_amount || 0),
      })),
    },
  ]);
  return { buffer, filename: `expenses-${periodFilenamePart(params.year, params.month)}.xlsx` };
}

export async function exportSridharFunding(params: {
  year?: number;
  month?: number;
  q?: string;
  direction?: string;
  kind?: string;
}) {
  const { rows, totalIn, totalOut } = await listSridharFunding({ ...params, page: 1, pageSize: 5000 });
  const buffer = await buildWorkbook([
    {
      name: 'Summary',
      columns: [
        { header: 'Metric', key: 'metric', width: 24 },
        { header: 'Value', key: 'value', width: 18 },
      ],
      rows: [
        { metric: 'Investment In', value: totalIn },
        { metric: 'Investment Out', value: totalOut },
        { metric: 'Net', value: totalIn - totalOut },
        { metric: 'Exported rows', value: rows.length },
      ],
    },
    {
      name: 'Sridhar Investment',
      columns: [
        { header: 'Date', key: 'date', width: 12 },
        { header: 'Type', key: 'kind', width: 14 },
        { header: 'Category', key: 'category', width: 20 },
        { header: 'Description', key: 'description', width: 42 },
        { header: 'Direction', key: 'direction', width: 12 },
        { header: 'Reference', key: 'reference', width: 20 },
        { header: 'Amount', key: 'amount', width: 14 },
      ],
      rows: rows.map((row) => ({
        date: String(row.txn_date || '').slice(0, 10),
        kind: String(row.funding_kind || sridharKindFromDescription(String(row.description || ''))),
        category: row.category_label || sridharCategoryFromDescription(String(row.description || '')),
        description: row.description || '',
        direction: row.direction === 'credit' ? 'In' : 'Out',
        reference: row.reference || '',
        amount: Number(row.amount || 0),
      })),
    },
  ]);
  return { buffer, filename: `sridhar-investment-${periodFilenamePart(params.year, params.month)}.xlsx` };
}

export async function exportBankStatementReport(filters: BankStatementLineFilters) {
  const summary = await bankStatementSummary(filters.year, filters.month, filters);
  const { rows } = await listBankStatementLines({ ...filters, page: 1, pageSize: 5000 });
  const buffer = await buildWorkbook([
    {
      name: 'Summary',
      columns: [
        { header: 'Metric', key: 'metric', width: 28 },
        { header: 'Value', key: 'value', width: 22 },
      ],
      rows: [
        { metric: 'Period', value: summary.periodLabel },
        { metric: 'Service provider filter', value: filters.partyName || filters.partyId || 'All' },
        { metric: 'Total Credits / Income', value: summary.totalCredits },
        { metric: 'Total Debits / Expenses', value: summary.totalDebits },
        { metric: 'Net Balance', value: summary.netBalance },
        { metric: 'Sridhar Investment In', value: summary.sridharIn },
        { metric: 'Sridhar Investment Out', value: summary.sridharOut },
        { metric: 'Income records', value: summary.incomeCount },
        { metric: 'Expense records', value: summary.expenseCount },
        { metric: 'Sridhar investment records', value: summary.sridharCount },
        { metric: 'Exported rows', value: rows.length },
      ],
    },
    {
      name: 'Transactions',
      columns: [
        { header: 'Date', key: 'date', width: 12 },
        { header: 'Description', key: 'description', width: 42 },
        { header: 'Service Provider', key: 'provider', width: 24 },
        { header: 'Service', key: 'service', width: 22 },
        { header: 'Category', key: 'category', width: 18 },
        { header: 'Module', key: 'module', width: 14 },
        { header: 'Type', key: 'type', width: 10 },
        { header: 'Amount', key: 'amount', width: 14 },
        { header: 'Reference', key: 'reference', width: 18 },
        { header: 'Status', key: 'status', width: 12 },
      ],
      rows: rows.map((row) => ({
        date: String(row.txn_date || '').slice(0, 10),
        description: row.description,
        provider: row.party_name || '',
        service: row.service_name || '',
        category: row.category_label,
        module: row.source_module,
        type: row.direction,
        amount: row.amount,
        reference: row.reference || '',
        status: row.status,
      })),
    },
  ]);
  const periodPart =
    filters.year && filters.month
      ? `${filters.year}-${String(filters.month).padStart(2, '0')}`
      : filters.year
        ? String(filters.year)
        : 'all';
  const providerPart = filters.partyName
    ? `-${String(filters.partyName).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)}`
    : '';
  return {
    buffer,
    filename: `bank-statement-${periodPart}${providerPart}.xlsx`,
  };
}
