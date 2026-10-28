export const NAME_HINT = 'Use letters, spaces, hyphens or apostrophes only. Numbers and other symbols are not allowed.';
export const EMAIL_HINT = 'Use a valid email such as name@company.com.';
export const PASSWORD_HINT = 'At least 8 characters, with one uppercase letter, one lowercase letter, one number, and one symbol.';
export const PHONE_HINT = 'Select a country, then enter the local number with the digit count shown for that country.';
export const URL_HINT = 'Use a full URL starting with https://.';

export function enterPlaceholder(label: string) {
  const text = label.replace(/\s+/g, ' ').trim();
  if (!text) return 'Enter value';
  return `Enter ${text.charAt(0).toLowerCase()}${text.slice(1)}`;
}

export function selectPlaceholder(label: string) {
  const text = label.replace(/\s+/g, ' ').trim();
  if (!text) return 'Select option';
  return `Select ${text.charAt(0).toLowerCase()}${text.slice(1)}`;
}

export function requiredMessage(label: string) {
  return `Enter ${label.charAt(0).toLowerCase()}${label.slice(1)}.`;
}

export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

export function isPersonName(value: string) {
  const text = value.trim();
  if (text.length < 2) return false;
  return /^[A-Za-z][A-Za-z .'-]*$/.test(text) && !/\d/.test(text) && !/[!@#$%^&*_+=[\]{};:"\\|,<>/?]/.test(text);
}

export function isHttpUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export const PASSWORD_CHECKS = [
  { id: 'length', label: 'At least 8 characters', test: (value: string) => value.length >= 8 },
  { id: 'upper', label: 'One uppercase letter', test: (value: string) => /[A-Z]/.test(value) },
  { id: 'lower', label: 'One lowercase letter', test: (value: string) => /[a-z]/.test(value) },
  { id: 'number', label: 'One number', test: (value: string) => /\d/.test(value) },
  { id: 'symbol', label: 'One symbol', test: (value: string) => /[^A-Za-z0-9]/.test(value) },
] as const;

export function passwordIssues(value: string) {
  return PASSWORD_CHECKS.filter((item) => !item.test(value)).map((item) => item.label);
}

export function isStrongPassword(value: string) {
  return passwordIssues(value).length === 0;
}

export function nameError(value: string, label = 'name') {
  const text = value.trim();
  if (!text) return requiredMessage(label);
  if (!isPersonName(text)) return NAME_HINT;
  return '';
}

export function emailError(value: string) {
  const text = value.trim();
  if (!text) return requiredMessage('email');
  if (!isEmail(text)) return EMAIL_HINT;
  return '';
}

export function passwordError(value: string, required = true) {
  if (!value) return required ? requiredMessage('password') : '';
  const issues = passwordIssues(value);
  return issues.length ? `Password needs: ${issues.join(', ').toLowerCase()}.` : '';
}

export function urlError(value: string, required = false) {
  const text = value.trim();
  if (!text) return required ? requiredMessage('URL') : '';
  if (!isHttpUrl(text)) return URL_HINT;
  return '';
}
