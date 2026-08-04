'use client';

import RichTextEditor from '@/components/admin/RichTextEditor';
import Icon from '@/components/ui/AppIcon';
import {
  BTN_SECONDARY,
  INPUT_CLASS,
  REPEATABLE_BLOCKS,
  type RepeatableFieldDef,
} from '@/lib/client-requirements/form-schemas';

interface RepeatableBlockProps {
  blockType: 'services' | 'projects' | 'testimonials';
  label: string;
  rows: Record<string, string>[];
  disabled?: boolean;
  onChange: (rows: Record<string, string>[]) => void;
}

function emptyRow(fields: RepeatableFieldDef[]) {
  return Object.fromEntries(fields.map((field) => [field.key, '']));
}

function SubField({
  field,
  value,
  disabled,
  onChange,
}: {
  field: RepeatableFieldDef;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  if (field.type === 'richtext') {
    return (
      <RichTextEditor
        value={value}
        onChange={onChange}
        placeholder={field.placeholder || field.label}
      />
    );
  }
  if (field.type === 'textarea') {
    return (
      <textarea
        value={value}
        disabled={disabled}
        rows={field.rows ?? 3}
        placeholder={field.placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={INPUT_CLASS}
      />
    );
  }
  return (
    <input
      type={field.type === 'url' ? 'url' : field.type === 'number' ? 'number' : 'text'}
      value={value}
      disabled={disabled}
      placeholder={field.placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={INPUT_CLASS}
    />
  );
}

export default function RepeatableBlock({ blockType, label, rows, disabled, onChange }: RepeatableBlockProps) {
  const schema = REPEATABLE_BLOCKS[blockType];

  return (
    <div className="space-y-4">
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="font-inter text-sm font-semibold text-foreground">
              {label} {rowIndex + 1}
            </p>
            {!disabled && (
              <button
                type="button"
                onClick={() => onChange(rows.filter((_, i) => i !== rowIndex))}
                className="inline-flex items-center gap-1 text-xs font-medium text-destructive hover:underline"
              >
                <Icon name="TrashIcon" size={14} />
                Remove
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {schema.fields.map((field) => (
              <label
                key={field.key}
                className={field.type === 'richtext' || field.type === 'textarea' ? 'md:col-span-2 block' : 'block'}
              >
                <span className="block font-inter text-xs font-medium text-muted-foreground mb-1.5">{field.label}</span>
                <SubField
                  field={field}
                  value={row[field.key] ?? ''}
                  disabled={disabled}
                  onChange={(next) => {
                    const updated = rows.map((item, i) => (i === rowIndex ? { ...item, [field.key]: next } : item));
                    onChange(updated);
                  }}
                />
              </label>
            ))}
          </div>
        </div>
      ))}
      {!disabled && (
        <button
          type="button"
          onClick={() => onChange([...rows, emptyRow(schema.fields)])}
          className={BTN_SECONDARY}
        >
          <Icon name="PlusIcon" size={16} />
          {schema.addLabel}
        </button>
      )}
    </div>
  );
}
