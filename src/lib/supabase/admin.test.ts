import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getAuthSupabaseUrl, getLocalRestUrl, isAuthUserId, serviceJwtStillValid } from './local-jwt.ts';

describe('Supabase Auth Admin URL', () => {
  it('uses the real Supabase URL even when LOCAL_REST_URL is set', () => {
    const previousLocal = process.env.LOCAL_REST_URL;
    const previousUrl = process.env.SUPABASE_URL;
    process.env.LOCAL_REST_URL = 'http://127.0.0.1:3050';
    process.env.SUPABASE_URL = 'https://gykrqgbdriazxrritjho.supabase.co';
    try {
      assert.equal(getLocalRestUrl(), 'http://127.0.0.1:3050');
      assert.equal(getAuthSupabaseUrl(), 'https://gykrqgbdriazxrritjho.supabase.co');
    } finally {
      if (previousLocal === undefined) delete process.env.LOCAL_REST_URL;
      else process.env.LOCAL_REST_URL = previousLocal;
      if (previousUrl === undefined) delete process.env.SUPABASE_URL;
      else process.env.SUPABASE_URL = previousUrl;
    }
  });

  it('replaces a service token before it expires', () => {
    const now = 1_700_000_000;
    assert.equal(serviceJwtStillValid(now + 300, now), true);
    assert.equal(serviceJwtStillValid(now + 60, now), false);
    assert.equal(serviceJwtStillValid(now - 1, now), false);
  });

  it('accepts only a UUID as an Auth user id', () => {
    assert.equal(isAuthUserId('9c4e4a2e-6d1f-4c3b-9f10-0a1b2c3d4e5f'), true);
    assert.equal(isAuthUserId(''), false);
    assert.equal(isAuthUserId('undefined'), false);
    assert.equal(isAuthUserId(null), false);
  });
});
