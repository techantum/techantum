interface CustomScriptsProps {
  html: string;
  placement: 'header' | 'footer';
}

/** Renders admin-configured script tags. Only use trusted CMS content. */
export default function CustomScripts({ html, placement }: CustomScriptsProps) {
  if (!html?.trim()) return null;

  return (
    <div
      data-custom-scripts={placement}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
