'use client';

import { useEffect } from 'react';

interface ScriptInjectorProps {
  html: string;
  placement: 'header' | 'footer';
}

/** Executes trusted CMS script tags. Scripts in innerHTML do not run — append them explicitly. */
export default function ScriptInjector({ html, placement }: ScriptInjectorProps) {
  useEffect(() => {
    if (!html?.trim()) return;

    const mount = placement === 'header' ? document.head : document.body;
    const template = document.createElement('template');
    template.innerHTML = html.trim();

    template.content.querySelectorAll('script').forEach((oldScript) => {
      const script = document.createElement('script');
      for (const attr of oldScript.attributes) {
        script.setAttribute(attr.name, attr.value);
      }
      script.text = oldScript.textContent || '';
      mount.appendChild(script);
    });
  }, [html, placement]);

  if (!html?.trim()) return null;
  return null;
}
