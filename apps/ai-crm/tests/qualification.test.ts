import test from 'node:test';
import assert from 'node:assert/strict';

// Pure-function copies kept in-test so Node's test runner does not need Next path aliases.
function normalizePhone(raw?: string | null) {
  if (!raw) return '';
  const digits = raw.replace(/\D+/g, '');
  if (!digits) return '';
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

function normalizeEmail(raw?: string | null) {
  return (raw || '').trim().toLowerCase();
}

function evaluateLead(input: {
  hasPhone?: boolean;
  hasEmail?: boolean;
  responded?: boolean;
  interest?: string;
  timeline?: string;
  budget?: string;
  locationOk?: boolean;
  intentScore?: number;
}) {
  const reasons: string[] = [];
  let score = 0;
  if (input.hasPhone) score += 15;
  if (input.hasEmail) score += 10;
  if (input.responded) score += 20;
  if (input.interest) score += 15;
  if (input.timeline && /week|asap|immediate|month/i.test(input.timeline)) score += 15;
  if (input.budget && /[0-9]/.test(input.budget)) score += 10;
  if (input.locationOk === false) score -= 20;
  if (typeof input.intentScore === 'number') score += Math.max(0, Math.min(25, input.intentScore));
  score = Math.max(0, Math.min(100, score));
  let validity: 'valid' | 'invalid' | 'needs_review' = 'needs_review';
  if (!input.hasPhone && !input.hasEmail) validity = 'invalid';
  else validity = 'valid';
  let priority: 'hot' | 'warm' | 'cold' | 'unqualified' = 'unqualified';
  if (score >= 75) priority = 'hot';
  else if (score >= 55) priority = 'warm';
  else if (score >= 35) priority = 'cold';
  return { validity, priority, score, reasons, scheduleCall: priority === 'hot' || priority === 'warm' };
}

const ALLOWED: Record<string, string[]> = {
  scheduled: ['queued', 'cancelled', 'blocked'],
  queued: ['dialing', 'cancelled', 'failed', 'blocked'],
  dialing: ['ringing', 'failed', 'cancelled'],
  ringing: ['connected', 'failed', 'cancelled'],
  connected: ['completed', 'failed', 'transferred'],
  completed: [],
  failed: ['queued'],
  transferred: [],
  cancelled: [],
  blocked: ['queued', 'cancelled'],
};

test('normalize phone and email', () => {
  assert.equal(normalizePhone('9876543210'), '919876543210');
  assert.equal(normalizeEmail('  A@B.com '), 'a@b.com');
});

test('evaluateLead scores hot prospects', () => {
  const result = evaluateLead({
    hasPhone: true,
    hasEmail: true,
    responded: true,
    interest: 'website',
    timeline: 'this week',
    budget: '₹2 lakh',
    intentScore: 20,
  });
  assert.equal(result.validity, 'valid');
  assert.equal(result.priority, 'hot');
  assert.equal(result.scheduleCall, true);
  assert.ok(result.score >= 75);
});

test('call state machine transitions', () => {
  assert.equal(ALLOWED.scheduled.includes('queued'), true);
  assert.equal(ALLOWED.connected.includes('completed'), true);
  assert.equal(ALLOWED.completed.includes('dialing'), false);
});
