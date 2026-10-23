import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { safeNextPath } from './safe-next.ts';

describe('safeNextPath', () => {
  it('sends website users to the user dashboard by default', () => {
    assert.equal(safeNextPath(null), '/portal/wa');
    assert.equal(safeNextPath('/portal/wa/support'), '/portal/wa/support');
  });

  it('blocks open redirects and other portals', () => {
    assert.equal(safeNextPath('https://evil.example'), '/portal/wa');
    assert.equal(safeNextPath('//evil.example'), '/portal/wa');
    assert.equal(safeNextPath('/admin'), '/portal/wa');
    assert.equal(safeNextPath('/admin/partners'), '/portal/wa');
    assert.equal(safeNextPath('/partner/dashboard'), '/portal/wa');
    assert.equal(safeNextPath('/api/admin/login'), '/portal/wa');
  });
});
