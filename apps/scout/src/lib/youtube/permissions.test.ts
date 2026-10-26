import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { hasYoutubePermission, permissionsForRole, YOUTUBE_PERMISSIONS } from './permissions';

describe('Revealeo platform YouTube roles', () => {
  it('matches Techantum: Super Admin owns settings, subscribers use research', () => {
    assert.equal(hasYoutubePermission('SUPER_ADMIN', [], 'youtube_research.settings.manage'), true);
    assert.equal(hasYoutubePermission('subscriber_admin', [], 'youtube_research.settings.manage'), false);
    assert.equal(hasYoutubePermission('subscriber_user', [], 'youtube_research.view'), true);
    assert.equal(hasYoutubePermission('subscriber_admin', [], 'youtube_research.channels.manage'), true);
    assert.equal(hasYoutubePermission('owner', [], 'youtube_research.settings.manage'), false);
    assert.equal(permissionsForRole('subscriber_user', []).includes('youtube_research.settings.manage'), false);
    assert.equal(permissionsForRole('SUPER_ADMIN', []).length, YOUTUBE_PERMISSIONS.length);
  });
});
