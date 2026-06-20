// CSRF protection utilities
import { cookies } from 'next/headers';

const CSRF_TOKEN_NAME = 'csrf_token';
const CSRF_TOKEN_LENGTH = 32;

// Generate a random CSRF token
export function generateCSRFToken(): string {
  const array = new Uint8Array(CSRF_TOKEN_LENGTH);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Set CSRF token in cookie (server-side)
export async function setCSRFToken(): Promise<string> {
  const token = generateCSRFToken();
  const cookieStore = await cookies();
  
  cookieStore.set(CSRF_TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  });
  
  return token;
}

// Get CSRF token from cookie (server-side)
export async function getCSRFToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(CSRF_TOKEN_NAME)?.value;
}

// Validate CSRF token
export async function validateCSRFToken(token: string): Promise<boolean> {
  const storedToken = await getCSRFToken();
  return storedToken === token && token.length === CSRF_TOKEN_LENGTH * 2;
}

// Client-side: Get CSRF token from cookie
export function getClientCSRFToken(): string | null {
  if (typeof document === 'undefined') return null;
  
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === CSRF_TOKEN_NAME) {
      return value;
    }
  }
  return null;
}