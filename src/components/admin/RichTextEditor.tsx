'use client';

import TiptapLink from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  compact?: boolean;
}

function ToolbarButton({
  label,
  active,
  compact,
  onClick,
}: {
  label: string;
  active?: boolean;
  compact?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${compact ? 'px-1.5 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'} rounded border transition-colors ${
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-white text-foreground border-border hover:bg-muted'
      }`}
    >
      {label}
    </button>
  );
}

function toEditorHtml(value: string): string {
  if (!value) return '';
  if (/<[^>]+>/.test(value)) return value;
  return `<p>${value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`;
}

export default function RichTextEditor({ value, onChange, placeholder, compact }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TiptapLink.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder: placeholder || 'Write here…' }),
    ],
    content: toEditorHtml(value),
    immediatelyRender: false,
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      onChange(html === '<p></p>' ? '' : html);
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm max-w-none ${compact ? 'min-h-[72px] px-2 py-1.5' : 'min-h-[120px] px-3 py-2'} focus:outline-none`,
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const next = toEditorHtml(value);
    const current = editor.getHTML();
    if (next !== current && value !== (current === '<p></p>' ? '' : current)) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) {
    return (
      <div className={`cms-rich-text rounded-lg border border-border bg-white ${compact ? 'min-h-[96px]' : 'min-h-[160px]'} px-3 py-2 text-sm text-muted-foreground`}>
        Loading editor…
      </div>
    );
  }

  const setLink = () => {
    const previous = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Link URL', previous || 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className="cms-rich-text rounded-lg border border-border bg-white overflow-hidden">
      <div className={`flex flex-wrap gap-1 border-b border-border bg-muted/30 ${compact ? 'p-1' : 'p-2'}`}>
        <ToolbarButton
          label="B"
          compact={compact}
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          label="I"
          compact={compact}
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <ToolbarButton
          label="H2"
          compact={compact}
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        />
        <ToolbarButton
          label="H3"
          compact={compact}
          active={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        />
        <ToolbarButton
          label="• List"
          compact={compact}
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <ToolbarButton
          label="1. List"
          compact={compact}
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
        <ToolbarButton label="Link" compact={compact} active={editor.isActive('link')} onClick={setLink} />
        <ToolbarButton
          label="Clear"
          compact={compact}
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
        />
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
