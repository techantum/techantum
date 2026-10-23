import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { classifyInvite, generateInviteToken, hashInviteToken, inviteExpiryDate, inviteStatusMessage } from './invite-token.ts';

describe('partner invitation tokens', () => {
  it('stores a hash that is not the raw token', () => {
    const token = generateInviteToken();
    const hash = hashInviteToken(token);
    assert.equal(token.length, 64);
    assert.equal(hash.length, 64);
    assert.notEqual(hash, token);
    assert.equal(hashInviteToken(token), hash);
    assert.notEqual(hashInviteToken(generateInviteToken()), hash);
  });

  it('classifies expiry, reuse, and a still-valid invite', () => {
    const now = new Date('2026-10-23T12:00:00Z');
    assert.equal(classifyInvite(null, now), 'invalid');
    assert.equal(classifyInvite({ expires_at: inviteExpiryDate(now.getTime(), 7).toISOString(), used_at: null }, now), 'valid');
    assert.equal(classifyInvite({ expires_at: '2026-10-22T12:00:00Z', used_at: null }, now), 'expired');
    assert.equal(classifyInvite({ expires_at: '2026-10-30T12:00:00Z', used_at: '2026-10-23T11:00:00Z' }, now), 'used');
    assert.match(inviteStatusMessage('expired'), /expired/);
    assert.match(inviteStatusMessage('used'), /already been used/);
  });
});