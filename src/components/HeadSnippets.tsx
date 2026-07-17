import ScriptInjector from '@/components/ScriptInjector';
import { parseHeadHtml } from '@/lib/seo/parse-head-html';

interface HeadSnippetsProps {
  html: string;
}

/** SSR meta/link tags into document head; scripts execute via ScriptInjector. */
export default function HeadSnippets({ html }: HeadSnippetsProps) {
  if (!html?.trim()) return null;

  const { meta, link, scripts } = parseHeadHtml(html);

  return (
    <>
      {meta.map((attrs, index) => (
        <meta key={`cms-meta-${index}-${attrs.name || attrs.property || attrs.httpEquiv || index}`} {...attrs} />
      ))}
      {link.map((attrs, index) => (
        <link key={`cms-link-${index}-${attrs.href || index}`} {...attrs} />
      ))}
      <ScriptInjector html={scripts} placement="header" />
    </>
  );
}
