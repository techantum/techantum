function metaContent(html: string, property: string) {
  const tagged = html.match(new RegExp(`property="${property}" content="([^"]+)"`, 'i'))
    || html.match(new RegExp(`content="([^"]+)" property="${property}"`, 'i'));
  return (tagged?.[1] || '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\\u0026/g, '&');
}

export function facebookGraphId(video: { youtubeVideoId?: string; publicDetails?: Record<string, unknown> }) {
  const details = video.publicDetails || {};
  const stored = String(details.graph_id || '');
  if (/^\d+_\d+$/.test(stored) || /^\d{10,}$/.test(stored)) return stored;
  const raw = String(video.youtubeVideoId || '').replace(/^facebook:/i, '');
  const last = raw.includes(':') ? raw.slice(raw.lastIndexOf(':') + 1) : raw;
  return last;
}

export function belongsToFacebookPage(post: Record<string, unknown>, pageId: string, handle?: string | null) {
  const want = [...new Set([pageId, handle].map((value) => String(value || '').replace(/^@/, '').toLowerCase()).filter(Boolean))];
  if (!want.length) return false;
  const source = String(post.source_kind || '');
  if (source === 'adaccount' || source === 'ad_library' || source === 'public') return true;
  const fromId = String((post.from as { id?: string } | undefined)?.id || '').toLowerCase();
  if (fromId && want.includes(fromId)) return true;
  const id = String(post.id || '').toLowerCase();
  if (want.some((key) => /^\d+$/.test(key) && (id === key || id.startsWith(`${key}_`) || id.includes(`:${key}:`) || id.startsWith(`${key}:`)))) return true;
  const permalink = String(post.permalink_url || post.permalink || post.link || '').toLowerCase();
  if (permalink && want.some((key) => permalink.includes(`/${key}`) || permalink.includes(`=${key}`))) return true;
  if (fromId && want.some((key) => !/^\d+$/.test(key))) return true;
  return !fromId && Boolean(id);
}

function nestedMediaUrl(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value.startsWith('http') ? value : '';
  if (typeof value !== 'object') return '';
  const row = value as Record<string, unknown>;
  return nestedMediaUrl(row.src)
    || nestedMediaUrl(row.url)
    || nestedMediaUrl(row.source)
    || nestedMediaUrl(row.image)
    || nestedMediaUrl(row.media)
    || nestedMediaUrl((row.data as { url?: string } | undefined)?.url);
}

export function postImageUrl(post: Record<string, unknown>) {
  const direct = String(post.full_picture || post.picture || post.media_url || post.thumbnail_url || post.image_url || post.display_url || '').trim();
  if (/^https?:\/\//i.test(direct)) return direct;
  const attachments = (post.attachments as { data?: Record<string, unknown>[] } | undefined)?.data || [];
  for (const attachment of attachments) {
    const url = nestedMediaUrl(attachment.media) || nestedMediaUrl(attachment);
    if (/^https?:\/\//i.test(url)) return url;
    const children = (attachment.subattachments as { data?: Record<string, unknown>[] } | undefined)?.data || [];
    for (const child of children) {
      const childUrl = nestedMediaUrl(child.media) || nestedMediaUrl(child);
      if (/^https?:\/\//i.test(childUrl)) return childUrl;
    }
  }
  const images = Array.isArray(post.images) ? (post.images as { source?: string }[]) : [];
  return String(images[0]?.source || '');
}

export function extractFacebookStories(html: string, slug: string, pageId: string) {
  const rows: { id: string; text: string; image: string; permalink: string }[] = [];
  const seen = new Set<string>();
  const push = (id: string, text: string, image: string, permalink: string) => {
    const cleanText = decodeHtml(text).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const cleanImage = decodeHtml(image).replace(/&amp;/g, '&');
    const key = (id || cleanText.slice(0, 48)).toLowerCase();
    if (!key || seen.has(key)) return;
    if (cleanText && cleanText.length < 12 && !cleanImage && /cookie|log in|facebook/i.test(cleanText)) return;
    seen.add(key);
    rows.push({
      id: id || `public:${slug}:${seen.size}`,
      text: cleanText.slice(0, 500),
      image: cleanImage,
      permalink: permalink || `https://www.facebook.com/${slug}`,
    });
  };
  const around = (index: number, htmlText: string) => htmlText.slice(Math.max(0, index - 400), index + 2200);
  for (const match of html.matchAll(/story\.php\?story_fbid=(\d+)(?:&|&amp;)id=(\d+)/gi)) {
    const chunk = around(match.index || 0, html);
    push(
      `${match[2]}_${match[1]}`,
      chunk.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] || '',
      chunk.match(/src="(https:\/\/(?:scontent|external)[^"]+)"/i)?.[1] || '',
      `https://www.facebook.com/${match[2]}/posts/${match[1]}`,
    );
  }
  for (const match of html.matchAll(/facebook\.com\/([^"'/?]+)\/(?:posts|videos|reel|permalink)\/(\d+)/gi)) {
    const chunk = around(match.index || 0, html);
    const owner = decodeURIComponent(match[1]);
    const storyId = match[2];
    const id = /^\d{5,}$/.test(pageId) ? `${pageId}_${storyId}` : `${owner}_${storyId}`;
    push(
      id,
      chunk.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] || metaContent(chunk, 'og:description'),
      chunk.match(/src="(https:\/\/(?:scontent|external)[^"]+)"/i)?.[1] || '',
      `https://www.facebook.com/${owner}/posts/${storyId}`,
    );
  }
  for (const match of html.matchAll(/"post_id":"(\d+)"|"top_level_post_id":"(\d+)"|ft_ent_identifier=(\d+)/gi)) {
    const storyId = match[1] || match[2] || match[3];
    if (!storyId) continue;
    const chunk = around(match.index || 0, html);
    const id = /^\d{5,}$/.test(pageId) ? `${pageId}_${storyId}` : storyId;
    push(
      id,
      chunk.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] || '',
      chunk.match(/src="(https:\/\/(?:scontent|external)[^"]+)"/i)?.[1] || '',
      `https://www.facebook.com/${slug}/posts/${storyId}`,
    );
  }
  if (!rows.length) {
    const blocks = html.match(/<p[^>]*>[\s\S]*?<\/p>/gi) || [];
    for (const block of blocks) {
      const text = block.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (text.length < 24) continue;
      if (/cookies|log in|facebook/i.test(text) && text.length < 80) continue;
      push('', text, '', `https://www.facebook.com/${slug}`);
    }
  }
  return rows;
}
