import { looksLikeInfiniteList, normalizeUrl, originOf, sameDomain, shouldSkipHref } from './url';
import type { ExtractedForm, ExtractedPage } from './types';

function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function attr(tag: string, name: string) {
  const match = tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, 'i'))
    || tag.match(new RegExp(`${name}\\s*=\\s*([^\\s>]+)`, 'i'));
  return match ? decodeEntities(match[1]) : '';
}

function strip(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
}

function textOf(html: string) {
  return decodeEntities(strip(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}

function metaContent(html: string, key: string) {
  const re = new RegExp(`<meta[^>]+(?:name|property)=["']${key}["'][^>]*>`, 'ig');
  const tags = html.match(re) || [];
  for (const tag of tags) {
    const content = attr(tag, 'content');
    if (content) return content;
  }
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']${key}["'][^>]*>`, 'ig');
  const match = re2.exec(html);
  return match ? decodeEntities(match[1]) : '';
}

function collect(html: string, tag: string) {
  const re = new RegExp(`<${tag}([^>]*)>([\\s\\S]*?)<\\/${tag}>`, 'ig');
  const rows: { attrs: string; inner: string }[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) rows.push({ attrs: match[1] || '', inner: match[2] || '' });
  return rows;
}

function guessPageType(url: string, title: string, text: string) {
  const hay = `${url} ${title} ${text.slice(0, 400)}`.toLowerCase();
  if (/contact|get in touch/.test(hay)) return 'contact';
  if (/checkout|cart|payment/.test(hay)) return 'checkout';
  if (/service|solutions/.test(hay)) return 'service';
  if (/about/.test(hay)) return 'about';
  if (/blog|article|news/.test(hay)) return 'article';
  const path = new URL(url).pathname;
  if (path === '/' || path === '') return 'home';
  return 'other';
}

function cssIdent(value: string) {
  return /^[A-Za-z_][\w-]*$/.test(value) ? value : null;
}

export function cssSelector(tag: string, attrs: string) {
  const id = attr(attrs, 'id');
  if (id) {
    const safe = cssIdent(id);
    return safe ? `#${safe}` : `${tag}[id="${id.replaceAll('"', '\\"')}"]`;
  }
  const name = attr(attrs, 'name');
  const type = attr(attrs, 'type');
  const cls = (attr(attrs, 'class') || '').split(/\s+/).filter(Boolean)[0];
  if (name) return `${tag}[name="${name.replaceAll('"', '\\"')}"]`;
  if (type) return `${tag}[type="${type}"]`;
  if (cls && cssIdent(cls)) return `${tag}.${cls}`;
  return tag;
}

function parseForms(html: string): ExtractedForm[] {
  return collect(html, 'form').map((form, formIndex) => {
    const action = attr(form.attrs, 'action');
    const method = (attr(form.attrs, 'method') || 'get').toLowerCase();
    const formId = attr(form.attrs, 'id');
    const formSelector = cssSelector('form', form.attrs) === 'form' ? `form:nth-of-type(${formIndex + 1})` : cssSelector('form', form.attrs);
    const inner = form.inner;
    const inputs = [...inner.matchAll(/<(input|textarea|select)([^>]*)>/gi)].map((match) => {
      const tagName = (match[1] || 'input').toLowerCase();
      const tag = match[2] || '';
      const type = (attr(tag, 'type') || (tagName === 'textarea' ? 'textarea' : 'text')).toLowerCase();
      const id = attr(tag, 'id');
      const name = attr(tag, 'name') || id;
      const placeholder = attr(tag, 'placeholder');
      const ariaLabel = attr(tag, 'aria-label');
      const labelledBy = attr(tag, 'aria-labelledby');
      const labelMatch = id ? html.match(new RegExp(`<label[^>]*for=["']${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>([\\s\\S]*?)<\\/label>`, 'i')) : null;
      const wrapped = inner.match(new RegExp(`<label[^>]*>[\\s\\S]{0,400}?${match[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]{0,400}?<\\/label>`, 'i'));
      const labelledByText = labelledBy
        ? labelledBy.split(/\s+/).map((token) => textOf((html.match(new RegExp(`id=["']${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>([\\s\\S]*?)<`, 'i')) || [])[1] || '')).join(' ')
        : '';
      const accessibleName = textOf(labelMatch?.[1] || (wrapped ? wrapped[0].replace(/<[^>]+>/g, ' ') : '') || ariaLabel || labelledByText || '');
      return {
        name,
        id,
        type,
        required: /\srequired(\s|=|>|$)/i.test(tag),
        label: accessibleName || placeholder,
        accessibleName,
        placeholder,
        selector: `${formSelector} ${cssSelector(tagName, tag)}`,
        snippet: match[0].replace(/\s+/g, ' ').trim().slice(0, 240),
        pattern: attr(tag, 'pattern') || undefined,
        minLength: attr(tag, 'minlength') ? Number(attr(tag, 'minlength')) : undefined,
        maxLength: attr(tag, 'maxlength') ? Number(attr(tag, 'maxlength')) : undefined,
      };
    });
    const blob = `${action} ${inner}`.toLowerCase();
    return {
      action,
      method,
      id: formId,
      selector: formSelector,
      inputs,
      looksPayment: /card|cvv|cvc|expiry|iban|payment|stripe|paypal/.test(blob),
      looksAuth: /password|signin|sign-in|login|register|otp/.test(blob),
      looksDestructive: /delete|reset password|unsubscribe|transfer/.test(blob),
    };
  });
}

