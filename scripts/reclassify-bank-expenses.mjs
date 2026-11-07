/**
 * Reclassify posted bank expense lines + linked finance_expenses from description
 * (employee name → salary; food/utilities/travel/etc. keyword rules).
 */
import pg from 'pg';
import fs from 'fs';

function loadEnv() {
  const text = fs.readFileSync(new URL('../.env', import.meta.url), 'utf8');
  const map = new Map();
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i <= 0) continue;
    const key = line.slice(0, i).trim();
    let val = line.slice(i + 1);
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    map.set(key, val);
  }
  return map;
}

function normalizePersonName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(mr|mrs|ms|miss|shri|smt|dr)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function compactPersonName(value) {
  return normalizePersonName(value).replace(/\s+/g, '');
}
function nameTokens(value) {
  return normalizePersonName(value)
    .split(' ')
    .filter(
      (token) =>
        token.length >= 3 &&
        !['kumar', 'and', 'the', 'for', 'from', 'neft', 'imps', 'upi', 'rtgs', 'bank', 'india', 'payment', 'paymen', 'transfer'].includes(token)
    );
}
function tokenInHay(token, hay, hayCompact) {
  if (!token) return false;
  if (hay.includes(token) || hayCompact.includes(token)) return true;
  if (token.length >= 5) {
    for (const part of hay.split(/\s+/)) {
      if (part.length < 5 || Math.abs(part.length - token.length) > 2) continue;
      let miss = 0;
      let bi = 0;
      const a = part.length >= token.length ? part : token;
      const b = part.length >= token.length ? token : part;
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
function matchEmployee(description, employees) {
  const hay = normalizePersonName(description);
  if (!hay) return null;
  const hayCompact = compactPersonName(description);
  let best = null;
  const tokenOwners = new Map();
  for (const employee of employees) {
    for (const token of employee.tokens) tokenOwners.set(token, (tokenOwners.get(token) || 0) + 1);
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
    if (hits >= 2 && score >= 0.5 && (!best || score > best.score)) best = { employee, score: score + hits * 0.01 };
    const uniqueHit = employee.tokens.find(
      (token) => token.length >= 4 && tokenInHay(token, hay, hayCompact) && (tokenOwners.get(token) || 0) === 1
    );
    if (uniqueHit && (!best || best.score < 0.55)) best = { employee, score: 0.55 };
  }
  return best?.employee || null;
}

function expenseCategoryFromDescription(description) {
  const text = String(description || '').toLowerCase();
  if (!text) return null;
  if (/\b(salary|salaries|payroll|wage|wages|stipend|pay\s*slip|payslip)\b/.test(text)) return 'Employee Salaries';
  if (
    /\b(swiggy|zomato|kfc|mcdonald|mcd |dominos|domino|pizza|bakery|kitchen|restaurant|cafe|cafeteria|food|dining|blinkit|zepto|dunzo|bigbasket|starbucks|chai|coffee|canteen|mess|eatery|burger|biryani)\b/.test(
      text
    ) ||
    /ideal kitchen|swiss castle/.test(text)
  ) {
    return 'Food';
  }
  if (/\b(electric|electricity|water bill|gas bill|utility|utilities|tsspdcl|bescom|tata power|indane|hp gas|drink\s*prime)\b/.test(text)) {
    return 'Utilities';
  }
  if (/\b(jio|airtel|vodafone|\bvi\b|bsnl|postpaid|prepaid|broadband|wifi|internet|telecom|act fibernet|fiber)\b/.test(text)) {
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
  if (/\b(facebook|meta ads|google ads|linkedin|instagram|advertis|marketing|adwords)\b/.test(text)) return 'Marketing & Advertising';
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
  if (/\b(office supplies|stationery|printer|courier|postage|amazon|flipkart)\b/.test(text)) return 'Office Expenses';
  if (/\b(freelancer|contractor|consultancy|professional fee|ca fee|advocate)\b/.test(text)) return 'Professional Fees';
  return null;
}

function mapCategoryCode(label) {
  const key = String(label || '').toLowerCase();
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
  if (key.includes('bank charge')) return 'bank_charges';
  return 'bank_debit';
}

const env = loadEnv();
const client = new pg.Client({ connectionString: env.get('DATABASE_URL') || env.get('FINANCE_DATABASE_URL') || env.get('POSTGRES_URL') });
await client.connect();

const employees = (
  await client.query(`SELECT id, full_name, COALESCE(employee_code,'') AS employee_code FROM finance_employees WHERE COALESCE(status,'active') <> 'inactive'`)
).rows.map((row) => ({
  id: row.id,
  fullName: row.full_name,
  code: row.employee_code,
  tokens: nameTokens(row.full_name),
}));

const cats = (await client.query(`SELECT id, category_code, category_name FROM finance_expense_categories`)).rows;
const catByCode = new Map(cats.map((c) => [c.category_code, c]));

const lines = (
  await client.query(
    `SELECT id, description, direction, category_label, expense_id
     FROM finance_bank_statement_lines
     WHERE status = 'posted' AND source_module = 'expense'`
  )
).rows;

let updatedLines = 0;
let updatedExpenses = 0;
const counts = {};

for (const line of lines) {
  const employee = matchEmployee(line.description, employees);
  let category = null;
  let matchedEmployee = null;
  if (line.direction === 'debit' && employee) {
    category = 'Employee Salaries';
    matchedEmployee = employee.fullName;
  } else {
    category = expenseCategoryFromDescription(line.description);
  }
  if (!category) continue;
  const label = matchedEmployee && category === 'Employee Salaries' ? `${category} · ${matchedEmployee}` : category;
  if (label === line.category_label) {
    counts[category] = (counts[category] || 0) + 1;
    continue;
  }
  await client.query(`UPDATE finance_bank_statement_lines SET category_label = $2 WHERE id = $1`, [line.id, label]);
  updatedLines += 1;
  counts[category] = (counts[category] || 0) + 1;

  if (line.expense_id) {
    const code = mapCategoryCode(category);
    const cat = catByCode.get(code);
    if (cat) {
      await client.query(`UPDATE finance_expenses SET category_id = $2, description = COALESCE(description, $3) WHERE id = $1`, [
        line.expense_id,
        cat.id,
        line.description,
      ]);
      updatedExpenses += 1;
    }
  }
}

// Also fix expenses that have bank source but weak category, linked or by description.
const expenses = (
  await client.query(
    `SELECT e.id, e.description, e.category_id, c.category_code
     FROM finance_expenses e
     LEFT JOIN finance_expense_categories c ON c.id = e.category_id
     WHERE e.status = 'recorded' AND COALESCE(e.source,'') IN ('bank_statement','manual','')`
  )
).rows;

for (const expense of expenses) {
  const employee = matchEmployee(expense.description || '', employees);
  let category = employee ? 'Employee Salaries' : expenseCategoryFromDescription(expense.description || '');
  if (!category) continue;
  const code = mapCategoryCode(category);
  if (expense.category_code === code) continue;
  const cat = catByCode.get(code);
  if (!cat) continue;
  await client.query(`UPDATE finance_expenses SET category_id = $2 WHERE id = $1`, [expense.id, cat.id]);
  updatedExpenses += 1;
  counts[`expense:${category}`] = (counts[`expense:${category}`] || 0) + 1;
}

console.log({ updatedLines, updatedExpenses, counts, employees: employees.length });
await client.end();
