interface CmsRichTextProps {
  html: string;
  className?: string;
  as?: 'div' | 'p' | 'span';
  /** Use on dark or brand gradient backgrounds so prose content renders in white */
  invert?: boolean;
}

function isEmptyRichText(value: string): boolean {
  const trimmed = value.trim();
  return !trimmed || trimmed === '<p></p>' || trimmed === '<p><br></p>' || trimmed === '<p><br/></p>';
}

/** Renders CMS rich text (HTML from editor) or plain text. */
export default function CmsRichText({
  html,
  className = '',
  as: Tag = 'div',
  invert = false,
}: CmsRichTextProps) {
  const value = (html || '').trim();

  if (isEmptyRichText(value)) {
    return null;
  }

  const isHtml = /<[^>]+>/.test(value);
  const invertClass = invert
    ? 'cms-rich-text-invert prose-invert text-white [&_p]:text-white [&_a]:text-white [&_strong]:text-white [&_li]:text-white'
    : '';

  if (!isHtml) {
    return <Tag className={`${invertClass} ${className}`.trim()}>{value}</Tag>;
  }

  // HTML from Tiptap includes <p> tags — never wrap in <p> (invalid nesting → hydration errors)
  return (
    <div
      className={`cms-rich-text prose prose-sm max-w-none ${invertClass} ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: value }}
    />
  );
}
