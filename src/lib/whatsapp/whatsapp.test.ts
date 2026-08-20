import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import crypto from 'node:crypto';
import { parseInboundMessages, verifyWebhookSignature } from './webhook-utils.ts';

describe('verifyWebhookSignature', () => {
  it('allows when app secret is not configured', () => {
    assert.equal(verifyWebhookSignature('{}', null, undefined), true);
  });

  it('validates sha256 signature when secret is configured', () => {
    const body = '{"hello":"world"}';
    const digest = crypto.createHmac('sha256', 'test-secret').update(body, 'utf8').digest('hex');
    assert.equal(verifyWebhookSignature(body, `sha256=${digest}`, 'test-secret'), true);
    assert.equal(verifyWebhookSignature(body, 'sha256=deadbeef', 'test-secret'), false);
  });
});

describe('parseInboundMessages', () => {
  it('extracts text messages from Meta webhook payload', () => {
    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                contacts: [{ wa_id: '919999999999', profile: { name: 'Rahul' } }],
                messages: [
                  {
                    from: '919999999999',
                    id: 'wamid.TEST123',
                    timestamp: '1710000000',
                    type: 'text',
                    text: { body: 'Hi, I need a website.' },
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    const rows = parseInboundMessages(payload);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].whatsapp_message_id, 'wamid.TEST123');
    assert.equal(rows[0].text, 'Hi, I need a website.');
    assert.equal(rows[0].profile_name, 'Rahul');
  });
});
