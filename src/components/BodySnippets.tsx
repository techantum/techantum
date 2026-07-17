import ScriptInjector from '@/components/ScriptInjector';
import { parseHeadHtml } from '@/lib/seo/parse-head-html';

interface BodySnippetsProps {
  html: string;
}

/** SSR noscript/body HTML and execute footer scripts from CMS snippets. */
export default function BodySnippets({ html }: BodySnippetsProps) {
  if (!html?.trim()) return null;

  const { scripts, bodyHtml } = parseHeadHtml(html);

  return (
    <>
      {bodyHtml ? (
        <div
          data-body-snippets=""
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      ) : null}
      <ScriptInjector html={scripts} placement="footer" />
    </>
  );
}
