const FALLBACK = '/portal/wa';

export function safeNextPath(value: string | null | undefined, fallback = FALLBACK) {
  if (!value) return fallback;
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return fallback;
  }
  if (!decoded.startsWith('/') || decoded.startsWith('//') || decoded.includes('\\') || /[a-z]+:/i.test(decoded)) {
    return fallback;
  }
  if (decoded.startsWith('/admin') || decoded.startsWith('/partner') || decoded.startsWith('/api') || decoded.startsWith('/auth')) {
    return fallback;
  }
  return decoded;
}
