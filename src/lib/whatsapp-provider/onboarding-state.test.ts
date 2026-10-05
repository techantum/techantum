import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { canEnterOnboardingStep, computeOnboardingSetup, nextOnboardingStep } from './onboarding-state.ts';

describe('onboarding setup from Meta assets', () => {
  it('stays disconnected until Meta returns a WABA', () => {
    const setup = computeOnboardingSetup({ hasToken: true, wabas: [], phones: [] });
    assert.equal(setup.connectionStatus, 'AUTHORIZED');
    assert.equal(setup.ready, false);
    assert.equal(setup.hasWaba, false);
  });

  it('does not mark connected when a WABA has no phone numbers', () => {
    const setup = computeOnboardingSetup({ hasToken: true, businessId: 'b1', wabas: [{ waba_id: 'w1' }], phones: [] });
    assert.equal(setup.connectionStatus, 'WABA_LINKED');
    assert.equal(setup.ready, false);
    assert.ok(setup.blockers.some((item) => /phone number/i.test(item)));
  });

  it('is ready only when Meta returned a WABA and a phone', () => {
    const setup = computeOnboardingSetup({
      hasToken: true,
      businessId: 'b1',
      wabas: [{ waba_id: 'w1' }],
      phones: [{ display_phone_number: '+91 90000 00000' }],
      templateCount: 3,
    });
    assert.equal(setup.connectionStatus, 'CONNECTED');
    assert.equal(setup.ready, true);
    assert.deepEqual(setup.blockers, []);
    assert.equal(setup.templateCount, 3);
  });

  it('blocks skipping ahead without Meta assets', () => {
    const empty = computeOnboardingSetup({});
    assert.equal(nextOnboardingStep(empty, false), 1);
    assert.equal(canEnterOnboardingStep(3, empty, true), false);
    assert.equal(canEnterOnboardingStep(5, empty, true), false);
    assert.equal(nextOnboardingStep(empty, true), 2);
    const linked = computeOnboardingSetup({ wabas: [{}], phones: [] });
    assert.equal(nextOnboardingStep(linked, true), 3);
    const ready = computeOnboardingSetup({ wabas: [{}], phones: [{}] });
    assert.equal(canEnterOnboardingStep(5, ready, true), true);
    assert.equal(nextOnboardingStep(ready, true), 5);
  });
});
