import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildChunkTitle,
  chunkText,
  extractHtmlDocument,
  isBlockedHostname,
  isPrivateIp,
  parseAndCheckUrlShape,
  parseUrlList,
  sourceKeywords,
} from './ingest.ts';

describe('knowledge ingest helpers', () => {
  it('parses unique URLs from lines and commas', () => {
    assert.deepEqual(parseUrlList('https://techantum.com\nhttps://techantum.com/services, https://techantum.com'), [
      'https://techantum.com',
      'https://techantum.com/services',
    ]);
  });

  it('extracts title and readable text from HTML', () => {
    const { title, text } = extractHtmlDocument(`
      <html><head><title>Website Development | Techantum</title>
      <style>body{color:red}</style></head>
      <body>
        <script>alert(1)</script>
        <h1>Website packages</h1>
        <p>We build business websites &amp; web apps.</p>
      </body></html>
    `);
    assert.equal(title, 'Website Development | Techantum');
    assert.match(text, /Website packages/);
    assert.match(text, /We build business websites & web apps/);
    assert.doesNotMatch(text, /alert/);
    assert.doesNotMatch(text, /color:red/);
  });

  it('chunks long text on paragraph boundaries', () => {
    const chunks = chunkText('First paragraph.\n\nSecond paragraph.', 20);
    assert.deepEqual(chunks, ['First paragraph.', 'Second paragraph.']);
  });

  it('numbers chunk titles', () => {
    assert.equal(buildChunkTitle('About Techantum', 0, 1), 'About Techantum');
    assert.equal(buildChunkTitle('About Techantum', 1, 3), 'About Techantum (part 2 of 3)');
  });

  it('rejects private and non-http URLs', () => {
    assert.equal(isPrivateIp('127.0.0.1'), true);
    assert.equal(isPrivateIp('10.1.2.3'), true);
    assert.equal(isPrivateIp('192.168.0.8'), true);
    assert.equal(isPrivateIp('8.8.8.8'), false);
    assert.equal(isBlockedHostname('localhost'), true);
    assert.throws(() => parseAndCheckUrlShape('javascript:alert(1)'), /http and https/);
    assert.throws(() => parseAndCheckUrlShape('http://127.0.0.1/secret'), /cannot be used/);
    assert.throws(() => parseAndCheckUrlShape('http://user:pass@techantum.com'), /login details/);
    assert.ok(parseAndCheckUrlShape('https://techantum.com/services'));
  });

  it('builds search keywords from title and host', () => {
    const keywords = sourceKeywords({
      title: 'Website Development',
      url: 'https://www.techantum.com/services',
      extra: 'pdf',
    });
    assert.match(keywords, /techantum.com/);
    assert.match(keywords, /website/);
    assert.match(keywords, /pdf/);
  });
});
