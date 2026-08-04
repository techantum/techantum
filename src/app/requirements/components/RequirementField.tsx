'use client';

import RichTextEditor from '@/components/admin/RichTextEditor';
import FileUploadZone from '@/app/requirements/components/FileUploadZone';
import RepeatableBlock from '@/app/requirements/components/RepeatableBlock';
import type { RequirementAttachment, RequirementQuestion } from '@/lib/client-requirements/types';
import { HELP_CLASS, INPUT_CLASS, LABEL_CLASS } from '@/lib/client-requirements/form-schemas';

function valueToString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

interface RequirementFieldProps {
  question: RequirementQuestion;
  sectionSlug: string;
  value: unknown;
  disabled?: boolean;
  attachments: RequirementAttachment[];
  onChange: (value: unknown) => void;
  onUpload: (file: File, fieldKey: string) => void;
}

export default function RequirementField({
  question,
  sectionSlug,
  value,
  disabled,
  attachments,
  onChange,
  onUpload,
}: RequirementFieldProps) {
  const fieldAttachments = attachments.filter(
    (file) => file.section_slug === sectionSlug && file.field_key === question.question_key
  );

  const label = (
    <label className={LABEL_CLASS}>
      {question.label}
      {question.is_required ? ' *' : ''}
    </label>
  );

  const help = question.help_text ? <p className={HELP_CLASS}>{question.help_text}</p> : null;

  if (question.field_type === 'services' || question.field_type === 'projects' || question.field_type === 'testimonials') {
    const rows = Array.isArray(value) ? (value as Record<string, string>[]) : [];
    return (
      <div>
        {label}
        {help}
        <RepeatableBlock
          blockType={question.field_type}
          label={question.label}
          rows={rows}
          disabled={disabled}
          onChange={onChange}
        />
      </div>
    );
  }

  if (question.field_type === 'multiselect') {
    const selected = Array.isArray(value) ? (value as string[]) : [];
    return (
      <div>
        {label}
        {help}
        <div className="flex flex-wrap gap-2">
          {(question.options ?? []).map((option) => {
            const active = selected.includes(option);
            return (
              <button
                key={option}
                type="button"
                disabled={disabled}
                onClick={() =>
                  onChange(active ? selected.filter((item) => item !== option) : [...selected, option])
                }
                className={`rounded-full border px-2.5 py-1 font-inter text-xs transition-all ${
                  active
                    ? 'border-primary bg-primary/10 text-primary font-medium'
                    : 'border-border bg-card text-foreground hover:border-primary/30'
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (question.field_type === 'select') {
    return (
      <div>
        {label}
        {help}
        <select
          value={valueToString(value)}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={INPUT_CLASS}
        >
          <option value="">Select an option</option>
          {(question.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (question.field_type === 'richtext') {
    return (
      <div>
        {label}
        {help}
        <RichTextEditor
          value={valueToString(value)}
          onChange={onChange}
          placeholder={question.help_text || question.label}
          compact
        />
      </div>
    );
  }

  if (question.field_type === 'textarea') {
    return (
      <div>
        {label}
        {help}
        <textarea
          value={valueToString(value)}
          disabled={disabled}
          rows={3}
          onChange={(e) => onChange(e.target.value)}
          className={INPUT_CLASS}
          placeholder={question.help_text || undefined}
        />
      </div>
    );
  }

  if (question.field_type === 'image') {
    return (
      <div>
        <FileUploadZone
          label={question.label}
          helpText={question.help_text || 'PNG, JPG, WEBP or SVG up to 100 MB'}
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          hint="Upload images"
          icon="PhotoIcon"
          disabled={disabled}
          files={fieldAttachments}
          onUpload={(file) => onUpload(file, question.question_key)}
        />
      </div>
    );
  }

  if (question.field_type === 'pdf') {
    return (
      <div>
        <FileUploadZone
          label={question.label}
          helpText={question.help_text || 'PDF documents up to 100 MB'}
          accept="application/pdf"
          hint="Upload PDF files"
          icon="DocumentTextIcon"
          disabled={disabled}
          files={fieldAttachments}
          onUpload={(file) => onUpload(file, question.question_key)}
        />
      </div>
    );
  }

  if (question.field_type === 'file') {
    return (
      <div>
        <FileUploadZone
          label={question.label}
          helpText={question.help_text || 'Images, PDFs, Office docs, or ZIP up to 100 MB'}
          accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip"
          hint="Upload files"
          icon="CloudArrowUpIcon"
          disabled={disabled}
          files={fieldAttachments}
          onUpload={(file) => onUpload(file, question.question_key)}
        />
      </div>
    );
  }

  return (
    <div>
      {label}
      {help}
      <input
        type={question.field_type === 'url' ? 'url' : 'text'}
        value={valueToString(value)}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={INPUT_CLASS}
        placeholder={question.help_text || undefined}
      />
    </div>
  );
}
