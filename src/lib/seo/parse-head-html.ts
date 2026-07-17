export interface ParsedHeadHtml {
  meta: Record<string, string>[];
  link: Record<string, string>[];
  scripts: string;
  bodyHtml: string;
}

const REACT_ATTR_MAP: Record<string, string> = {
  'http-equiv': 'httpEquiv',
  charset: 'charSet',
  crossorigin: 'crossOrigin',
  referrerpolicy: 'referrerPolicy',
  itemprop: 'itemProp',
};

/** Parse trusted CMS HTML into head meta/link tags and executable script snippets. */
export function parseHeadHtml(html: string): ParsedHeadHtml {
  if (!html?.trim()) {
    return { meta: [], link: [], scripts: '', bodyHtml: '' };
  }

  const meta: Record<string, string>[] = [];
  const link: Record<string, string>[] = [];
  const scripts: string[] = [];
  const bodyParts: string[] = [];

  const tagPattern = /<(meta|link|script|noscript)\b([^>]*)>([\s\S]*?)<\/\1>|<(meta|link)\b([^>]*)\/?>/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(html)) !== null) {
    const before = html.slice(lastIndex, match.index).trim();
    if (before) bodyParts.push(before);

    const tagName = (match[1] || match[4] || '').toLowerCase();
    const attrSource = match[2] || match[5] || '';
    const inner = match[3] || '';

    if (tagName === 'meta') {
      const attrs = parseAttributes(attrSource);
      if (Object.keys(attrs).length) meta.push(toReactAttrs(attrs));
    } else if (tagName === 'link') {
      const attrs = parseAttributes(attrSource);
      if (Object.keys(attrs).length) link.push(toReactAttrs(attrs));
    } else if (tagName === 'script') {
      scripts.push(`<script${attrSource}>${inner}</script>`);
    } else if (tagName === 'noscript') {
      bodyParts.push(`<noscript>${inner}</noscript>`);
    }

    lastIndex = match.index + match[0].length;
  }

  const tail = html.slice(lastIndex).trim();
  if (tail) bodyParts.push(tail);

  return {
    meta,
    link,
    scripts: scripts.join('\n'),
    bodyHtml: bodyParts.join('\n'),
  };
}

function parseAttributes(source: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrPattern = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>/]+)))?/g;
  let match: RegExpExecArray | null;

  while ((match = attrPattern.exec(source)) !== null) {
    const name = match[1].toLowerCase();
    const value = match[2] ?? match[3] ?? match[4] ?? '';
    attrs[name] = value;
  }

  return attrs;
}

function toReactAttrs(attrs: Record<string, string>): Record<string, string> {
  const reactAttrs: Record<string, string> = {};
  for (const [key, value] of Object.entries(attrs)) {
    const mapped = REACT_ATTR_MAP[key] || key;
    reactAttrs[mapped] = value;
  }
  return reactAttrs;
}
