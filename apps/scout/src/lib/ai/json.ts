/** Models often wrap JSON in markdown fences even when asked for JSON only. */

export function extractJsonText(raw: string): string {
  const trimmed = (raw || '').trim().replace(/^\uFEFF/, '');
  if (!trimmed) return trimmed;

  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced) return fenced[1].trim();

  const inner = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (inner) return inner[1].trim();

  return extractBalancedJson(trimmed) || trimmed;
}

function extractBalancedJson(text: string): string | null {
  const obj = text.indexOf('{');
  const arr = text.indexOf('[');
  const start = obj >= 0 && (arr < 0 || obj < arr) ? obj : arr;
  if (start < 0) return null;

  const open = text[start];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === '\\') {
        escape = true;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === open) depth += 1;
    else if (ch === close) {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }

  return null;
}

function repairJson(text: string): string {
  return text
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/,\s*([}\]])/g, '$1');
}

export function parseModelJson<T = unknown>(raw: string): T {
  const extracted = extractJsonText(raw);
  const candidates = [extracted, repairJson(extracted)];
  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as T;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Invalid JSON');
}
