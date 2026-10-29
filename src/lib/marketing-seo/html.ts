function attr(html: string, attrName: string, nearby: string) {
  const tagged =
    html.match(new RegExp(`${attrName}="${nearby}"[^>]*content="([^"]*)"`, 'i')) ||
    html.match(new RegExp(`content="([^"]*)"[^>]*${attrName}="${nearby}"`, 'i')) ||
    html.match(new RegExp(`${attrName}='${nearby}'[^>]*content='([^']*)'`, 'i'));
  return tagged?.[1]?.trim() || '';
}

export function parsePublicHtml(html: string) {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, ' ').trim() || '';
  const description =
    attr(html, 'name', 'description') ||
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)?.[1] ||
    '';
  const robots =
    attr(html, 'name', 'robots') ||
    html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)["']/i)?.[1] ||
    '';
  const canonical =
    html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1] ||
    html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i)?.[1] ||
    '';
  const ogTitle = attr(html, 'property', 'og:title');
  const ogDescription = attr(html, 'property', 'og:description');
  const ogImage = attr(html, 'property', 'og:image');
  const h1 = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((match) =>
    match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
  );
  const h2 = [...html.matchAll(/<h2\b/gi)].length;
  const images = [...html.matchAll(/<img\b([^>]*)>/gi)].map((match) => match[1] || '');
  const missingAlt = images.filter((tag) => !/\balt=/i.test(tag)).length;
  return {
    title,
    description,
    robots: robots.toLowerCase(),
    canonical,
    ogTitle,
    ogDescription,
    ogImage,
    h1,
    h2,
    imageCount: images.length,
    missingAlt,
  };
}
