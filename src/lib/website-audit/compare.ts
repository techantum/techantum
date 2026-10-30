export type ComparableFinding = {
  fingerprint: string;
  rule_code: string;
  title: string;
  severity: string;
  status?: string;
};

export function compareFindings(previous: ComparableFinding[], current: ComparableFinding[]) {
  const prev = new Map(previous.map((item) => [item.fingerprint, item]));
  const next = new Map(current.map((item) => [item.fingerprint, item]));
  const fixed: ComparableFinding[] = [];
  const remaining: ComparableFinding[] = [];
  const created: ComparableFinding[] = [];
  for (const [key, item] of prev) {
    if (!next.has(key) || item.status === 'fixed') fixed.push(item);
    else remaining.push(next.get(key)!);
  }
  for (const [key, item] of next) {
    if (!prev.has(key)) created.push(item);
  }
  return {
    fixed,
    remaining,
    new: created,
    fixed_count: fixed.length,
    remaining_count: remaining.length,
    new_count: created.length,
  };
}

export function scoreDelta(previous: number | null, current: number | null) {
  if (previous == null || current == null) return { previous_score: previous, current_score: current, difference: null };
  return { previous_score: previous, current_score: current, difference: current - previous };
}
