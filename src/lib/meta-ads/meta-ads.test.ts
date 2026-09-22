import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  accountStatusLabel,
  actPath,
  adsEndpointPattern,
  mapInsightRow,
  parseActId,
  rollingSuccessRate,
  stripSecrets,
  toFiniteNumber,
} from './normalize.ts';

describe('meta ads normalize', () => {
  it('parses act ids for Graph paths', () => {
    assert.equal(parseActId('act_1234567890'), '1234567890');
    assert.equal(parseActId('1234567890'), '1234567890');
    assert.equal(actPath('act_99'), '/act_99');
  });

  it('redacts account and object ids in log endpoint patterns', () => {
    assert.equal(adsEndpointPattern('/act_1234567890/campaigns'), '/act_{id}/campaigns');
    assert.equal(adsEndpointPattern('/9876543210987/insights'), '/{id}/insights');
  });

  it('maps insight metrics without inventing dates', () => {
    const mapped = mapInsightRow({
      impressions: '1200',
      reach: '900',
      clicks: '40',
      spend: '12.50',
      cpc: '0.31',
      cpm: '10.4',
      ctr: '3.3',
      unique_clicks: '38',
      date_start: '2026-09-01',
      date_stop: '2026-09-21',
    });
    assert.equal(mapped.impressions, 1200);
    assert.equal(mapped.spend, 12.5);
    assert.equal(mapped.dateStart, '2026-09-01');
    assert.equal(toFiniteNumber('not-a-number'), 0);
  });

  it('labels account status and computes rolling success over the last 500 calls', () => {
    assert.equal(accountStatusLabel(1), 'ACTIVE');
    const rows = [
      ...Array.from({ length: 480 }, () => ({ success: true })),
      ...Array.from({ length: 20 }, () => ({ success: false })),
    ];
    const rate = rollingSuccessRate(rows, 500);
    assert.equal(rate.total, 500);
    assert.equal(rate.failed, 20);
    assert.ok(rate.rate > 95);
  });

  it('strips tokens from logged query objects', () => {
    const sanitized = stripSecrets({ access_token: 'secret', fields: 'id,name', nested: { appsecret_proof: 'x' } }) as {
      access_token: string;
      fields: string;
      nested: { appsecret_proof: string };
    };
    assert.equal(sanitized.access_token, '***');
    assert.equal(sanitized.fields, 'id,name');
    assert.equal(sanitized.nested.appsecret_proof, '***');
  });
});