export function extractLinks(html: string, pageUrl: string): string[] {
  const origin = originOf(pageUrl);
  const found = new Set<string>();
  const tags = html.match(/<a\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const href = attr(tag, 'href');
    if (shouldSkipHref(href)) continue;
    try {
      const absolute = new URL(href, pageUrl).toString();
      if (!sameDomain(absolute, origin)) continue;
      if (looksLikeInfiniteList(absolute)) continue;
      found.add(normalizeUrl(absolute));
    } catch {
      /* skip */
    }
  }
  return [...found];
}

export function extractPage(html: string, pageUrl: string, httpStatus: number | null): ExtractedPage {
  const title = textOf((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '');
  const metaDescription = metaContent(html, 'description');
  const canonicalTag = (html.match(/<link[^>]+rel=["']canonical["'][^>]*>/i) || [])[0] || '';
  const canonical = attr(canonicalTag, 'href') || null;
  const robots = metaContent(html, 'robots');
  const lang = attr((html.match(/<html\b[^>]*>/i) || [])[0] || '', 'lang');
  const h1 = collect(html, 'h1').map((item) => textOf(item.inner)).filter(Boolean);
  const headings = [1, 2, 3, 4, 5, 6].flatMap((level) =>
    collect(html, `h${level}`).map((item) => ({ level, text: textOf(item.inner) }))
  );
  const images = [...html.matchAll(/<img\b([^>]*)>/gi)].map((match) => {
    const tag = match[1] || '';
    const altAttr = /alt\s*=/i.test(tag);
    return {
      src: attr(tag, 'src'),
      alt: altAttr ? attr(tag, 'alt') : null,
      emptyAlt: altAttr && !attr(tag, 'alt').trim(),
    };
  });
  const origin = originOf(pageUrl);
  const links = [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].map((match) => {
    const href = attr(match[1] || '', 'href');
    let absolute = href;
    try {
      absolute = new URL(href, pageUrl).toString();
    } catch {
      absolute = href;
    }
    return { href: absolute, text: textOf(match[2] || ''), internal: sameDomain(absolute, origin) };
  });
  const openGraph: Record<string, string> = {};
  for (const key of ['og:title', 'og:description', 'og:image', 'og:url']) {
    const value = metaContent(html, key);
    if (value) openGraph[key] = value;
  }
  const hasSchema = /application\/ld\+json/i.test(html) || /itemtype=/i.test(html);
  const visibleText = textOf(html);
  const contentSample = prioritizeContent(html, visibleText);
  return {
    url: pageUrl,
    normalizedUrl: normalizeUrl(pageUrl),
    finalUrl: pageUrl,
    httpStatus,
    title,
    metaDescription,
    canonical,
    robots,
    lang,
    h1,
    headings,
    images,
    links,
    forms: parseForms(html),
    openGraph,
    hasSchema,
    visibleText,
    contentSample,
    htmlBytes: Buffer.byteLength(html),
    pageType: guessPageType(pageUrl, title, visibleText),
  };
}

export function prioritizeContent(html: string, visibleText: string, maxChars = 8000) {
  const headings = collect(html, 'h1').concat(collect(html, 'h2'), collect(html, 'h3'))
    .map((item) => textOf(item.inner))
    .filter(Boolean)
    .join('\n');
  const main = (html.match(/<main[\s\S]*?<\/main>/i) || html.match(/<article[\s\S]*?<\/article>/i) || [])[0] || '';
  const mainText = textOf(main);
  const combined = [headings, mainText, visibleText].filter(Boolean).join('\n');
  return combined.slice(0, maxChars);
}

export function parseSitemapUrls(xml: string, origin: string): string[] {
  const urls: string[] = [];
  const matches = xml.match(/<loc>\s*([^<]+)\s*<\/loc>/gi) || [];
  for (const match of matches) {
    const loc = decodeEntities(match.replace(/<\/?loc>/gi, '').trim());
    try {
      if (sameDomain(loc, origin) && !shouldSkipHref(loc)) urls.push(normalizeUrl(loc));
    } catch {
      /* skip */
    }
  }
  return [...new Set(urls)];
}
