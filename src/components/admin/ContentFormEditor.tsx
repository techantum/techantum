'use client';

import RichTextEditor from '@/components/admin/RichTextEditor';
import MediaUploadField from '@/components/admin/MediaUploadField';
import {
  getContentSchema,
  type ArrayFieldSchema,
  type FieldSchema,
} from '@/lib/cms/content-schemas';

interface ContentFormEditorProps {
  entryKey: string;
  content: Record<string, unknown>;
  onChange: (content: Record<string, unknown>) => void;
}

function getFieldValue(obj: Record<string, unknown>, key: string, type: FieldSchema['type']): string {
  const raw = obj[key];
  if (raw === undefined || raw === null) return '';
  if (type === 'lines' && Array.isArray(raw)) return raw.map(String).join('\n');
  if (type === 'number') return String(raw);
  return String(raw);
}

function setFieldValue(
  obj: Record<string, unknown>,
  key: string,
  type: FieldSchema['type'],
  value: string
): Record<string, unknown> {
  const next = { ...obj };
  if (type === 'lines') {
    next[key] = value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  } else if (type === 'number') {
    next[key] = value === '' ? 0 : Number(value);
  } else {
    next[key] = value;
  }
  return next;
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FieldSchema;
  value: string;
  onChange: (value: string) => void;
}) {
  const inputClass = 'w-full rounded-lg border border-border px-3 py-2 text-sm';

  if (field.type === 'richtext') {
    return <RichTextEditor value={value} onChange={onChange} placeholder={field.placeholder} />;
  }

  if (field.type === 'image') {
    return (
      <MediaUploadField
        label=""
        value={value}
        onChange={onChange}
        mediaType="image"
        hint={field.placeholder || 'PNG, JPG, WebP, or SVG. Fits within placeholder — no overflow.'}
      />
    );
  }

  if (field.type === 'video') {
    return (
      <MediaUploadField
        label=""
        value={value}
        onChange={onChange}
        mediaType="video"
        hint={field.placeholder || 'MP4 or WebM, max 50 MB. Recommended: 1920×1080.'}
      />
    );
  }

  if (field.type === 'textarea' || field.type === 'lines') {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={field.type === 'lines' ? 4 : 3}
        placeholder={field.placeholder || (field.type === 'lines' ? 'One item per line' : undefined)}
        className={inputClass}
      />
    );
  }

  if (field.type === 'url') {
    return (
      <input
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder || 'https://'}
        className={inputClass}
      />
    );
  }

  return (
    <input
      type={field.type === 'number' ? 'number' : 'text'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
      className={inputClass}
    />
  );
}

function fieldSpanClass(field: FieldSchema): string {
  if (
    field.type === 'richtext' ||
    field.type === 'textarea' ||
    field.type === 'image' ||
    field.type === 'video' ||
    field.type === 'lines'
  ) {
    return 'md:col-span-2';
  }
  return '';
}

