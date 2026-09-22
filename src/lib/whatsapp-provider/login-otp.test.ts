import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { hashLoginOtp, phoneLoginEmail } from './login-otp-crypto.ts';
import { safeNextPath } from '../auth/safe-next.ts';

describe('website login helpers', () => {
  it('builds a stable synthetic email from a WhatsApp number', () => {
    assert.equal(phoneLoginEmail('+919876543210'), 'wa919876543210@otp.techantum.local');
  });

  it('hashes OTP codes with the pepper', () => {
    const a = hashLoginOtp('+9198', '123456', 'pepper');
    const b = hashLoginOtp('+9198', '123456', 'pepper');
    const c = hashLoginOtp('+9198', '000000', 'pepper');
    assert.equal(a, b);
    assert.notEqual(a, c);
    assert.equal(a.length, 64);
  });

  it('only allows safe in-site next paths', () => {
    assert.equal(safeNextPath('/portal/wa'), '/portal/wa');
    assert.equal(safeNextPath('/admin'), '/portal/wa');
    assert.equal(safeNextPath('https://evil.example'), '/portal/wa');
    assert.equal(safeNextPath('//evil.example'), '/portal/wa');
    assert.equal(safeNextPath(null), '/portal/wa');
  });
});
