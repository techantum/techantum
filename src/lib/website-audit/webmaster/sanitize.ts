const SECRET = /(password|passwd|secret|token|api[_-]?key|authorization|cookie|session|bearer|ssn|credit.?card)/i;

export function sanitizeText(value: string, maxChars = 2000): string {
  const lines = String(value || '')
    .split(/\r?\n/)
    .filter((line) => !SECRET.test(line));
  return lines.join('\n').replace(SECRET, '[redacted]').slice(0, maxChars);
}

export function sanitizeEvidence(input: Record<string, unknown>, maxChars = 2000): Record<string, unknown> {
  const clone = JSON.parse(JSON.stringify(input)) as Record<string, unknown>;
  const walk = (node: unknown): unknown => {
    if (typeof node === 'string') return sanitizeText(node, maxChars);
    if (Array.isArray(node)) return node.slice(0, 20).map(walk);
    if (node && typeof node === 'object') {
      const out: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
        if (SECRET.test(key)) {
          out[key] = '[redacted]';
          continue;
        }
        out[key] = walk(value);
      }
      return out;
    }
    return node;
  };
  return walk(clone) as Record<string, unknown>;
}
