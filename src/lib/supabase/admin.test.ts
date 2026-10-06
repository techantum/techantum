import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getAuthSupabaseUrl, getLocalRestUrl } from './local-jwt.ts';

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
});
