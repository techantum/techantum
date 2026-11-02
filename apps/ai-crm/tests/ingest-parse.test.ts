import test from 'node:test';
import assert from 'node:assert/strict';

function parseGoogleLeadForm(body: any) {
  const answers = body?.user_column_data || body?.lead?.user_column_data || [];
  const map: Record<string, string> = {};
  for (const a of answers) {
    const key = String(a.column_id || a.column_name || '').toLowerCase();
    map[key] = String(a.string_value || a.value || '');
  }
  return {
    fullName: map['full_name'] || map['name'] || body?.full_name,
    phone: map['phone_number'] || map['phone'] || body?.phone_number,
    email: map['email'] || body?.email,
    externalSourceLeadId: String(body?.lead_id || body?.id || ''),
    campaign: body?.campaign_id || body?.form_id || undefined,
  };
}

function parseMetaLead(body: any) {
  const fieldData = body?.field_data || body?.entry?.[0]?.changes?.[0]?.value?.field_data || [];
  const map: Record<string, string> = {};
  for (const f of fieldData) {
    map[String(f.name || '').toLowerCase()] = Array.isArray(f.values) ? String(f.values[0] || '') : String(f.value || '');
  }
  return {
    fullName: map.full_name || map.name,
    phone: map.phone_number || map.phone,
    email: map.email,
    externalSourceLeadId: String(body?.leadgen_id || body?.id || ''),
    campaign: body?.ad_id || body?.form_id,
  };
}

test('parse Google lead form webhook', () => {
  const parsed = parseGoogleLeadForm({
    lead_id: 'g-1',
    form_id: 'form-9',
    user_column_data: [
      { column_id: 'FULL_NAME', string_value: 'Ada Lovelace' },
      { column_id: 'PHONE_NUMBER', string_value: '9999999999' },
      { column_id: 'EMAIL', string_value: 'ada@example.com' },
    ],
  });
  assert.equal(parsed.fullName, 'Ada Lovelace');
  assert.equal(parsed.phone, '9999999999');
  assert.equal(parsed.externalSourceLeadId, 'g-1');
});

test('parse Meta lead payload', () => {
  const parsed = parseMetaLead({
    leadgen_id: 'm-1',
    field_data: [
      { name: 'full_name', values: ['Grace Hopper'] },
      { name: 'phone_number', values: ['8888888888'] },
      { name: 'email', values: ['grace@example.com'] },
    ],
  });
  assert.equal(parsed.fullName, 'Grace Hopper');
  assert.equal(parsed.externalSourceLeadId, 'm-1');
});
