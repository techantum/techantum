'use client';

import type { PartnerQuestion } from '@/lib/partner/catalog';
import { getQuestionColSpan } from '@/lib/partner/wizard-config';

interface WizardFieldGridProps {
  questions: PartnerQuestion[];
  answers: Record<string, unknown>;
  errors: Record<string, string>;
  onChange: (key: string, value: unknown) => void;
}

const colSpanClass: Record<number, string> = {
  1: 'col-span-1',
  2: 'col-span-1 md:col-span-2',
  3: 'col-span-1 md:col-span-2 lg:col-span-3',
};

export default function WizardFieldGrid({
  questions,
  answers,
  errors,
  onChange,
}: WizardFieldGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4">
      {questions.map((q) => (
        <div
          key={q.question_key}
          className={colSpanClass[getQuestionColSpan(q)] ?? colSpanClass[1]}
        >
          <WizardField question={q} value={answers[q.question_key]} error={errors[q.question_key]} onChange={onChange} />
        </div>
      ))}
    </div>
  );
}

function WizardField({
  question: q,
  value,
  error,
  onChange,
}: {
  question: PartnerQuestion;
  value: unknown;
  error?: string;
  onChange: (key: string, value: unknown) => void;
}) {
  const baseClass =
    'w-full px-3 py-2.5 rounded-lg border text-sm transition-colors focus:ring-2 focus:ring-indigo-500 focus:border-transparent';
  const inputClass = `${baseClass} ${error ? 'border-red-300 bg-red-50/30' : 'border-slate-200'}`;

  const isYesNo =
    q.question_type === 'radio' &&
    q.options.length === 2 &&
    q.options.includes('Yes') &&
    q.options.includes('No');

  const isPriority = q.question_key === 'priority';

  const renderControl = () => {
    if (isPriority || (q.question_type === 'radio' && !isYesNo && q.options.length <= 5)) {
      return (
        <div className="flex flex-wrap gap-2">
          {q.options.map((opt) => {
            const selected = value === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onChange(q.question_key, opt)}
                className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                  selected
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      );
    }

    if (isYesNo) {
      return (
        <div className="flex gap-2">
          {['Yes', 'No'].map((opt) => {
            const selected = value === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onChange(q.question_key, opt)}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  selected
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      );
    }

    switch (q.question_type) {
      case 'textarea':
        return (
          <textarea
            value={(value as string) ?? ''}
            onChange={(e) => onChange(q.question_key, e.target.value)}
            placeholder={q.placeholder ?? ''}
            rows={3}
            className={inputClass}
          />
        );
      case 'dropdown':
        return (
          <select
            value={(value as string) ?? ''}
            onChange={(e) => onChange(q.question_key, e.target.value)}
            className={inputClass}
          >
            <option value="">{q.placeholder || 'Select…'}</option>
            {q.options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );
      case 'multi_select':
        return (
          <div className="flex flex-wrap gap-2">
            {q.options.map((opt) => {
              const selected = Array.isArray(value) && value.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    const current = Array.isArray(value) ? value : [];
                    onChange(
                      q.question_key,
                      selected ? current.filter((v) => v !== opt) : [...current, opt]
                    );
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    selected
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        );
      case 'number':
        return (
          <input
            type="number"
            min={0}
            value={value === undefined || value === null ? '' : String(value)}
            onChange={(e) => onChange(q.question_key, e.target.value)}
            placeholder={q.placeholder ?? ''}
            className={inputClass}
          />
        );
      case 'date':
        return (
          <input
            type="date"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(q.question_key, e.target.value)}
            className={inputClass}
          />
        );
      default:
        return (
          <input
            type="text"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(q.question_key, e.target.value)}
            placeholder={q.placeholder ?? ''}
            className={inputClass}
          />
        );
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {q.label}
        {q.is_required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {q.help_text && <p className="text-xs text-slate-500 mb-1.5 leading-relaxed">{q.help_text}</p>}
      {renderControl()}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
