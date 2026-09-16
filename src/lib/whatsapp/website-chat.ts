'use client';

const STORAGE_KEY = 'techantum.whatsapp.opened';

export function websiteVisitorHasChatted(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function markWebsiteWhatsAppOpened() {
  try {
    window.localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    /* ignore private mode */
  }
}

export function resolveWebsiteWhatsAppMessage(firstTimeMessage: string): string {
  if (websiteVisitorHasChatted()) return '';
  return firstTimeMessage;
}

export function buildWhatsAppMeUrl(phone: string, text?: string | null): string {
  const digits = String(phone || '').replace(/\D/g, '');
  const base = `https://wa.me/${digits}`;
  if (!text?.trim()) return base;
  return `${base}?text=${encodeURIComponent(text.trim())}`;
}
