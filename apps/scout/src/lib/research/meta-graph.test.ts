import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { belongsToFacebookPage, extractFacebookStories, facebookGraphId, postImageUrl } from './facebook-parse.ts';

describe('Facebook competitor post matching', () => {
  it('keeps Graph posts when the stored page is a vanity handle', () => {
    const post = { id: '111_222', from: { id: '111' }, permalink_url: 'https://www.facebook.com/acme/posts/222' };
    assert.equal(belongsToFacebookPage(post, 'acme', 'acme'), true);
    assert.equal(belongsToFacebookPage(post, '111', 'acme'), true);
  });

  it('keeps public and ad library rows', () => {
    assert.equal(belongsToFacebookPage({ id: 'x', source_kind: 'public' }, 'acme'), true);
    assert.equal(belongsToFacebookPage({ id: 'x', source_kind: 'ad_library' }, 'acme'), true);
  });

  it('reads images from Graph attachments', () => {
    const url = postImageUrl({
      attachments: {
        data: [{ media: { image: { src: 'https://scontent.xx.fbcdn.net/v/photo.jpg' } } }],
      },
    });
    assert.equal(url, 'https://scontent.xx.fbcdn.net/v/photo.jpg');
  });

  it('extracts story ids and images from public HTML', () => {
    const html = `
      <a href="https://www.facebook.com/acme/posts/555">post</a>
      <p>Competitor launched a new offer today</p>
      <img src="https://scontent.xx.fbcdn.net/v/pic.jpg" />
      <a href="/story.php?story_fbid=777&amp;id=111">story</a>
      <p>Second public update on the timeline</p>
    `;
    const stories = extractFacebookStories(html, 'acme', '111');
    assert.ok(stories.some((row) => row.id.includes('555') || row.permalink.includes('/posts/555')));
    assert.ok(stories.some((row) => row.id === '111_777'));
  });
});

describe('Facebook insight ids', () => {
  it('reads Graph story ids from stored posts', () => {
    assert.equal(facebookGraphId({ youtubeVideoId: 'facebook:111_222', publicDetails: { graph_id: '111_222' } }), '111_222');
    assert.equal(facebookGraphId({ youtubeVideoId: 'facebook:111:ad:999', publicDetails: { graph_id: '111:ad:999' } }).endsWith('999'), true);
  });
});
