'use client';

import { useEffect, useMemo, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import FieldHint from '@/components/ui/FieldHint';
import Icon from '@/components/ui/AppIcon';
import {
  EMAIL_HINT,
  NAME_HINT,
  PASSWORD_CHECKS,
  PASSWORD_HINT,
  PHONE_HINT,
  enterPlaceholder,
  emailError,
  nameError,
  passwordError,
  selectPlaceholder,
} from '@/lib/forms/rules';
import { PHONE_COUNTRIES, countryByIso, parsePhone, phoneError, phoneHref, phoneLengthHint, formatPhone } from '@/lib/forms/phone-countries';

const control = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:bg-slate-50';

export function FieldLabel({
  label,
  required,
  hint,
}: {
  label: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <span className="mb-1.5 inline-flex items-center text-sm font-medium text-slate-700">
      {label}
      {required ? <span className="ml-0.5 text-rose-500">*</span> : null}
      {hint ? <FieldHint text={hint} /> : null}
    </span>
  );
}

export function FieldShell({
  label,
  required,
  hint,
  error,
  children,
  className = '',
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <FieldLabel label={label} required={required} hint={hint} />
      {children}
      {error ? <span className="mt-1 block text-xs text-rose-600">{error}</span> : null}
    </label>
  );
}

type TextProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'placeholder'> & {
  label: string;
  hint?: string;
  error?: string;
  placeholder?: string;
};

export function TextField({ label, hint, error, required, className = '', placeholder, ...props }: TextProps) {
  return (
    <FieldShell label={label} required={required} hint={hint} error={error}>
      <input className={`${control} ${className}`} placeholder={placeholder || enterPlaceholder(label)} required={required} {...props} />
    </FieldShell>
  );
}

export function TextAreaField({
  label,
  hint,
  error,
  required,
  className = '',
  placeholder,
  ...props
}: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'placeholder'> & { label: string; hint?: string; error?: string; placeholder?: string }) {
  return (
    <FieldShell label={label} required={required} hint={hint} error={error}>
      <textarea className={`${control} min-h-[6.5rem] resize-none ${className}`} placeholder={placeholder || enterPlaceholder(label)} required={required} {...props} />
    </FieldShell>
  );
}

export function SelectField({
  label,
  hint,
  error,
  required,
  className = '',
  placeholder,
  children,
  ...props
}: Omit<SelectHTMLAttributes<HTMLSelectElement>, 'placeholder'> & { label: string; hint?: string; error?: string; placeholder?: string }) {
  return (
    <FieldShell label={label} required={required} hint={hint} error={error}>
      <select className={`${control} ${className}`} required={required} {...props}>
        <option value="">{placeholder || selectPlaceholder(label)}</option>
        {children}
      </select>
    </FieldShell>
  );
}

export function NameField({
  label = 'Name',
  value,
  onValue,
  required = true,
  showError = false,
  ...props
}: Omit<TextProps, 'value' | 'onChange' | 'type'> & { value: string; onValue: (value: string) => void; showError?: boolean }) {
  const error = showError ? nameError(value, label) : '';
  return (
    <TextField
      label={label}
      required={required}
      hint={NAME_HINT}
      error={error}
      value={value}
      onChange={(event) => onValue(event.target.value)}
      autoComplete="name"
      {...props}
    />
  );
}

export function EmailField({
  label = 'Email',
  value,
  onValue,
  required = true,
  showError = false,
  ...props
}: Omit<TextProps, 'value' | 'onChange' | 'type'> & { value: string; onValue: (value: string) => void; showError?: boolean }) {
  const error = showError ? emailError(value) : '';
  return (
    <TextField
      label={label}
      type="email"
      required={required}
      hint={EMAIL_HINT}
      error={error}
      value={value}
      onChange={(event) => onValue(event.target.value)}
      autoComplete="email"
      {...props}
    />
  );
}

export function PasswordField({
  label = 'Password',
  value,
  onValue,
  required = true,
  showError = false,
  showRules = false,
  autoComplete = 'new-password',
}: {
  label?: string;
  value: string;
  onValue: (value: string) => void;
  required?: boolean;
  showError?: boolean;
  showRules?: boolean;
  autoComplete?: string;
}) {
  const [visible, setVisible] = useState(false);
  const error = showError ? passwordError(value, required) : '';
  return (
    <FieldShell label={label} required={required} hint={PASSWORD_HINT} error={error}>
      <span className="relative block">
        <input
          className={`${control} pr-14`}
          type={visible ? 'text' : 'password'}
          value={value}
          placeholder={enterPlaceholder(label)}
          autoComplete={autoComplete}
          required={required}
          onChange={(event) => onValue(event.target.value)}
        />
        <button
          type="button"
          className="absolute inset-y-0 right-3 text-xs font-semibold text-slate-400 hover:text-slate-700"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </span>
      {showRules ? (
        <ul className="mt-2 space-y-1">
          {PASSWORD_CHECKS.map((item) => {
            const ok = item.test(value);
            return (
              <li key={item.id} className={`flex items-center gap-1.5 text-xs ${ok ? 'text-emerald-600' : 'text-slate-400'}`}>
                <Icon name={ok ? 'CheckCircleIcon' : 'XCircleIcon'} size={14} />
                {item.label}
              </li>
            );
          })}
        </ul>
      ) : null}
    </FieldShell>
  );
}

export function PhoneField({
  label = 'Phone',
  value,
  onValue,
  onHref,
  required = false,
  showError = false,
}: {
  label?: string;
  value: string;
  onValue: (value: string) => void;
  onHref?: (value: string) => void;
  required?: boolean;
  showError?: boolean;
}) {
  const parsed = useMemo(() => parsePhone(value), [value]);
  const [iso, setIso] = useState(parsed.iso);
  const [national, setNational] = useState(parsed.national);
  useEffect(() => {
    setIso(parsed.iso);
    setNational(parsed.national);
  }, [parsed.iso, parsed.national]);
  const country = countryByIso(iso);
  const error = showError ? phoneError(iso, national, required) : '';
  const hint = `${PHONE_HINT} ${phoneLengthHint(iso)}`;

  const emit = (nextIso: string, nextNational: string) => {
    setIso(nextIso);
    setNational(nextNational);
    onValue(formatPhone(nextIso, nextNational));
    onHref?.(phoneHref(nextIso, nextNational));
  };

  return (
    <FieldShell label={label} required={required} hint={hint} error={error}>
      <span className="flex gap-2">
        <select
          className={`${control} w-[9.5rem] shrink-0`}
          value={iso}
          aria-label="Select country"
          onChange={(event) => emit(event.target.value, national)}
        >
          {PHONE_COUNTRIES.map((item) => (
            <option key={item.iso} value={item.iso}>
              {item.iso} +{item.dial}
            </option>
          ))}
        </select>
        <input
          className={control}
          inputMode="numeric"
          value={national}
          placeholder={`Enter ${country.lengths.join(' or ')}-digit number`}
          onChange={(event) => emit(iso, event.target.value.replace(/\D/g, ''))}
        />
      </span>
    </FieldShell>
  );
}

export { control as formControlClass };
