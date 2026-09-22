import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validateTemplateDraft, mapMetaTemplateStatus, extractTemplateVariables } from './template-validation.ts';
import { normalizeWebhookPayload, shouldAdvanceMessageStatus, verifyMetaSignature, webhookEventKey } from './webhook-parser.ts';
import { scorePlatformHealth } from './health.ts';
import { assertTenant, clientHasPermission, providerHasPermission } from './permissions.ts';
import { rate } from './date-range.ts';
import { createHmac } from 'node:crypto';

describe('template validation', () => {
  it('accepts sequential variables and samples', () => {
    const result = validateTemplateDraft({
      name: 'appointment_confirm',
      body: 'Hello {{1}}, your appointment is confirmed for {{2}}.',
      examples: { '1': 'Rahul', '2': 'tomorrow' },
    });
    assert.equal(result.ok, true);
    assert.deepEqual(result.variables, ['1', '2']);
  });

  it('rejects skipped variables and mixed-case names', () => {
    const result = validateTemplateDraft({
      name: 'Bad Name',
      body: 'Hello {{1}} and {{3}}',
      examples: { '1': 'A' },
    });
    assert.equal(result.ok, false);
    assert.ok(result.errors.length >= 2);
  });

  it('maps Meta template statuses into internal states', () => {
    assert.equal(mapMetaTemplateStatus('APPROVED'), 'META_APPROVED');
    assert.equal(mapMetaTemplateStatus('REJECTED'), 'META_REJECTED');
    assert.equal(mapMetaTemplateStatus('FLAGGED'), 'META_FLAGGED');
  });

  it('extracts variables without depending on Meta payload shape', () => {
    assert.deepEqual(extractTemplateVariables('Hi {{1}} {{2}}'), ['1', '2']);
  });
});

describe('webhook parser', () => {
  it('rejects invalid signatures when a secret is configured', () => {
    const body = '{"object":"whatsapp_business_account"}';
    const digest = createHmac('sha256', 'secret').update(body, 'utf8').digest('hex');
    assert.equal(verifyMetaSignature(body, `sha256=${digest}`, 'secret'), true);
    assert.equal(verifyMetaSignature(body, 'sha256=deadbeef', 'secret'), false);
    assert.equal(verifyMetaSignature(body, null, 'secret'), false);
  });

  it('normalizes inbound messages and statuses', () => {
    const events = normalizeWebhookPayload({
      entry: [
        {
          id: 'WABA1',
          changes: [
            {
              field: 'messages',
              value: {
                metadata: { phone_number_id: 'PN1' },
                contacts: [{ wa_id: '9198', profile: { name: 'Asha' } }],
                messages: [{ from: '9198', id: 'wamid.1', timestamp: '1', type: 'text', text: { body: 'hello' } }],
                statuses: [{ id: 'wamid.2', status: 'delivered', timestamp: '2', recipient_id: '9198' }],
              },
            },
          ],
        },
      ],
    });
    assert.equal(events[0].eventType, 'message.inbound');
    assert.equal(events[0].text, 'hello');
    assert.equal(events[1].messageStatus, 'DELIVERED');
  });

  it('does not let out-of-order statuses downgrade READ', () => {
    assert.equal(shouldAdvanceMessageStatus('READ', 'SENT'), false);
    assert.equal(shouldAdvanceMessageStatus('SENT', 'DELIVERED'), true);
    assert.equal(shouldAdvanceMessageStatus('DELIVERED', 'FAILED'), true);
  });

  it('creates a deterministic idempotency key', () => {
    const key = webhookEventKey({ a: 1 }, '');
    assert.equal(key, webhookEventKey({ a: 1 }, ''));
  });
});

describe('health scoring', () => {
  it('marks disconnected accounts as DISCONNECTED', () => {
    assert.equal(scorePlatformHealth({ metaConnected: false }).health, 'DISCONNECTED');
  });

  it('uses RED quality as CRITICAL', () => {
    const result = scorePlatformHealth({ metaConnected: true, tokenValid: true, phoneQuality: 'RED', webhookHealthy: true });
    assert.equal(result.health, 'CRITICAL');
    assert.ok(result.reasons.length > 0);
  });
});

describe('permissions and tenant isolation', () => {
  it('grants internal approve only to reviewer-capable provider roles', () => {
    assert.equal(providerHasPermission('SUPER_ADMIN', 'whatsapp.template.internal_approve'), true);
    assert.equal(providerHasPermission('FINANCE', 'whatsapp.template.internal_approve'), false);
    assert.equal(clientHasPermission('CLIENT_VIEWER', 'whatsapp.template.create'), false);
    assert.equal(clientHasPermission('CLIENT_ADMIN', 'whatsapp.template.create'), true);
  });

  it('blocks Client A from Client B', () => {
    assert.throws(() => assertTenant('client-a', 'client-b'), /Tenant isolation/);
    assert.doesNotThrow(() => assertTenant('client-a', 'client-a'));
  });
});

describe('analytics math', () => {
  it('computes delivery and failure rates', () => {
    assert.equal(rate(80, 100), 80);
    assert.equal(rate(0, 0), 0);
  });
});
