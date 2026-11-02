export type ValidityStatus = 'valid' | 'invalid' | 'needs_review';
export type SalesPriority = 'hot' | 'warm' | 'cold' | 'unqualified';

export type QualificationInput = {
  hasPhone?: boolean;
  hasEmail?: boolean;
  responded?: boolean;
  interest?: string;
  timeline?: string;
  budget?: string;
  locationOk?: boolean;
  intentScore?: number;
  customScore?: number;
};

export type QualificationResult = {
  validity: ValidityStatus;
  priority: SalesPriority;
  score: number;
  reasons: string[];
  scheduleCall: boolean;
};

export function evaluateLead(input: QualificationInput): QualificationResult {
  const reasons: string[] = [];
  let score = 0;

  if (input.hasPhone) {
    score += 15;
    reasons.push('Valid phone present');
  } else {
    reasons.push('Missing phone');
  }
  if (input.hasEmail) {
    score += 10;
    reasons.push('Email present');
  }
  if (input.responded) {
    score += 20;
    reasons.push('Customer responded on WhatsApp');
  }
  if (input.interest) {
    score += 15;
    reasons.push(`Interest: ${input.interest}`);
  }
  if (input.timeline && /week|asap|immediate|month/i.test(input.timeline)) {
    score += 15;
    reasons.push(`Timeline: ${input.timeline}`);
  }
  if (input.budget && /[0-9]/.test(input.budget)) {
    score += 10;
    reasons.push('Budget indicated');
  }
  if (input.locationOk === false) {
    score -= 20;
    reasons.push('Location not eligible');
  }
  if (typeof input.intentScore === 'number') score += Math.max(0, Math.min(25, input.intentScore));
  if (typeof input.customScore === 'number') score += input.customScore;

  score = Math.max(0, Math.min(100, score));

  let validity: ValidityStatus = 'needs_review';
  if (!input.hasPhone && !input.hasEmail) validity = 'invalid';
  else if (input.hasPhone || input.hasEmail) validity = 'valid';

  let priority: SalesPriority = 'unqualified';
  if (score >= 75) priority = 'hot';
  else if (score >= 55) priority = 'warm';
  else if (score >= 35) priority = 'cold';

  return {
    validity,
    priority,
    score,
    reasons,
    scheduleCall: priority === 'hot' || priority === 'warm',
  };
}

export function extractFromChat(messages: { direction: string; body?: string | null }[]) {
  const inbound = messages.filter((m) => m.direction === 'inbound').map((m) => m.body || '').join('\n');
  const interest =
    inbound.match(/website|web app|mobile|crm|software/i)?.[0] ||
    undefined;
  const timeline =
    inbound.match(/(this week|next week|asap|immediate|this month|next month)/i)?.[0] || undefined;
  const budget = inbound.match(/(?:budget|₹|rs\.?\s*)([0-9,.]+ ?(?:k|lakh|lakhs)?)/i)?.[0] || undefined;
  return {
    responded: messages.some((m) => m.direction === 'inbound'),
    interest,
    timeline,
    budget,
    intentScore: /buy|ready|quote|proposal|start/i.test(inbound) ? 20 : /interested|looking/i.test(inbound) ? 10 : 0,
  };
}