function ArrayEditor({
  schema,
  items,
  onChange,
}: {
  schema: ArrayFieldSchema;
  items: Record<string, unknown>[];
  onChange: (items: Record<string, unknown>[]) => void;
}) {
  const updateItem = (index: number, item: Record<string, unknown>) => {
    const next = [...items];
    next[index] = item;
    onChange(next);
  };

  const addItem = () => {
    const blank = schema.fields.reduce<Record<string, unknown>>((acc, f) => {
      acc[f.key] = f.type === 'number' ? 5 : '';
      return acc;
    }, {});
    onChange([...items, blank]);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{schema.label}</h3>
        <button
          type="button"
          onClick={addItem}
          className="text-sm text-primary hover:underline"
        >
          + Add {schema.itemLabel || 'item'}
        </button>
      </div>
      {items.map((item, index) => (
        <div key={index} className="rounded-lg border border-border p-4 space-y-3 bg-muted/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {schema.itemLabel || 'Item'} {index + 1}
            </span>
            <button
              type="button"
              onClick={() => removeItem(index)}
              className="text-xs text-red-600 hover:underline"
            >
              Remove
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {schema.fields.map((field) => (
              <div key={field.key} className={fieldSpanClass(field)}>
                <label className="block text-sm font-medium mb-1">{field.label}</label>
                <FieldInput
                  field={field}
                  value={getFieldValue(item, field.key, field.type)}
                  onChange={(v) => updateItem(index, setFieldValue(item, field.key, field.type, v))}
                />
              </div>
            ))}
          </div>
          {schema.subArrays?.map((sub) => {
            const subItems = Array.isArray(item[sub.key])
              ? (item[sub.key] as Record<string, unknown>[])
              : [];
            return (
              <div key={sub.key} className="mt-4 pl-3 border-l-2 border-border">
                <ArrayEditor
                  schema={sub}
                  items={subItems}
                  onChange={(next) => updateItem(index, { ...item, [sub.key]: next })}
                />
              </div>
            );
          })}
        </div>
      ))}
      {items.length === 0 && (
        <p className="text-sm text-muted-foreground">No items yet. Click add to create one.</p>
      )}
    </div>
  );
}

function StringListEditor({
  label,
  itemLabel,
  items,
  onChange,
}: {
  label: string;
  itemLabel?: string;
  items: string[];
  onChange: (items: string[]) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{label}</h3>
        <button
          type="button"
          onClick={() => onChange([...items, ''])}
          className="text-sm text-primary hover:underline"
        >
          + Add {itemLabel || 'item'}
        </button>
      </div>
      {items.map((item, index) => (
        <div key={index} className="flex gap-2">
          <input
            value={item}
            onChange={(e) => {
              const next = [...items];
              next[index] = e.target.value;
              onChange(next);
            }}
            className="flex-1 rounded-lg border border-border px-3 py-2 text-sm"
            placeholder={`${itemLabel || 'Item'} ${index + 1}`}
          />
          <button
            type="button"
            onClick={() => onChange(items.filter((_, i) => i !== index))}
            className="text-sm text-red-600 px-2 hover:underline shrink-0"
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}

export default function ContentFormEditor({ entryKey, content, onChange }: ContentFormEditorProps) {
  const schema = getContentSchema(entryKey);

  if (!schema || schema.useJsonEditor) {
    return null;
  }

  const updateField = (key: string, type: FieldSchema['type'], value: string) => {
    onChange(setFieldValue(content, key, type, value));
  };

  const updateArray = (key: string, items: Record<string, unknown>[]) => {
    onChange({ ...content, [key]: items });
  };

  const updateStringList = (key: string, items: string[]) => {
    onChange({ ...content, [key]: items });
  };

  return (
    <div className="space-y-8">
      {schema.fields && schema.fields.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {schema.fields.map((field) => (
            <div key={field.key} className={fieldSpanClass(field)}>
              <label className="block text-sm font-medium mb-1">{field.label}</label>
              <FieldInput
                field={field}
                value={getFieldValue(content, field.key, field.type)}
                onChange={(v) => updateField(field.key, field.type, v)}
              />
            </div>
          ))}
        </div>
      )}

      {schema.stringLists?.map((list) => {
        const raw = content[list.key];
        const items = Array.isArray(raw) ? raw.map(String) : [];
        return (
          <StringListEditor
            key={list.key}
            label={list.label}
            itemLabel={list.itemLabel}
            items={items}
            onChange={(next) => updateStringList(list.key, next)}
          />
        );
      })}

      {schema.arrays?.map((arraySchema) => {
        const raw = content[arraySchema.key];
        const items = Array.isArray(raw)
          ? (raw as Record<string, unknown>[])
          : [];
        return (
          <ArrayEditor
            key={arraySchema.key}
            schema={arraySchema}
            items={items}
            onChange={(next) => updateArray(arraySchema.key, next)}
          />
        );
      })}
    </div>
  );
}
