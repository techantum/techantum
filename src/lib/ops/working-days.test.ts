import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  addWorkingDays,
  dailyTeamCapacity,
  estimateEndDate,
  requiredWorkingDays,
} from './working-days.ts';

const MONDAY = '2026-08-17';
const FRIDAY = '2026-08-21';

describe('delivery date calculation', () => {
  it('Test 1: Monday + 8 hours + 1 developer = same Monday', () => {
    assert.equal(requiredWorkingDays(8, 1), 1);
    assert.equal(estimateEndDate(MONDAY, 8, 1), MONDAY);
  });

  it('Test 2: Monday + 40 hours + 1 developer = Friday same week', () => {
    assert.equal(requiredWorkingDays(40, 1), 5);
    assert.equal(estimateEndDate(MONDAY, 40, 1), FRIDAY);
  });

  it('Test 3: Friday + 16 hours + 1 developer = following Monday', () => {
    assert.equal(requiredWorkingDays(16, 1), 2);
    assert.equal(estimateEndDate(FRIDAY, 16, 1), '2026-08-24');
  });

  it('Test 4: 80 hours + 2 developers = 5 working days', () => {
    assert.equal(dailyTeamCapacity(2), 16);
    assert.equal(requiredWorkingDays(80, 2), 5);
    assert.equal(addWorkingDays(MONDAY, 5), FRIDAY);
  });

  it('Test 5: ceil(81 / 16) = 6 working days', () => {
    assert.equal(requiredWorkingDays(81, 2), 6);
    assert.equal(estimateEndDate(MONDAY, 81, 2), '2026-08-24');
  });

  it('rejects weekend start dates', () => {
    assert.throws(() => estimateEndDate('2026-08-22', 8, 1), /weekday/);
  });
});
